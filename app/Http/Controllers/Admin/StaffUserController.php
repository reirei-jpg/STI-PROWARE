<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Position;
use App\Models\Staff;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\StaffSchoolEmailGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class StaffUserController extends Controller
{
    public function __construct(
        private readonly StaffSchoolEmailGenerator $emailGenerator,
    ) {}

    /**
     * Show the staff account creation form.
     */
    public function create(
        Request $request,
    ): Response {
        $admin = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        |
        | Both Super Admin and Staff Admin may access
        | the staff creation page.
        |
        */

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Available Positions
        |--------------------------------------------------------------------------
        |
        | Only active standardized positions are provided.
        |
        | Regular Admin accounts cannot create Admin users,
        | so Admin positions are excluded for them as well.
        |
        */

        $allowedPositionRoles =
            $admin->isSuperAdmin()
                ? [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                    User::ROLE_ADMIN,
                ]
                : [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                ];

        $positions =
            Position::query()
                ->where('is_active', true)
                ->whereIn(
                    'role',
                    $allowedPositionRoles,
                )
                ->orderBy('role')
                ->orderBy('level')
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'role',
                    'level',
                    'is_supervisory',
                ])
                ->map(
                    fn (Position $position): array => [
                        'id' => $position->id,

                        'name' => $position->name,

                        'role' => $position->role,

                        'level' => $position->level,

                        'is_supervisory' => (bool)
                            $position->is_supervisory,
                    ],
                )
                ->values();

        $supervisors =
        Staff::query()
            ->with([
                'user:id,name,role,is_active',
                'positionRecord:id,name,role,level,is_supervisory,is_active',
            ])
            ->whereHas(
                'user',
                fn ($query) => $query->where(
                    'is_active',
                    true,
                ),
            )
            ->whereHas(
                'positionRecord',
                fn ($query) => $query
                    ->where(
                        'is_active',
                        true,
                    )
                    ->where(
                        'is_supervisory',
                        true,
                    ),
            )
            ->orderBy('employee_id')
            ->get()
            ->map(
                fn (Staff $staff): array => [
                    'id' => $staff->id,

                    'employee_id' => $staff->employee_id,

                    'name' => $staff->user?->name,

                    'role' => $staff->user?->role,

                    'position' => $staff->positionRecord?->name,

                    'position_id' => $staff->position_id,

                    'level' => $staff->positionRecord?->level,
                ],
            )
            ->values();

        return Inertia::render(
            'admin/Users/Create',
            [
                /*
                 * Only the Super Admin is allowed
                 * to create another Admin account.
                 */
                'canCreateAdmin' => $admin->isSuperAdmin(),

                'positions' => $positions,

                'supervisors' => $supervisors,

            ],
        );
    }

    /**
     * Create a new PROWARE staff account.
     */
    public function store(
        Request $request,
    ): RedirectResponse {
        $admin = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Allowed Roles
        |--------------------------------------------------------------------------
        |
        | Super Admin:
        | - Admin
        | - Specialist
        | - Cashier
        |
        | Staff Admin:
        | - Specialist
        | - Cashier
        |
        | Nobody can create another Super Admin through this form.
        |
        */

        $allowedRoles =
            $admin->isSuperAdmin()
                ? [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                    User::ROLE_ADMIN,
                ]
                : [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                ];

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate(
            [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'employee_id' => [
                    'required',
                    'string',
                    'max:50',

                    Rule::unique(
                        'staffs',
                        'employee_id',
                    ),
                ],

                'role' => [
                    'required',

                    Rule::in(
                        $allowedRoles,
                    ),
                ],

                'position_id' => [
                    'required',
                    'integer',

                    Rule::exists(
                        'positions',
                        'id',
                    )->where(
                        fn ($query) => $query->where(
                            'is_active',
                            true,
                        ),
                    ),
                ],
                'supervisor_id' => [
                    'nullable',
                    'integer',

                    Rule::exists(
                        'staffs',
                        'id',
                    ),
                ],
                'password' => [
                    'required',
                    'string',
                    'confirmed',

                    Password::defaults(),
                ],
            ],
            [
                'name.required' => 'The staff member name is required.',

                'employee_id.required' => 'The employee ID is required.',

                'employee_id.unique' => 'This employee ID is already assigned to another staff member.',

                'role.required' => 'Please select a PROWARE role.',

                'role.in' => $admin->isSuperAdmin()
                        ? 'The selected role is not allowed.'
                        : 'Staff Admin accounts may only create Cashier or Specialist accounts.',

                'position_id.required' => 'Please select a staff position.',

                'position_id.exists' => 'The selected staff position is invalid or inactive.',

                'password.required' => 'A temporary password is required.',

                'password.confirmed' => 'The password confirmation does not match.',
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Normalize Input
        |--------------------------------------------------------------------------
        */

        $name =
            trim(
                (string)
                $validated['name'],
            );

        $employeeId =
            trim(
                (string)
                $validated['employee_id'],
            );

        $email =
            $this->emailGenerator->generate(
                $name,
                $employeeId,
            );

        /*
         * The generated email could, in principle, already be taken —
         * e.g. two staff members whose full name and Employee ID both
         * normalize to the same value. Extremely unlikely, but
         * validated instead of assumed.
         */
        if (
            User::query()
                ->where('email', $email)
                ->exists()
        ) {
            return back()
                ->withErrors([
                    'employee_id' => 'An account already exists with the generated email for this name and Employee ID.',
                ])
                ->withInput();
        }

        $role =
            (string)
            $validated['role'];

        $position =
            Position::query()
                ->whereKey(
                    (int)
                    $validated['position_id'],
                )
                ->where(
                    'is_active',
                    true,
                )
                ->firstOrFail();

        /*
        * A position belongs to exactly one
        * PROWARE authorization role.
        *
        * Example:
        * Senior Cashier → cashier
        * Lead Specialist → specialist
        */
        abort_unless(
            $position->role === $role,
            422,
            'The selected position does not match the selected PROWARE role.',
        );

        $supervisor = null;

        if (! empty($validated['supervisor_id'])) {
            $supervisor =
                Staff::query()
                    ->with([
                        'user',
                        'positionRecord',
                    ])
                    ->findOrFail(
                        (int)
                        $validated['supervisor_id'],
                    );

            abort_unless(
                $supervisor->user
                && $supervisor->user->is_active
                && $supervisor->positionRecord
                && $supervisor->positionRecord->is_active
                && $supervisor->positionRecord->is_supervisory,
                422,
                'The selected supervisor is not eligible.',
            );

            abort_unless(
                $supervisor->user->role === $role,
                422,
                'The selected supervisor must have the same PROWARE role.',
            );

            abort_unless(
                $supervisor->positionRecord->level
                < $position->level,
                422,
                'The selected supervisor must hold a higher organizational position.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Create User + Staff Profile
        |--------------------------------------------------------------------------
        */

        $createdUser =
            DB::transaction(
                function () use (
                    $name,
                    $employeeId,
                    $email,
                    $position,
                    $supervisor,
                    $role,
                    $validated,
                ): User {
                    $user =
                        User::create([
                            'name' => $name,

                            'email' => $email,

                            'password' => Hash::make(
                                (string)
                                $validated['password'],
                            ),

                            'role' => $role,

                            'is_active' => true,

                            /*
                             * Newly created staff must
                             * replace the temporary password
                             * on first login.
                             */
                            'must_change_password' => true,
                        ]);

                    Staff::create([
                        'user_id' => $user->id,

                        'employee_id' => $employeeId,

                        /*
                        * Keep the legacy position value
                        * populated during the transition.
                        */
                        'position' => $position->name,

                        'position_id' => $position->id,

                        'supervisor_id' => $supervisor?->id,
                    ]);

                    return $user;
                },
            );

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: 'created',

            module: 'users',

            description: "Created {$createdUser->role} account for {$createdUser->name}.",

            subject: $createdUser,

            newValues: [
                'name' => $createdUser->name,

                'email' => $createdUser->email,

                'role' => $createdUser->role,

                'employee_id' => $employeeId,

                'position' => $position->name,

                'position_id' => $position->id,

                'is_active' => (bool)
                    $createdUser->is_active,

                'must_change_password' => (bool)
                    $createdUser
                        ->must_change_password,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Redirect
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'admin.users.index',
            )
            ->with(
                'success',
                "Staff account for {$createdUser->name} was created successfully.",
            );
    }

    public function edit(
        Request $request,
        User $user,
    ): Response {
        $admin = $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Staff Profile Required
        |--------------------------------------------------------------------------
        */

        $user->load([
            'staff.positionRecord',
            'staff.supervisor.user',
            'staff.supervisor.positionRecord',
        ]);

        abort_unless(
            $user->staff,
            404,
            'This account does not have a staff profile.',
        );

        /*
        |--------------------------------------------------------------------------
        | Admin Editing Rules
        |--------------------------------------------------------------------------
        |
        | A Staff Admin can never edit an admin-level account —
        | including Super Admin, which the previous
        | role === ROLE_ADMIN check did not cover.
        */

        if (
            ! $admin->isSuperAdmin()
            && $user->isAdminLevel()
        ) {
            abort(
                403,
                'Staff Admin accounts cannot edit Admin or Super Admin users.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Available Positions
        |--------------------------------------------------------------------------
        */

        $allowedPositionRoles =
            $admin->isSuperAdmin()
                ? [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                    User::ROLE_ADMIN,
                ]
                : [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                ];

        $positions =
            Position::query()
                ->where('is_active', true)
                ->whereIn(
                    'role',
                    $allowedPositionRoles,
                )
                ->orderBy('role')
                ->orderBy('level')
                ->orderBy('name')
                ->get([
                    'id',
                    'name',
                    'role',
                    'level',
                    'is_supervisory',
                ])
                ->map(
                    fn (Position $position): array => [
                        'id' => $position->id,
                        'name' => $position->name,
                        'role' => $position->role,
                        'level' => $position->level,
                        'is_supervisory' => (bool) $position->is_supervisory,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Current Historical Supervisor
        |--------------------------------------------------------------------------
        */

        $currentSupervisor = null;

        if ($user->staff->supervisor) {
            $currentSupervisor = [
                'id' => $user->staff->supervisor->id,

                'employee_id' => $user->staff->supervisor
                    ->employee_id,

                'name' => $user->staff->supervisor
                    ->user?->name,

                'role' => $user->staff->supervisor
                    ->user?->role,

                'position' => $user->staff->supervisor
                    ->positionRecord?->name,

                'position_id' => $user->staff->supervisor
                    ->position_id,

                'level' => $user->staff->supervisor
                    ->positionRecord?->level,

                'is_active' => (bool)
                    $user->staff->supervisor
                        ->user?->is_active,
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Eligible Supervisors
        |--------------------------------------------------------------------------
        */

        $supervisors =
            Staff::query()
                ->with([
                    'user:id,name,role,is_active',
                    'positionRecord:id,name,role,level,is_supervisory,is_active',
                ])
                ->whereKeyNot(
                    $user->staff->id,
                )
                ->whereHas(
                    'user',
                    fn ($query) => $query->where(
                        'is_active',
                        true,
                    ),
                )
                ->whereHas(
                    'positionRecord',
                    fn ($query) => $query
                        ->where(
                            'is_active',
                            true,
                        )
                        ->where(
                            'is_supervisory',
                            true,
                        ),
                )
                ->orderBy('employee_id')
                ->get()
                ->map(
                    fn (Staff $staff): array => [
                        'id' => $staff->id,
                        'employee_id' => $staff->employee_id,
                        'name' => $staff->user?->name,
                        'role' => $staff->user?->role,
                        'position' => $staff->positionRecord?->name,
                        'position_id' => $staff->position_id,
                        'level' => $staff->positionRecord?->level,
                    ],
                )
                ->values();

        return Inertia::render(
            'admin/Users/Edit',
            [
                'user' => [
                    'id' => $user->id,

                    'name' => $user->name,

                    'email' => $user->email,

                    'role' => $user->role,

                    'employee_id' => $user->staff->employee_id,

                    'position_id' => $user->staff->position_id,

                    'supervisor_id' => $user->staff->supervisor_id,

                    'is_active' => (bool) $user->is_active,
                ],

                'canEditAdmin' => $admin->isSuperAdmin(),

                'positions' => $positions,

                'supervisors' => $supervisors,

                'currentSupervisor' => $currentSupervisor,
            ],
        );
    }

    public function update(
        Request $request,
        User $user,
    ): RedirectResponse {
        $admin = $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        $user->load([
            'staff.positionRecord',
            'staff.supervisor.user',
            'staff.supervisor.positionRecord',
        ]);

        abort_unless(
            $user->staff,
            404,
            'This account does not have a staff profile.',
        );

        if (
            ! $admin->isSuperAdmin()
            && $user->isAdminLevel()
        ) {
            abort(
                403,
                'Staff Admin accounts cannot edit Admin or Super Admin users.',
            );
        }

        $allowedRoles =
            $admin->isSuperAdmin()
                ? [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                    User::ROLE_ADMIN,
                ]
                : [
                    User::ROLE_CASHIER,
                    User::ROLE_SPECIALIST,
                ];

        $validated = $request->validate(
            [
                'name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'employee_id' => [
                    'required',
                    'string',
                    'max:50',

                    Rule::unique(
                        'staffs',
                        'employee_id',
                    )->ignore(
                        $user->staff->id,
                    ),
                ],

                'email' => [
                    'required',
                    'string',
                    'email',
                    'max:255',

                    Rule::unique(
                        'users',
                        'email',
                    )->ignore(
                        $user->id,
                    ),
                ],

                'role' => [
                    'required',
                    Rule::in(
                        $allowedRoles,
                    ),
                ],

                'position_id' => [
                    'required',
                    'integer',

                    Rule::exists(
                        'positions',
                        'id',
                    )->where(
                        fn ($query) => $query->where(
                            'is_active',
                            true,
                        ),
                    ),
                ],

                'supervisor_id' => [
                    'nullable',
                    'integer',

                    Rule::exists(
                        'staffs',
                        'id',
                    ),
                ],
            ],
            [
                'name.required' => 'The staff member name is required.',

                'employee_id.required' => 'The employee ID is required.',

                'employee_id.unique' => 'This employee ID is already assigned to another staff member.',

                'email.required' => 'The staff email address is required.',

                'email.email' => 'Please enter a valid email address.',

                'email.unique' => 'An account already exists using this email address.',

                'role.required' => 'Please select a PROWARE role.',

                'role.in' => 'The selected role is not allowed.',

                'position_id.required' => 'Please select a staff position.',

                'position_id.exists' => 'The selected staff position is invalid or inactive.',
            ],
        );

        $name =
            trim(
                (string)
                $validated['name'],
            );

        $employeeId =
            trim(
                (string)
                $validated['employee_id'],
            );

        $email =
            strtolower(
                trim(
                    (string)
                    $validated['email'],
                ),
            );

        $role =
            (string)
            $validated['role'];

        $position =
            Position::query()
                ->whereKey(
                    (int)
                    $validated['position_id'],
                )
                ->where(
                    'is_active',
                    true,
                )
                ->firstOrFail();

        abort_unless(
            $position->role === $role,
            422,
            'The selected position does not match the selected PROWARE role.',
        );

        /*
|--------------------------------------------------------------------------
| Supervisor Assignment
|--------------------------------------------------------------------------
|
| Existing supervisor relationships are historical organizational data.
|
| If the submitted supervisor is the employee's current supervisor,
| preserve the relationship even if that supervisor has since become
| inactive.
|
| A different supervisor is treated as a new assignment and must pass
| all normal eligibility rules.
|
*/

        $currentSupervisorId =
            $user->staff->supervisor_id !== null
                ? (int) $user->staff->supervisor_id
                : null;

        $requestedSupervisorId =
            ! empty(
                $validated['supervisor_id']
            )
                ? (int) $validated['supervisor_id']
                : null;

        $supervisor = null;

        if ($requestedSupervisorId !== null) {
            $supervisor =
                Staff::query()
                    ->with([
                        'user',
                        'positionRecord',
                    ])
                    ->findOrFail(
                        $requestedSupervisorId,
                    );

            /*
            |--------------------------------------------------------------------------
            | Self-Supervision Protection
            |--------------------------------------------------------------------------
            */

            abort_if(
                $supervisor->id ===
                    $user->staff->id,
                422,
                'An employee cannot supervise themselves.',
            );

            /*
            |--------------------------------------------------------------------------
            | New Supervisor Assignment
            |--------------------------------------------------------------------------
            |
            | Only run the eligibility checks if the administrator is assigning
            | a different supervisor.
            |
            | The employee's existing supervisor may remain assigned even when
            | that supervisor has since become inactive.
            |
            */

            if (
                $requestedSupervisorId !==
                $currentSupervisorId
            ) {
                abort_unless(
                    $supervisor->user
                    && $supervisor->user->is_active
                    && $supervisor->positionRecord
                    && $supervisor
                        ->positionRecord
                        ->is_active
                    && $supervisor
                        ->positionRecord
                        ->is_supervisory,
                    422,
                    'The selected supervisor is not eligible.',
                );

                abort_unless(
                    $supervisor->user->role ===
                        $role,
                    422,
                    'The selected supervisor must have the same PROWARE role.',
                );

                abort_unless(
                    $supervisor
                        ->positionRecord
                        ->level
                    <
                    $position->level,
                    422,
                    'The selected supervisor must hold a higher organizational position.',
                );
            }
        }

        $oldValues = [
            'name' => $user->name,

            'email' => $user->email,

            'role' => $user->role,

            'employee_id' => $user->staff->employee_id,

            'position' => $user->staff
                ->positionRecord
                ?->name
                ?? $user->staff->position,

            'position_id' => $user->staff->position_id,

            'supervisor_id' => $user->staff->supervisor_id,
        ];

        DB::transaction(
            function () use (
                $user,
                $name,
                $email,
                $role,
                $employeeId,
                $position,
                $supervisor,
            ): void {
                $user->update([
                    'name' => $name,

                    'email' => $email,

                    'role' => $role,
                ]);

                $user->staff->update([
                    'employee_id' => $employeeId,

                    'position' => $position->name,

                    'position_id' => $position->id,

                    'supervisor_id' => $supervisor?->id,
                ]);
            },
        );

        $user->refresh();

        AuditLogger::log(
            request: $request,

            action: 'updated',

            module: 'users',

            description: "Updated staff account for {$user->name}.",

            subject: $user,

            oldValues: $oldValues,

            newValues: [
                'name' => $name,

                'email' => $email,

                'role' => $role,

                'employee_id' => $employeeId,

                'position' => $position->name,

                'position_id' => $position->id,

                'supervisor_id' => $supervisor?->id,
            ],
        );

        return redirect()
            ->route(
                'admin.users.index',
            )
            ->with(
                'success',
                "Staff account for {$user->name} was updated successfully.",
            );
    }
}
