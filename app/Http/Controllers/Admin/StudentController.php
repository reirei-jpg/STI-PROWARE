<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\StudentSchoolEmailGenerator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function __construct(
        private readonly StudentSchoolEmailGenerator $emailGenerator,
    ) {}

    /**
     * Display every registered student account.
     *
     * This is the admin's view into self-registered accounts — since
     * registration has no Microsoft 365 / school-roster verification
     * yet, this is where an admin can actually see who has registered
     * and deactivate an account if something looks wrong.
     */
    public function index(
        Request $request,
    ): Response {
        $admin = $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        $search = trim(
            (string) $request->query('search', ''),
        );

        $status = (string) $request->query('status', 'all');

        if (
            ! in_array(
                $status,
                ['all', 'active', 'inactive', 'registered_today'],
                true,
            )
        ) {
            $status = 'all';
        }

        $query = User::query()
            ->where('role', User::ROLE_STUDENT)
            ->with('student');

        if ($search !== '') {
            $query->where(
                function (Builder $query) use ($search): void {
                    $query
                        ->where('name', 'ilike', "%{$search}%")
                        ->orWhere('email', 'ilike', "%{$search}%")
                        ->orWhereHas(
                            'student',
                            function (Builder $studentQuery) use ($search): void {
                                $studentQuery->where(
                                    'student_id',
                                    'ilike',
                                    "%{$search}%",
                                );
                            },
                        );
                },
            );
        }

        if ($status === 'active' || $status === 'inactive') {
            $query->where('is_active', $status === 'active');
        } elseif ($status === 'registered_today') {
            $query->whereDate('created_at', today());
        }

        $students = $query
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (User $user): array => [
                'id' => $user->id,

                'name' => $user->name,

                'email' => $user->email,

                'is_active' => (bool) $user->is_active,

                'student_id' => $user->student?->student_id,

                'course' => $user->student?->course,

                'year_level' => $user->student?->year_level,

                'status' => $user->student?->status,

                'registered_at' => $user->created_at
                    ?->timezone(config('app.display_timezone'))
                    ->format('M d, Y h:i A'),
            ]);

        $summary = [
            'total' => User::query()
                ->where('role', User::ROLE_STUDENT)
                ->count(),

            'active' => User::query()
                ->where('role', User::ROLE_STUDENT)
                ->where('is_active', true)
                ->count(),

            'inactive' => User::query()
                ->where('role', User::ROLE_STUDENT)
                ->where('is_active', false)
                ->count(),

            'registered_today' => User::query()
                ->where('role', User::ROLE_STUDENT)
                ->whereDate('created_at', today())
                ->count(),
        ];

        return Inertia::render(
            'admin/Students/Index',
            [
                'students' => $students,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'status' => $status,
                ],
            ],
        );
    }

    /**
     * Display the admin-side student account creation form.
     *
     * A separate path from self-registration at /register: this one
     * lets an admin create an account directly (e.g. for a student who
     * can't register themselves), reusing the same manual,
     * self-attested field set and the same generated-email rule.
     */
    public function create(
        Request $request,
    ): Response {
        $admin = $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        return Inertia::render(
            'admin/Students/Create',
        );
    }

    /**
     * Create a student account directly, as the admin.
     */
    public function store(
        Request $request,
    ): RedirectResponse {
        $admin = $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        $validated = $request->validate(
            [
                'student_id' => [
                    'required',
                    'string',
                    'size:11',
                    'regex:/^[0-9]{11}$/',
                    Rule::unique('students', 'student_id'),
                ],

                'full_name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'last_name' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'course' => [
                    'required',
                    'string',
                    'max:100',
                ],

                'year_level' => [
                    'required',
                    'string',
                    'max:20',
                ],

                'password' => [
                    'required',
                    'string',
                    Password::defaults(),
                    'confirmed',
                ],
            ],
            [
                'student_id.size' => 'The Student ID must contain exactly 11 digits.',

                'student_id.regex' => 'The Student ID must contain numbers only.',

                'student_id.unique' => 'This Student ID has already been registered.',

                'password.min' => 'The password must be at least 8 characters.',

                'password.letters' => 'The password must include at least one letter.',

                'password.numbers' => 'The password must include at least one number.',

                'password.symbols' => 'The password must include at least one special character (e.g. ! @ # $).',

                'password.confirmed' => 'The password confirmation does not match.',
            ],
        );

        $studentId = trim(
            $validated['student_id'],
        );

        $lastName = $this->emailGenerator->normalizeLastName(
            $validated['last_name'],
        );

        $email = $this->emailGenerator->generate(
            $studentId,
            $lastName,
        );

        /*
         * The generated email could, in principle, already be taken —
         * e.g. two different students who both normalize to the same
         * last name and happen to share the same last six digits of
         * their Student ID. Extremely unlikely, but validated instead
         * of assumed.
         */
        if (User::query()->where('email', $email)->exists()) {
            return back()
                ->withErrors([
                    'student_id' => 'An account already exists with the generated email for this Student ID and last name.',
                ])
                ->withInput();
        }

        $createdUser = DB::transaction(
            function () use ($validated, $email, $studentId): User {
                $user = User::create([
                    'name' => trim(
                        $validated['full_name'],
                    ),

                    'email' => $email,

                    'password' => Hash::make(
                        $validated['password'],
                    ),

                    'role' => User::ROLE_STUDENT,

                    'is_active' => true,

                    /*
                     * Matches how admin-created staff accounts work:
                     * the admin sets a temporary password, and the
                     * student must replace it on first login.
                     */
                    'must_change_password' => true,
                ]);

                $user->student()->create([
                    'student_id' => $studentId,

                    'course' => trim(
                        $validated['course'],
                    ),

                    'year_level' => trim(
                        $validated['year_level'],
                    ),

                    'status' => 'active',
                ]);

                return $user;
            },
        );

        AuditLogger::log(
            request: $request,

            action: 'created',

            module: 'users',

            description: "Created student account for {$createdUser->name}.",

            subject: $createdUser,

            newValues: [
                'name' => $createdUser->name,

                'email' => $createdUser->email,

                'student_id' => $studentId,

                'is_active' => true,

                'must_change_password' => true,
            ],
        );

        return redirect()
            ->route('admin.students.index')
            ->with(
                'success',
                "Student account for {$createdUser->name} was created successfully.",
            );
    }
}
