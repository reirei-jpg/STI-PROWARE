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

        $status =
            (string)
            $request->query(
                'status',
                'all',
            );

        if (
            ! in_array(
                $status,
                [
                    'all',
                    'active',
                    'inactive',
                ],
                true,
            )
        ) {
            $status = 'all';
        }

        /*
        |--------------------------------------------------------------------------
        | Query
        |--------------------------------------------------------------------------
        */

        /*
        |--------------------------------------------------------------------------
        | Employee Management Is Staff Only
        |--------------------------------------------------------------------------
        |
        | Students are excluded here entirely — they have their own
        | dedicated management page at /admin/students. This page is
        | Cashier/Specialist/Admin/Super Admin accounts only.
        */

        $query =
            User::query()
                ->where(
                    'role',
                    '!=',
                    User::ROLE_STUDENT,
                )
                ->with([
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
        | Status Filter
        |--------------------------------------------------------------------------
        */

        if ($status !== 'all') {
            $query->where(
                'is_active',
                $status === 'active',
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

                            'is_locked' => $user->isLocked(),

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
                                ?->timezone(config('app.display_timezone'))
                                ->format(
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
                ->where('role', '!=', User::ROLE_STUDENT)
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
                ->where('role', '!=', User::ROLE_STUDENT)
                ->where(
                    'is_active',
                    true,
                )
                ->count(),

            'inactive_accounts' => User::query()
                ->where('role', '!=', User::ROLE_STUDENT)
                ->where(
                    'is_active',
                    false,
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

                    'status' => $status,
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

        /*
        |--------------------------------------------------------------------------
        | Protect Super Admin
        |--------------------------------------------------------------------------
        |
        | Mirrors deactivate()'s protection: an ordinary Admin must
        | never be able to change a Super Admin account's state,
        | activation included.
        */

        if (
            $user->isSuperAdmin()
            &&
            ! $admin->isSuperAdmin()
        ) {
            return back()->withErrors([
                'user' => 'You are not allowed to activate the Super Admin account.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Security Lockout Requires Super Admin For Admin-Tier
        |--------------------------------------------------------------------------
        |
        | An account auto-locked after repeated failed login
        | attempts is treated as a possible attack in progress, not
        | routine account management. For Admin-tier accounts, only
        | the Super Admin can clear it, so a real, deliberate check
        | happens on whether the account owner or an attacker was
        | behind the attempts — a peer Admin reactivating it would
        | skip that check entirely.
        */

        if (
            $user->isLocked()
            && $user->isAdminLevel()
            && ! $admin->isSuperAdmin()
        ) {
            return back()->withErrors([
                'user' => 'This account was locked for security reasons and can only be reactivated by the Super Admin.',
            ]);
        }

        if ($user->is_active) {
            return back()->with(
                'success',
                "{$user->name}'s account is already active.",
            );
        }

        $wasLocked =
            $user->isLocked();

        $previousLockedAt =
            $user->locked_at
                ?->toDateTimeString();

        $user->update([
            'is_active' => true,

            'failed_login_attempts' => 0,

            'locked_at' => null,
        ]);

        AuditLogger::log(
            request: $request,

            action: 'activated',

            module: 'users',

            description: $wasLocked
                ? "Reactivated {$user->name}'s account after a security lockout."
                : "Activated account for {$user->name}.",

            subject: $user,

            oldValues: $wasLocked
                ? [
                    'is_active' => false,

                    'locked_at' => $previousLockedAt,
                ]
                : [
                    'is_active' => false,
                ],

            newValues: $wasLocked
                ? [
                    'is_active' => true,

                    'locked_at' => null,
                ]
                : [
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
        | Protect Last Active Admin/Super Admin + Deactivate Account
        |--------------------------------------------------------------------------
        |
        | Locked and re-checked together in one transaction so two
        | concurrent deactivation requests (two browser tabs, or a
        | race between two admins) can never both pass the "at least
        | one account of this tier remains active" count before
        | either commits — which could otherwise leave zero active
        | Admin, or zero active Super Admin, accounts.
        |
        | Self-deactivation is blocked above, but that alone does not
        | stop two different Super Admins from deactivating each
        | other at the same time, so Super Admin needs this same
        | last-one-standing floor, not just the self-check.
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
                        in_array(
                            $lockedUser->role,
                            [
                                User::ROLE_ADMIN,
                                User::ROLE_SUPER_ADMIN,
                            ],
                            true,
                        )
                    ) {
                        /*
                         * Postgres rejects FOR UPDATE combined
                         * with an aggregate in the same query, so
                         * the matching rows are locked and counted
                         * in PHP instead of via ->count().
                         */
                        $activeInTier =
                            User::query()
                                ->where(
                                    'role',
                                    $lockedUser->role,
                                )
                                ->where(
                                    'is_active',
                                    true,
                                )
                                ->lockForUpdate()
                                ->pluck('id')
                                ->count();

                        if ($activeInTier <= 1) {
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
                'user' => $user->isSuperAdmin()
                        ? 'The last active Super Admin account cannot be deactivated.'
                        : 'The last active Admin account cannot be deactivated.',
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
