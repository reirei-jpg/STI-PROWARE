<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display all PROWARE users.
     */
    public function index(
        Request $request,
    ): Response {
        $admin =
            $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        $search = trim(
            (string)
            $request->query(
                'search',
                '',
            ),
        );

        $role =
            (string)
            $request->query(
                'role',
                'all',
            );

        $allowedRoles = [
            'all',
            'student',
            'cashier',
            'specialist',
            'admin',
            'super_admin',
        ];

        if (
            ! in_array(
                $role,
                $allowedRoles,
                true,
            )
        ) {
            $role = 'all';
        }

        /*
        |--------------------------------------------------------------------------
        | Query
        |--------------------------------------------------------------------------
        */

        $query =
            User::query()
                ->with([
                    'student',

                    'staff.positionRecord',

                    'staff.supervisor.user',

                    'staff.supervisor.positionRecord',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {
            $query->where(
                function (
                    Builder $query,
                ) use (
                    $search,
                ): void {
                    $query
                        ->where(
                            'name',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'email',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhereHas(
                            'student',
                            function (
                                Builder $studentQuery,
                            ) use (
                                $search,
                            ): void {
                                $studentQuery->where(
                                    'student_id',
                                    'ilike',
                                    '%'.$search.'%',
                                );
                            },
                        )
                        ->orWhereHas(
                            'staff',
                            function (
                                Builder $staffQuery,
                            ) use (
                                $search,
                            ): void {
                                $staffQuery->where(
                                    'employee_id',
                                    'ilike',
                                    '%'.$search.'%',
                                );
                            },
                        );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Role Filter
        |--------------------------------------------------------------------------
        */

        if ($role !== 'all') {
            $query->where(
                'role',
                $role,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Users
        |--------------------------------------------------------------------------
        */

        $users =
            $query
                ->orderBy('name')
                ->paginate(20)
                ->withQueryString()
                ->through(
                    function (
                        User $user,
                    ): array {
                        return [
                            'id' => $user->id,

                            'name' => $user->name,

                            'email' => $user->email,

                            'role' => $user->role,

                            'is_active' => (bool)
                                $user->is_active,

                            'student' => $user->student
                                    ? [
                                        'id' => $user
                                            ->student
                                            ->id,

                                        'student_id' => $user
                                            ->student
                                            ->student_id,

                                        'course' => $user
                                            ->student
                                            ->course,

                                        'year_level' => $user
                                            ->student
                                            ->year_level,

                                        'status' => $user
                                            ->student
                                            ->status,
                                    ]
                                    : null,

                            'staff' => $user->staff
                            ? [
                                'id' => $user
                                    ->staff
                                    ->id,

                                'employee_id' => $user
                                    ->staff
                                    ->employee_id,

                                'position' => $user
                                    ->staff
                                    ->positionRecord
                                    ?->name
                                    ?? $user
                                        ->staff
                                        ->position,

                                'position_id' => $user
                                    ->staff
                                    ->position_id,

                                'position_level' => $user
                                    ->staff
                                    ->positionRecord
                                    ?->level,

                                'is_supervisory' => (bool)
                                    $user
                                        ->staff
                                        ->positionRecord
                                        ?->is_supervisory,

                                'supervisor' => $user
                                    ->staff
                                    ->supervisor
                                        ? [
                                            'id' => $user
                                                ->staff
                                                ->supervisor
                                                ->id,

                                            'name' => $user
                                                ->staff
                                                ->supervisor
                                                ->user
                                                ?->name,

                                            'employee_id' => $user
                                                ->staff
                                                ->supervisor
                                                ->employee_id,

                                            'position' => $user
                                                ->staff
                                                ->supervisor
                                                ->positionRecord
                                                ?->name
                                                ?? $user
                                                    ->staff
                                                    ->supervisor
                                                    ->position,
                                        ]
                                        : null,
                            ]
                            : null,

                            'created_at' => $user
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */

        $summary = [
            'total' => User::query()
                ->count(),

            'students' => User::query()
                ->where(
                    'role',
                    'student',
                )
                ->count(),

            'cashiers' => User::query()
                ->where(
                    'role',
                    'cashier',
                )
                ->count(),

            'specialists' => User::query()
                ->where(
                    'role',
                    'specialist',
                )
                ->count(),

            'admins' => User::query()
                ->whereIn(
                    'role',
                    [
                        User::ROLE_SUPER_ADMIN,
                        User::ROLE_ADMIN,
                    ],
                )
                ->count(),

            'active_accounts' => User::query()
                ->where(
                    'is_active',
                    true,
                )
                ->count(),

            'inactive_accounts' => User::query()
                ->where(
                    'is_active',
                    false,
                )
                ->count(),

            'active_students' => User::query()
                ->where(
                    'role',
                    'student',
                )
                ->whereHas(
                    'student',
                    function (
                        Builder $query,
                    ): void {
                        $query->where(
                            'status',
                            'active',
                        );
                    },
                )
                ->count(),

            'inactive_students' => User::query()
                ->where(
                    'role',
                    'student',
                )
                ->whereHas(
                    'student',
                    function (
                        Builder $query,
                    ): void {
                        $query->where(
                            'status',
                            'inactive',
                        );
                    },
                )
                ->count(),
        ];

        return Inertia::render(
            'admin/Users/Index',
            [
                'users' => $users,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'role' => $role,
                ],
            ],
        );
    }

    /**
     * Activate a PROWARE account.
     */
    public function activate(
        Request $request,
        User $user,
    ): RedirectResponse {
        $admin =
            $request->user();

        abort_unless(
            $admin
            && $admin->isAdminLevel(),
            403,
        );

        if ($user->is_active) {
            return back()->with(
                'success',
                "{$user->name}'s account is already active.",
            );
        }

        $user->update([
            'is_active' => true,
        ]);

        AuditLogger::log(
            request: $request,

            action: 'activated',

            module: 'users',

            description: "Activated account for {$user->name}.",

            subject: $user,

            oldValues: [
                'is_active' => false,
            ],

            newValues: [
                'is_active' => true,
            ],
        );

        return back()->with(
            'success',
            "{$user->name}'s account has been activated.",
        );
    }

    /**
     * Deactivate a PROWARE account.
     */
    public function deactivate(
        Request $request,
        User $user,
    ): RedirectResponse {
        $admin =
            $request->user();

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
        | Protect Super Admin
        |--------------------------------------------------------------------------
        |
        | Ordinary Admin accounts must never be able to deactivate
        | the System Owner / Super Admin account.
        |
        */

        if (
            $user->isSuperAdmin()
            &&
            ! $admin->isSuperAdmin()
        ) {
            return back()->withErrors([
                'user' => 'You are not allowed to deactivate the Super Admin account.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent Self-Deactivation
        |--------------------------------------------------------------------------
        */

        if (
            $admin->id ===
            $user->id
        ) {
            return back()->withErrors([
                'user' => $admin->isSuperAdmin()
                        ? 'You cannot deactivate your own Super Admin account.'
                        : 'You cannot deactivate your own Admin account.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Protect Last Active Normal Admin + Deactivate Account
        |--------------------------------------------------------------------------
        |
        | Locked and re-checked together in one transaction so two
        | concurrent deactivation requests (two browser tabs, or a
        | race between two admins) can never both pass the "at least
        | one Admin remains active" count before either commits —
        | which could otherwise leave zero active Admin accounts.
        |
        | Super Admin is protected separately above.
        */

        $result =
            DB::transaction(
                function () use ($user): string {
                    $lockedUser =
                        User::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $user->id,
                            );

                    if (! $lockedUser->is_active) {
                        return 'already_inactive';
                    }

                    if (
                        $lockedUser->role ===
                        User::ROLE_ADMIN
                    ) {
                        /*
                         * Postgres rejects FOR UPDATE combined
                         * with an aggregate in the same query, so
                         * the matching rows are locked and counted
                         * in PHP instead of via ->count().
                         */
                        $activeAdmins =
                            User::query()
                                ->where(
                                    'role',
                                    User::ROLE_ADMIN,
                                )
                                ->where(
                                    'is_active',
                                    true,
                                )
                                ->lockForUpdate()
                                ->pluck('id')
                                ->count();

                        if ($activeAdmins <= 1) {
                            return 'last_admin';
                        }
                    }

                    $lockedUser->update([
                        'is_active' => false,
                    ]);

                    return 'deactivated';
                },
                attempts: 3,
            );

        if ($result === 'last_admin') {
            return back()->withErrors([
                'user' => 'The last active Admin account cannot be deactivated.',
            ]);
        }

        if ($result === 'already_inactive') {
            return back()->with(
                'success',
                "{$user->name}'s account is already disabled.",
            );
        }

        AuditLogger::log(
            request: $request,

            action: 'deactivated',

            module: 'users',

            description: "Deactivated account for {$user->name}.",

            subject: $user,

            oldValues: [
                'is_active' => true,
            ],

            newValues: [
                'is_active' => false,
            ],
        );

        return back()->with(
            'success',
            "{$user->name}'s account has been deactivated.",
        );
    }
}
