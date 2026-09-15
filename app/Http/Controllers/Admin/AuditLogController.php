<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display PROWARE audit logs.
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

        $search =
            trim(
                (string)
                $request->query(
                    'search',
                    '',
                ),
            );

        $module =
            trim(
                (string)
                $request->query(
                    'module',
                    'all',
                ),
            );

        $action =
            trim(
                (string)
                $request->query(
                    'action',
                    'all',
                ),
            );

        /*
        |--------------------------------------------------------------------------
        | Audit Log Query
        |--------------------------------------------------------------------------
        */

        $query =
            AuditLog::query()
                ->with([
                    'user:id,name,email,role',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        |
        | Search supports both the stored actor snapshot and the related
        | current User record.
        |
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
                            'description',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'action',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'module',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'actor_name',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'actor_email',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'actor_role',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhereHas(
                            'user',
                            function (
                                Builder $userQuery,
                            ) use (
                                $search,
                            ): void {
                                $userQuery
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
                                    ->orWhere(
                                        'role',
                                        'ilike',
                                        '%'.$search.'%',
                                    );
                            },
                        );

                    /*
                    |--------------------------------------------------------------------------
                    | Numeric User ID Search
                    |--------------------------------------------------------------------------
                    */

                    if (
                        ctype_digit(
                            $search,
                        )
                    ) {
                        $query->orWhere(
                            'user_id',
                            (int) $search,
                        );
                    }
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Module Filter
        |--------------------------------------------------------------------------
        */

        if (
            $module !== ''
            && $module !== 'all'
        ) {
            $query->where(
                'module',
                $module,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Action Filter
        |--------------------------------------------------------------------------
        */

        if (
            $action !== ''
            && $action !== 'all'
        ) {
            $query->where(
                'action',
                $action,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Paginated Logs
        |--------------------------------------------------------------------------
        */

        $logs =
            $query
                ->latest(
                    'created_at',
                )
                ->latest(
                    'id',
                )
                ->paginate(
                    20,
                )
                ->withQueryString()
                ->through(
                    function (
                        AuditLog $log,
                    ): array {
                        /*
                        |--------------------------------------------------------------------------
                        | Actor Identity
                        |--------------------------------------------------------------------------
                        |
                        | Prefer the stored snapshot because it represents the
                        | account identity at the time the action happened.
                        |
                        | Fall back to the current User relationship for older
                        | records or incomplete historical data.
                        |
                        */

                        $actorName =
                            $log->actor_name
                            ?? $log->user?->name;

                        $actorEmail =
                            $log->actor_email
                            ?? $log->user?->email;

                        $actorRole =
                            $log->actor_role
                            ?? $log->user?->role;

                        return [
                            'id' => $log->id,

                            /*
                            |--------------------------------------------------------------------------
                            | Actor
                            |--------------------------------------------------------------------------
                            */

                            'user_id' => $log->user_id,

                            'actor_name' => $actorName,

                            'actor_email' => $actorEmail,

                            'actor_role' => $actorRole,

                            /*
                            |--------------------------------------------------------------------------
                            | Current User Relationship
                            |--------------------------------------------------------------------------
                            |
                            | Retained for relational traceability and fallback.
                            |
                            */

                            'user' => $log->user
                                    ? [
                                        'id' => $log
                                            ->user
                                            ->id,

                                        'name' => $log
                                            ->user
                                            ->name,

                                        'email' => $log
                                            ->user
                                            ->email,

                                        'role' => $log
                                            ->user
                                            ->role,
                                    ]
                                    : null,

                            /*
                            |--------------------------------------------------------------------------
                            | Activity
                            |--------------------------------------------------------------------------
                            */

                            'action' => $log->action,

                            'module' => $log->module,

                            'description' => $log->description,

                            /*
                            |--------------------------------------------------------------------------
                            | Related Record
                            |--------------------------------------------------------------------------
                            */

                            'subject_type' => $log->subject_type,

                            'subject_id' => $log->subject_id,

                            /*
                            |--------------------------------------------------------------------------
                            | Changed Values
                            |--------------------------------------------------------------------------
                            */

                            'old_values' => $log->old_values,

                            'new_values' => $log->new_values,

                            /*
                            |--------------------------------------------------------------------------
                            | Request Information
                            |--------------------------------------------------------------------------
                            */

                            'ip_address' => $log->ip_address,

                            'user_agent' => $log->user_agent,

                            /*
                            |--------------------------------------------------------------------------
                            | Timestamp
                            |--------------------------------------------------------------------------
                            */

                            'created_at' => $log
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Module Options
        |--------------------------------------------------------------------------
        */

        $modules =
            AuditLog::query()
                ->whereNotNull(
                    'module',
                )
                ->select(
                    'module',
                )
                ->distinct()
                ->orderBy(
                    'module',
                )
                ->pluck(
                    'module',
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Action Options
        |--------------------------------------------------------------------------
        */

        $actions =
            AuditLog::query()
                ->whereNotNull(
                    'action',
                )
                ->select(
                    'action',
                )
                ->distinct()
                ->orderBy(
                    'action',
                )
                ->pluck(
                    'action',
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */

        $summary = [
            'total' => AuditLog::query()
                ->count(),

            'today' => AuditLog::query()
                ->whereDate(
                    'created_at',
                    now()
                        ->toDateString(),
                )
                ->count(),

            'users' => AuditLog::query()
                ->whereNotNull(
                    'user_id',
                )
                ->count(),

            'authentication' => AuditLog::query()
                ->where(
                    'module',
                    'authentication',
                )
                ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/AuditLogs/Index',
            [
                'logs' => $logs,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'module' => $module,

                    'action' => $action,
                ],

                'modules' => $modules,

                'actions' => $actions,
            ],
        );
    }
}
