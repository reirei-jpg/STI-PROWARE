<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

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

        $logsPaginator =
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
                ->withQueryString();

        /*
        |--------------------------------------------------------------------------
        | Related Record Previews
        |--------------------------------------------------------------------------
        |
        | Batch-fetched once per page load (not per click) so the
        | "Related Record" popup can show a quick preview without a
        | separate request — only for modules with a subject we can
        | meaningfully summarize.
        */

        $orderSummaries =
            self::orderSummaries(
                $logsPaginator->getCollection(),
            );

        $userSummaries =
            self::userSummaries(
                $logsPaginator->getCollection(),
            );

        $productSummaries =
            self::productSummaries(
                $logsPaginator->getCollection(),
            );

        $logs =
            $logsPaginator
                ->through(
                    function (
                        AuditLog $log,
                    ) use (
                        $orderSummaries,
                        $userSummaries,
                        $productSummaries,
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
                            |
                            | related_record_url only gets set for modules that
                            | have a real admin page to jump to. subject_summary
                            | is a quick preview so the popup can show what
                            | actually happened without leaving this page; it's
                            | null when the record was since deleted, or for
                            | modules (Products, Inventory) with no summary
                            | built yet.
                            */

                            'subject_type' => $log->subject_type,

                            'subject_id' => $log->subject_id,

                            'related_record_url' => self::relatedRecordUrl(
                                $log->module,
                                $log->action,
                                $log->subject_id,
                            ),

                            'subject_summary' => match (true) {
                                $log->module === 'orders' => $orderSummaries->get(
                                    $log->subject_id,
                                ),

                                $log->module === 'users' => $userSummaries->get(
                                    $log->subject_id,
                                ),

                                /*
                                 * Variant-level actions (variant_created,
                                 * variant_activated, ...) have a
                                 * ProductVariant subject, not a Product —
                                 * $productSummaries only covers Products,
                                 * so those correctly fall through to null.
                                 */
                                $log->module === 'products'
                                    && ! str_starts_with(
                                        $log->action,
                                        'variant_',
                                    ) => $productSummaries->get(
                                        $log->subject_id,
                                    ),

                                default => null,
                            },

                            /*
                            |--------------------------------------------------------------------------
                            | Changed Values
                            |--------------------------------------------------------------------------
                            */

                            'old_values' => $log->old_values,

                            'new_values' => $log->new_values,

                            /*
                            |--------------------------------------------------------------------------
                            | Timestamp
                            |--------------------------------------------------------------------------
                            */

                            'created_at' => $log
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
        |
        | Each card measures a distinct time window using Philippine
        | day/week boundaries, so it never disagrees with "today" as
        | shown anywhere else in PROWARE.
        */

        $now =
            now(
                self::DISPLAY_TIMEZONE,
            );

        $todayStartUtc =
            $now->clone()
                ->startOfDay()
                ->utc();

        $todayEndUtc =
            $now->clone()
                ->endOfDay()
                ->utc();

        $weekStartUtc =
            $now->clone()
                ->startOfWeek()
                ->utc();

        $weekEndUtc =
            $now->clone()
                ->endOfWeek()
                ->utc();

        $summary = [
            'total' => AuditLog::query()
                ->count(),

            'today' => AuditLog::query()
                ->whereBetween(
                    'created_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->count(),

            'this_week' => AuditLog::query()
                ->whereBetween(
                    'created_at',
                    [
                        $weekStartUtc,
                        $weekEndUtc,
                    ],
                )
                ->count(),

            'active_staff_today' => AuditLog::query()
                ->whereNotNull(
                    'user_id',
                )
                ->whereBetween(
                    'created_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->distinct(
                    'user_id',
                )
                ->count(
                    'user_id',
                ),
        ];

        /*
        |--------------------------------------------------------------------------
        | Summary Card Details
        |--------------------------------------------------------------------------
        |
        | The breakdown each summary card shows when clicked.
        */

        $cardDetails = [
            'total' => [
                'module_breakdown' => self::moduleBreakdown(),
            ],

            'today' => [
                'module_breakdown' => self::moduleBreakdown(
                    $todayStartUtc,
                    $todayEndUtc,
                ),
            ],

            'this_week' => [
                'daily_breakdown' => collect(
                    range(0, 6),
                )
                    ->map(
                        function (int $offset) use ($now): array {
                            $day =
                                $now->clone()
                                    ->startOfWeek()
                                    ->addDays($offset);

                            $count =
                                AuditLog::query()
                                    ->whereBetween(
                                        'created_at',
                                        [
                                            $day->clone()
                                                ->startOfDay()
                                                ->utc(),
                                            $day->clone()
                                                ->endOfDay()
                                                ->utc(),
                                        ],
                                    )
                                    ->count();

                            return [
                                'label' => $day->format('D'),

                                'count' => $count,

                                'is_today' => $day->isSameDay(
                                    $now,
                                ),
                            ];
                        },
                    )
                    ->values(),
            ],

            'active_staff_today' => [
                'staff' => AuditLog::query()
                    ->whereNotNull('user_id')
                    ->whereBetween(
                        'created_at',
                        [
                            $todayStartUtc,
                            $todayEndUtc,
                        ],
                    )
                    ->select([
                        'user_id',
                        'actor_name',
                        'actor_role',
                    ])
                    ->selectRaw(
                        'COUNT(*) AS action_count',
                    )
                    ->groupBy(
                        'user_id',
                        'actor_name',
                        'actor_role',
                    )
                    ->orderByDesc('action_count')
                    ->get()
                    ->map(
                        fn ($row): array => [
                            'user_id' => $row->user_id,

                            'name' => $row->actor_name,

                            'role' => $row->actor_role,

                            'action_count' => (int) $row->action_count,
                        ],
                    )
                    ->values(),
            ],
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

                'cardDetails' => $cardDetails,

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

    /**
     * The admin page that shows this log's affected record, if one
     * exists for its module.
     */
    private static function relatedRecordUrl(
        string $module,
        string $action,
        ?int $subjectId,
    ): ?string {
        if (! $subjectId) {
            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | Products Module — Two Different Subjects
        |--------------------------------------------------------------------------
        |
        | "products" covers both Product-level actions (subject is a
        | Product, safe to link to its edit page) and variant-level
        | actions (subject is a ProductVariant, which has no edit
        | page of its own — linking with a variant ID would open
        | the wrong, or a nonexistent, product).
        */

        if ($module === 'products') {
            return str_starts_with($action, 'variant_')
                ? null
                : "/admin/products/{$subjectId}/edit";
        }

        return match ($module) {
            'orders' => "/admin/orders/{$subjectId}",

            'users' => "/admin/users/{$subjectId}/edit",

            'purchase_orders' => "/admin/purchase-orders/{$subjectId}",

            default => null,
        };
    }

    /**
     * A quick order preview for every Orders-module log on this
     * page, keyed by order ID, batch-fetched in one query.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private static function orderSummaries(
        Collection $logs,
    ): Collection {
        $orderIds =
            $logs
                ->where('module', 'orders')
                ->pluck('subject_id')
                ->filter()
                ->unique()
                ->values();

        if ($orderIds->isEmpty()) {
            return collect();
        }

        return Order::query()
            ->whereIn('id', $orderIds)
            ->with(['student.user'])
            ->get()
            ->keyBy('id')
            ->map(
                fn (Order $order): array => [
                    'order_number' => $order->order_number,

                    'student_name' => $order
                        ->student
                        ?->user
                        ?->name
                        ?? 'Unknown Student',

                    'payment_status' => $order->payment_status,

                    'fulfillment_status' => $order->fulfillment_status,

                    'total' => (string) $order->total,
                ],
            );
    }

    /**
     * A quick account preview for every Users-module log on this
     * page, keyed by user ID, batch-fetched in one query.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private static function userSummaries(
        Collection $logs,
    ): Collection {
        $userIds =
            $logs
                ->where('module', 'users')
                ->pluck('subject_id')
                ->filter()
                ->unique()
                ->values();

        if ($userIds->isEmpty()) {
            return collect();
        }

        return User::query()
            ->whereIn('id', $userIds)
            ->get()
            ->keyBy('id')
            ->map(
                fn (User $user): array => [
                    'name' => $user->name,

                    'email' => $user->email,

                    'role' => $user->role,

                    'is_active' => (bool) $user->is_active,
                ],
            );
    }

    /**
     * A quick product preview for every Products-module log on this
     * page whose subject is a Product (not a variant), keyed by
     * product ID, batch-fetched in one query.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private static function productSummaries(
        Collection $logs,
    ): Collection {
        $productIds =
            $logs
                ->filter(
                    fn (AuditLog $log): bool => $log->module === 'products'
                        && ! str_starts_with($log->action, 'variant_'),
                )
                ->pluck('subject_id')
                ->filter()
                ->unique()
                ->values();

        if ($productIds->isEmpty()) {
            return collect();
        }

        return Product::query()
            ->whereIn('id', $productIds)
            ->with(['category:id,name'])
            ->get()
            ->keyBy('id')
            ->map(
                fn (Product $product): array => [
                    'code' => $product->code,

                    'name' => $product->name,

                    'category_name' => $product->category?->name
                        ?? 'Uncategorized',

                    'base_price' => (string) $product->base_price,

                    'is_active' => (bool) $product->is_active,
                ],
            );
    }

    /**
     * Log counts grouped by module, optionally scoped to a time
     * window. Powers the Total Logs and Today card popups.
     *
     * @return Collection<int, array{module: string, count: int}>
     */
    private static function moduleBreakdown(
        ?CarbonImmutable $startUtc = null,
        ?CarbonImmutable $endUtc = null,
    ): Collection {
        $query =
            AuditLog::query()
                ->select('module')
                ->selectRaw('COUNT(*) AS count');

        if ($startUtc && $endUtc) {
            $query->whereBetween(
                'created_at',
                [
                    $startUtc,
                    $endUtc,
                ],
            );
        }

        return $query
            ->groupBy('module')
            ->orderByDesc('count')
            ->get()
            ->map(
                fn ($row): array => [
                    'module' => $row->module,

                    'count' => (int) $row->count,
                ],
            )
            ->values();
    }
}
