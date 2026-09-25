<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
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
                ['all', 'active', 'inactive'],
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

        if ($status !== 'all') {
            $query->where('is_active', $status === 'active');
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
}
