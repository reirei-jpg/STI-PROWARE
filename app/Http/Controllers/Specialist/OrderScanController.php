<?php

namespace App\Http\Controllers\Specialist;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockMovement;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use App\Services\StockAlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrderScanController extends Controller
{
    /**
     * Show paid orders waiting for merchandise release.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        $orders = Order::query()
            ->with([
                'student.user',
                'items.productVariant.product',
            ])
            ->where(
                'payment_status',
                Order::PAYMENT_PAID,
            )
            ->whereNotIn(
                'fulfillment_status',
                [
                    Order::FULFILLMENT_RELEASED,
                    Order::FULFILLMENT_CANCELLED,
                ],
            )
            ->latest('paid_at')
            ->get()
            ->map(
                function (
                    Order $order,
                ): array {
                    return [
                        'id' => $order->id,

                        'order_number' => $order->order_number,

                        'order_type' => $order->order_type,

                        'payment_status' => $order->payment_status,

                        'fulfillment_status' => $order->fulfillment_status,

                        'total' => (string) $order->total,

                        'total_quantity' => $order->totalQuantity(),

                        'release_qr_token' => $order->release_qr_token,

                        'release_qr_used' => $order->release_qr_used_at
                            !== null,

                        'paid_at' => $order->paid_at
                            ?->format(
                                'M d, Y h:i A',
                            ),

                        'student' => [
                            'name' => $order
                                ->student
                                ?->user
                                ?->name
                                ?? 'Unknown Student',

                            'student_id' => $order
                                ->student
                                ?->student_id
                                ?? 'N/A',

                            'course' => $order
                                ->student
                                ?->course
                                ?? 'N/A',
                        ],

                        'items' => $order
                            ->items
                            ->map(
                                function (
                                    $item,
                                ): array {
                                    $product =
                                        $item
                                            ->productVariant
                                            ?->product;

                                    $imageUrl =
                                        $product
                                            ?->image_path
                                        ? '/storage/'
                                            .ltrim(
                                                $product
                                                    ->image_path,
                                                '/',
                                            )
                                        : null;

                                    return [
                                        'id' => $item->id,

                                        'product_name' => $item
                                            ->product_name,

                                        'product_code' => $item
                                            ->product_code,

                                        'variant_name' => $item
                                            ->variant_name,

                                        'sku' => $item->sku,

                                        'program' => $item->program,

                                        'size' => $item->size,

                                        'quantity' => (int)
                                            $item->quantity,

                                        'item_type' => $item
                                            ->item_type,

                                        'image_url' => $imageUrl,
                                    ];
                                },
                            )
                            ->values(),
                    ];
                },
            )
            ->values();

        return Inertia::render(
            'specialist/Orders/Index',
            [
                'orders' => $orders,
            ],
        );
    }

    public function releaseHistory(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        $search = trim(
            (string) $request->query(
                'search',
                '',
            ),
        );

        $date = trim(
            (string) $request->query(
                'date',
                'all',
            ),
        );

        $type = trim(
            (string) $request->query(
                'type',
                'all',
            ),
        );

        $orders = Order::query()
            ->with([
                'student.user',
                'items.productVariant.product',
            ])
            ->where(
                'fulfillment_status',
                Order::FULFILLMENT_RELEASED,
            )
            ->whereNotNull(
                'released_at',
            )
            ->when(
                $search !== '',
                function ($query) use (
                    $search,
                ) {
                    $query->where(
                        function ($subQuery) use (
                            $search,
                        ) {
                            $subQuery
                                ->where(
                                    'order_number',
                                    'ilike',
                                    "%{$search}%",
                                )
                                ->orWhereHas(
                                    'student',
                                    function (
                                        $studentQuery,
                                    ) use (
                                        $search,
                                    ) {
                                        $studentQuery
                                            ->where(
                                                'student_id',
                                                'ilike',
                                                "%{$search}%",
                                            )
                                            ->orWhereHas(
                                                'user',
                                                function (
                                                    $userQuery,
                                                ) use (
                                                    $search,
                                                ) {
                                                    $userQuery
                                                        ->where(
                                                            'name',
                                                            'ilike',
                                                            "%{$search}%",
                                                        );
                                                },
                                            );
                                    },
                                )
                                ->orWhereHas(
                                    'items',
                                    function (
                                        $itemQuery,
                                    ) use (
                                        $search,
                                    ) {
                                        $itemQuery
                                            ->where(
                                                'product_name',
                                                'ilike',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'product_code',
                                                'ilike',
                                                "%{$search}%",
                                            )
                                            ->orWhere(
                                                'sku',
                                                'ilike',
                                                "%{$search}%",
                                            );
                                    },
                                );
                        },
                    );
                },
            )
            ->when(
                in_array(
                    $type,
                    [
                        'order',
                        'preorder',
                    ],
                    true,
                ),
                function ($query) use (
                    $type,
                ) {
                    $query->where(
                        'order_type',
                        $type,
                    );
                },
            )
            ->when(
                $date === 'today',
                fn ($query) => $query->whereDate(
                    'released_at',
                    today(),
                ),
            )
            ->when(
                $date === 'week',
                fn ($query) => $query->whereBetween(
                    'released_at',
                    [
                        now()
                            ->startOfWeek(),
                        now()
                            ->endOfWeek(),
                    ],
                ),
            )
            ->when(
                $date === 'month',
                fn ($query) => $query
                    ->whereYear(
                        'released_at',
                        now()->year,
                    )
                    ->whereMonth(
                        'released_at',
                        now()->month,
                    ),
            )
            ->latest(
                'released_at',
            )
            ->paginate(
                12,
            )
            ->withQueryString();

        $orderIds =
            $orders
                ->getCollection()
                ->pluck(
                    'id',
                )
                ->values();

        $releaseLogs =
            AuditLog::query()
                ->where(
                    'action',
                    'released',
                )
                ->where(
                    'module',
                    'orders',
                )
                ->whereIn(
                    'subject_id',
                    $orderIds,
                )
                ->where(
                    'subject_type',
                    Order::class,
                )
                ->latest()
                ->get()
                ->groupBy(
                    'subject_id',
                );

        $orders->through(
            function (
                Order $order,
            ) use (
                $releaseLogs,
            ): array {
                $releaseLog =
                    $releaseLogs
                        ->get(
                            $order->id,
                        )
                        ?->first();

                return [
                    'id' => $order->id,

                    'order_number' => $order->order_number,

                    'order_type' => $order->order_type,

                    'released_at' => $order
                        ->released_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'release_qr_used_at' => $order
                        ->release_qr_used_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'student' => [
                        'name' => $order
                            ->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'student_id' => $order
                            ->student
                            ?->student_id
                            ?? 'N/A',
                    ],

                    'released_by' => [
                        'name' => $releaseLog
                            ?->actor_name
                            ?? $releaseLog
                                ?->user
                                ?->name
                            ?? 'Unknown Specialist',

                        'email' => $releaseLog
                            ?->actor_email,

                        'role' => $releaseLog
                            ?->actor_role
                            ?? 'specialist',
                    ],

                    'items' => $order
                        ->items
                        ->map(
                            function (
                                $item,
                            ): array {
                                $product =
                                    $item
                                        ->productVariant
                                        ?->product;

                                $imageUrl =
                                    $product
                                        ?->image_path
                                    ? '/storage/'
                                        .ltrim(
                                            $product
                                                ->image_path,
                                            '/',
                                        )
                                    : null;

                                return [
                                    'id' => $item->id,

                                    'product_name' => $item
                                        ->product_name,

                                    'product_code' => $item
                                        ->product_code,

                                    'variant_name' => $item
                                        ->variant_name,

                                    'sku' => $item->sku,

                                    'program' => $item->program,

                                    'size' => $item->size,

                                    'quantity' => (int)
                                        $item->quantity,

                                    'item_type' => $item
                                        ->item_type,

                                    'image_url' => $imageUrl,
                                ];
                            },
                        )
                        ->values(),
                ];
            },
        );

        /*
        |--------------------------------------------------------------------------
        | Summary Counts
        |--------------------------------------------------------------------------
        |
        | Independent of the current search/date/type filters, so the
        | summary cards always describe the full release history and
        | can act as filter shortcuts into it.
        */

        $releasedBaseQuery = fn () => Order::query()
            ->where(
                'fulfillment_status',
                Order::FULFILLMENT_RELEASED,
            )
            ->whereNotNull(
                'released_at',
            );

        $totalReleased =
            $releasedBaseQuery()
                ->count();

        $releasedToday =
            $releasedBaseQuery()
                ->whereDate(
                    'released_at',
                    today(),
                )
                ->count();

        $releasedThisWeek =
            $releasedBaseQuery()
                ->whereBetween(
                    'released_at',
                    [
                        now()
                            ->startOfWeek(),
                        now()
                            ->endOfWeek(),
                    ],
                )
                ->count();

        return Inertia::render(
            'specialist/Releases/Index',
            [
                'orders' => $orders,

                'filters' => [
                    'search' => $search,

                    'date' => $date,

                    'type' => $type,
                ],

                'summary' => [
                    'total' => $totalReleased,

                    'today' => $releasedToday,

                    'week' => $releasedThisWeek,
                ],
            ],
        );
    }

    public function releaseHistoryShow(
        Request $request,
        Order $order,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        abort_unless(
            $order->fulfillment_status
                === Order::FULFILLMENT_RELEASED
            && $order->released_at !== null,
            404,
        );

        $order->load([
            'student.user',
            'items.productVariant.product',
        ]);

        $releaseLog =
            AuditLog::query()
                ->where(
                    'action',
                    'released',
                )
                ->where(
                    'module',
                    'orders',
                )
                ->where(
                    'subject_type',
                    Order::class,
                )
                ->where(
                    'subject_id',
                    $order->id,
                )
                ->latest()
                ->first();

        $items =
            $order
                ->items
                ->map(
                    function (
                        $item,
                    ): array {
                        $product =
                            $item
                                ->productVariant
                                ?->product;

                        $imageUrl =
                            $product
                                ?->image_path
                            ? '/storage/'
                                .ltrim(
                                    $product
                                        ->image_path,
                                    '/',
                                )
                            : null;

                        return [
                            'id' => $item->id,

                            'product_name' => $item
                                ->product_name,

                            'product_code' => $item
                                ->product_code,

                            'variant_name' => $item
                                ->variant_name,

                            'sku' => $item->sku,

                            'program' => $item->program,

                            'size' => $item->size,

                            'quantity' => (int)
                                $item->quantity,

                            'item_type' => $item
                                ->item_type,

                            'image_url' => $imageUrl,
                        ];
                    },
                )
                ->values();

        return Inertia::render(
            'specialist/Releases/Show',
            [
                'order' => [
                    'id' => $order->id,

                    'order_number' => $order
                        ->order_number,

                    'order_type' => $order
                        ->order_type,

                    'fulfillment_status' => $order
                        ->fulfillment_status,

                    'released_at' => $order
                        ->released_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'release_qr_used_at' => $order
                        ->release_qr_used_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'student' => [
                        'name' => $order
                            ->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'student_id' => $order
                            ->student
                            ?->student_id
                            ?? 'N/A',
                    ],

                    'released_by' => [
                        'name' => $releaseLog
                            ?->actor_name
                            ?? 'Unknown Specialist',

                        'email' => $releaseLog
                            ?->actor_email,

                        'role' => $releaseLog
                            ?->actor_role
                            ?? 'specialist',
                    ],

                    'items' => $items,
                ],
            ],
        );
    }

    /**
     * Open an order using its one-time Release QR.
     */
    public function show(
        Request $request,
        string $token,
    ): Response|RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Specialist Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Find Release QR
        |--------------------------------------------------------------------------
        |
        | IMPORTANT:
        |
        | Specialists must use release_qr_token.
        | qr_token belongs to the Cashier payment process.
        |
        */

        $order =
            Order::query()
                ->where(
                    'release_qr_token',
                    $token,
                )
                ->with([
                    'student.user',
                    'items',
                ])
                ->first();

        /*
        |--------------------------------------------------------------------------
        | Invalid QR
        |--------------------------------------------------------------------------
        */

        if (! $order) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    'Invalid Release QR. This QR code does not belong to a valid PROWARE order.',
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Cancelled Order
        |--------------------------------------------------------------------------
        */

        if (
            $order->isCancelled()
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has been cancelled. This Release QR can no longer be used.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Payment Must Be Confirmed
        |--------------------------------------------------------------------------
        */

        if (
            ! $order->isPaid()
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has not been paid yet. The Cashier must confirm payment first.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Already Released
        |--------------------------------------------------------------------------
        */

        if (
            $order->isReleased()
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has already been released and claimed.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | One-Time Release QR
        |--------------------------------------------------------------------------
        */

        if (
            $order->release_qr_used_at
            !== null
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Release QR Already Used. Order {$order->order_number} has already been verified by a PROWARE Specialist.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Consume QR
        |--------------------------------------------------------------------------
        |
        | Once the Specialist successfully scans this Release QR,
        | it can never be scanned again.
        |
        */

        DB::transaction(
            function () use (
                $order,
            ): void {
                $lockedOrder =
                    Order::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $order->id,
                        );

                /*
                 * Protect against two devices scanning
                 * the same QR at almost the same time.
                 */
                if (
                    $lockedOrder
                        ->release_qr_used_at
                    !== null
                ) {
                    throw ValidationException::withMessages([
                        'qr' => 'This Release QR has already been used.',
                    ]);
                }

                $lockedOrder->update([
                    'release_qr_used_at' => now(),
                ]);
            },
            attempts: 3,
        );

        /*
        |--------------------------------------------------------------------------
        | Reload Order
        |--------------------------------------------------------------------------
        */

        $order->refresh();

        $order->load([
            'student.user',
            'items',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Audit QR Verification
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: 'release_qr_scanned',

            module: 'orders',

            description: "Release QR verified for order {$order->order_number} by Specialist {$user->name}.",

            subject: $order,

            newValues: [
                'release_qr_used_at' => $order
                    ->release_qr_used_at
                    ?->toDateTimeString(),

                'verified_by' => $user->id,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Show Order Verification
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'specialist/Orders/Verify',
            [
                'order' => [
                    'id' => $order->id,

                    'order_number' => $order->order_number,

                    'order_type' => $order->order_type,

                    'payment_status' => $order->payment_status,

                    'fulfillment_status' => $order->fulfillment_status,

                    'subtotal' => (string)
                        $order->subtotal,

                    'total' => (string)
                        $order->total,

                    'created_at' => $order
                        ->created_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'released_at' => $order
                        ->released_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'release_qr_used_at' => $order
                        ->release_qr_used_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'student' => [
                        'name' => $order
                            ->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'student_id' => $order
                            ->student
                            ?->student_id
                            ?? 'N/A',

                        'course' => $order
                            ->student
                            ?->course
                            ?? 'N/A',

                        'year_level' => $order
                            ->student
                            ?->year_level
                            ?? 'N/A',
                    ],

                    'items' => $order
                        ->items
                        ->map(
                            fn (
                                $item,
                            ): array => [
                                'id' => $item->id,

                                'product_code' => $item
                                    ->product_code,

                                'product_name' => $item
                                    ->product_name,

                                'variant_name' => $item
                                    ->variant_name,

                                'sku' => $item->sku,

                                'program' => $item->program,

                                'size' => $item->size,

                                'item_type' => $item
                                    ->item_type,

                                'quantity' => (int)
                                    $item
                                        ->quantity,

                                'unit_price' => (string)
                                    $item
                                        ->unit_price,

                                'line_total' => (string)
                                    $item
                                        ->line_total,
                            ],
                        )
                        ->values(),
                ],
            ],
        );
    }

    /**
     * Open an order that has already been verified
     * using its one-time Release QR.
     */
    public function showOrder(
        Request $request,
        Order $order,
    ): Response|RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Specialist Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Load Required Order Data
        |--------------------------------------------------------------------------
        */

        $order->load([
            'student.user',
            'items',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Cancelled Order
        |--------------------------------------------------------------------------
        */

        if (
            $order->isCancelled()
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has been cancelled and can no longer be fulfilled.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Payment Required
        |--------------------------------------------------------------------------
        */

        if (
            ! $order->isPaid()
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has not been paid yet.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Release QR Must Already Be Verified
        |--------------------------------------------------------------------------
        |
        | This prevents a Specialist from manually entering
        | /specialist/orders/{id} to bypass QR verification.
        |
        */

        if (
            $order->release_qr_used_at
            === null
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} must be verified using its Release QR before it can be opened.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Already Released
        |--------------------------------------------------------------------------
        */

        if (
            $order->isReleased()
        ) {
            return redirect()
                ->route(
                    'specialist.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has already been released and claimed.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Show Previously Verified Order
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'specialist/Orders/Verify',
            [
                'order' => [
                    'id' => $order->id,

                    'order_number' => $order->order_number,

                    'order_type' => $order->order_type,

                    'payment_status' => $order->payment_status,

                    'fulfillment_status' => $order->fulfillment_status,

                    'subtotal' => (string)
                        $order->subtotal,

                    'total' => (string)
                        $order->total,

                    'created_at' => $order
                        ->created_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'released_at' => $order
                        ->released_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'release_qr_used_at' => $order
                        ->release_qr_used_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'student' => [
                        'name' => $order
                            ->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'student_id' => $order
                            ->student
                            ?->student_id
                            ?? 'N/A',

                        'course' => $order
                            ->student
                            ?->course
                            ?? 'N/A',

                        'year_level' => $order
                            ->student
                            ?->year_level
                            ?? 'N/A',
                    ],

                    'items' => $order
                        ->items
                        ->map(
                            fn (
                                $item,
                            ): array => [
                                'id' => $item->id,

                                'product_code' => $item
                                    ->product_code,

                                'product_name' => $item
                                    ->product_name,

                                'variant_name' => $item
                                    ->variant_name,

                                'sku' => $item->sku,

                                'program' => $item->program,

                                'size' => $item->size,

                                'item_type' => $item
                                    ->item_type,

                                'quantity' => (int)
                                    $item
                                        ->quantity,

                                'unit_price' => (string)
                                    $item
                                        ->unit_price,

                                'line_total' => (string)
                                    $item
                                        ->line_total,
                            ],
                        )
                        ->values(),
                ],
            ],
        );
    }

    /**
     * Mark a paid and QR-verified order as ready
     * for student pickup.
     */
    public function markReady(
        Request $request,
        Order $order,
        NotificationService $notificationService,
    ): RedirectResponse {
        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Capture Previous State
        |--------------------------------------------------------------------------
        */

        $oldValues = [
            'fulfillment_status' => $order->fulfillment_status,
        ];

        /*
        |--------------------------------------------------------------------------
        | Update Order Status
        |--------------------------------------------------------------------------
        */

        DB::transaction(
            function () use (
                $order,
            ): void {
                $lockedOrder =
                    Order::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $order->id,
                        );

                /*
                 * Release QR must have been successfully
                 * scanned before fulfillment can continue.
                 */
                if (
                    $lockedOrder
                        ->release_qr_used_at
                    === null
                ) {
                    throw ValidationException::withMessages([
                        'order' => 'The Release QR must be scanned and verified before this order can be marked ready for pickup.',
                    ]);
                }

                if (
                    ! $lockedOrder->isPaid()
                ) {
                    throw ValidationException::withMessages([
                        'order' => 'This order cannot be marked ready until payment is confirmed.',
                    ]);
                }

                if (
                    $lockedOrder->isCancelled()
                ) {
                    throw ValidationException::withMessages([
                        'order' => 'A cancelled order cannot be marked ready for pickup.',
                    ]);
                }

                if (
                    $lockedOrder->isReleased()
                ) {
                    throw ValidationException::withMessages([
                        'order' => 'This order has already been released.',
                    ]);
                }

                if (
                    $lockedOrder
                        ->fulfillment_status
                    === Order::FULFILLMENT_READY
                ) {
                    throw ValidationException::withMessages([
                        'order' => 'This order is already ready for pickup.',
                    ]);
                }

                /*
                 * IMPORTANT:
                 *
                 * Ready for Pickup does NOT deduct
                 * physical inventory.
                 *
                 * Stock Out only happens when release()
                 * succeeds.
                 */
                $lockedOrder->update([
                    'fulfillment_status' => Order::FULFILLMENT_READY,

                    'ready_for_release_at' => now(),
                ]);
            },
            attempts: 3,
        );

        /*
        |--------------------------------------------------------------------------
        | Reload Final Order
        |--------------------------------------------------------------------------
        */

        $order =
            Order::query()
                ->with([
                    'student.user',
                ])
                ->findOrFail(
                    $order->id,
                );

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: 'ready_for_pickup',

            module: 'orders',

            description: "Marked order {$order->order_number} as ready for pickup.",

            subject: $order,

            oldValues: $oldValues,

            newValues: [
                'fulfillment_status' => $order->fulfillment_status,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Student Notification
        |--------------------------------------------------------------------------
        */

        $student =
            $order->student;

        $studentUser =
            $student?->user;

        if (
            $studentUser !== null
        ) {
            $notificationService->send(
                user: $studentUser,

                type: Notification::TYPE_ORDER_READY_FOR_PICKUP,

                title: 'Order Ready for Pickup',

                message: "Order {$order->order_number} "
                    .'is ready for pickup at PROWARE. '
                    .'Your order has already been verified by a PROWARE Specialist. '
                    .'Please proceed to the claiming counter.',

                link: "/student/orders/{$order->id}",

                data: [
                    'order_id' => $order->id,

                    'order_number' => $order->order_number,

                    'student_id' => $student?->id,

                    'student_user_id' => $studentUser->id,

                    'payment_status' => $order->payment_status,

                    'fulfillment_status' => $order->fulfillment_status,
                ],
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'specialist.orders.show',
                [
                    'order' => $order->id,
                ],
            )
            ->with(
                'success',
                "Order {$order->order_number} is now ready for pickup.",
            );
    }

    /**
     * Release paid merchandise to the student.
     */
    public function release(
        Request $request,
        Order $order,
        NotificationService $notificationService,
        StockAlertService $stockAlertService,
    ): RedirectResponse {
        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Capture Previous State
        |--------------------------------------------------------------------------
        */

        $oldValues = [
            'fulfillment_status' => $order
                ->fulfillment_status,

            'released_at' => $order
                ->released_at
                ?->toDateTimeString(),
        ];

        /*
        |--------------------------------------------------------------------------
        | Release Transaction
        |--------------------------------------------------------------------------
        |
        | Inventory changes and StockMovement records are committed together.
        | If any part fails, the complete release is rolled back.
        |
        */

        $affectedInventoryIds =
            DB::transaction(
                function () use (
                    $order,
                    $user,
                ): array {
                    /*
                    |--------------------------------------------------------------------------
                    | Lock Order
                    |--------------------------------------------------------------------------
                    */

                    $lockedOrder =
                        Order::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $order->id,
                            );

                    /*
                    |--------------------------------------------------------------------------
                    | Release QR Verification
                    |--------------------------------------------------------------------------
                    |
                    | Merchandise cannot leave PROWARE unless
                    | the Release QR was successfully verified.
                    |
                    */

                    if (
                        $lockedOrder
                            ->release_qr_used_at
                        === null
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This order has not been verified using its Release QR.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Payment Validation
                    |--------------------------------------------------------------------------
                    */

                    if (
                        ! $lockedOrder
                            ->isPaid()
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This order cannot be released until payment is confirmed by the cashier.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Already Released
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $lockedOrder
                            ->isReleased()
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This order has already been released.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Cancelled
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $lockedOrder
                            ->isCancelled()
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'A cancelled order cannot be released.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Ready For Pickup Validation
                    |--------------------------------------------------------------------------
                    |
                    | Physical merchandise can only leave PROWARE
                    | after the Specialist has marked the order ready.
                    |
                    */

                    if (
                        $lockedOrder
                            ->fulfillment_status
                        !== Order::FULFILLMENT_READY
                    ) {
                        throw ValidationException::withMessages([
                            'order' => 'This order must be marked Ready for Pickup before the merchandise can be released.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Lock Order Items
                    |--------------------------------------------------------------------------
                    */

                    $items =
                        OrderItem::query()
                            ->where(
                                'order_id',
                                $lockedOrder->id,
                            )
                            ->lockForUpdate()
                            ->get();

                    $inventoryIds = [];

                    /*
                    |--------------------------------------------------------------------------
                    | Release Inventory
                    |--------------------------------------------------------------------------
                    */

                    foreach (
                        $items as $item
                    ) {
                        /*
                         * Preorder / waiting-list items do not deduct
                         * normal physical inventory here.
                         */
                        if (
                            $item->item_type
                            !==
                            OrderItem::TYPE_ORDER
                        ) {
                            continue;
                        }

                        $inventory =
                            Inventory::query()
                                ->where(
                                    'product_variant_id',
                                    $item
                                        ->product_variant_id,
                                )
                                ->lockForUpdate()
                                ->first();

                        /*
                        |--------------------------------------------------------------------------
                        | Inventory Must Exist
                        |--------------------------------------------------------------------------
                        */

                        if (
                            ! $inventory
                        ) {
                            throw ValidationException::withMessages([
                                'inventory' => "Inventory could not be found for {$item->variant_name}.",
                            ]);
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Reserved Stock Validation
                        |--------------------------------------------------------------------------
                        */

                        if (
                            (int)
                            $inventory
                                ->quantity_reserved
                            <
                            (int)
                            $item
                                ->quantity
                        ) {
                            throw ValidationException::withMessages([
                                'inventory' => "Reserved stock is insufficient for {$item->variant_name}.",
                            ]);
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Physical Stock Validation
                        |--------------------------------------------------------------------------
                        */

                        if (
                            (int)
                            $inventory
                                ->quantity_on_hand
                            <
                            (int)
                            $item
                                ->quantity
                        ) {
                            throw ValidationException::withMessages([
                                'inventory' => "Physical stock is insufficient for {$item->variant_name}.",
                            ]);
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | Calculate Final Inventory
                        |--------------------------------------------------------------------------
                        */

                        $quantityBefore =
                            (int)
                            $inventory
                                ->quantity_on_hand;

                        $releasedQuantity =
                            (int)
                            $item
                                ->quantity;

                        $newQuantityOnHand =
                            $quantityBefore
                            -
                            $releasedQuantity;

                        $newQuantityReserved =
                            (int)
                            $inventory
                                ->quantity_reserved
                            -
                            $releasedQuantity;

                        /*
                        |--------------------------------------------------------------------------
                        | Update Inventory
                        |--------------------------------------------------------------------------
                        */

                        $inventory->update([
                            'quantity_on_hand' => $newQuantityOnHand,

                            'quantity_reserved' => $newQuantityReserved,
                        ]);

                        /*
                        |--------------------------------------------------------------------------
                        | Record Physical Stock Out
                        |--------------------------------------------------------------------------
                        |
                        | Physical merchandise has now left PROWARE.
                        | A negative quantity_change represents Stock Out.
                        |
                        */

                        StockMovement::create([
                            'inventory_id' => $inventory->id,

                            'product_variant_id' => $item
                                ->product_variant_id,

                            'performed_by' => $user->id,

                            'movement_type' => StockMovement::TYPE_RELEASE,

                            'quantity_change' => -$releasedQuantity,

                            'quantity_before' => $quantityBefore,

                            'quantity_after' => $newQuantityOnHand,

                            'supplier_reference_number' => null,

                            'notes' => "Released for order {$lockedOrder->order_number}.",
                        ]);

                        /*
                        |--------------------------------------------------------------------------
                        | Remember Changed Inventory
                        |--------------------------------------------------------------------------
                        */

                        $inventoryIds[] =
                            $inventory->id;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Mark Order Released
                    |--------------------------------------------------------------------------
                    */

                    $lockedOrder->update([
                        'fulfillment_status' => Order::FULFILLMENT_RELEASED,

                        'released_at' => now(),
                    ]);

                    return array_values(
                        array_unique(
                            $inventoryIds,
                        ),
                    );
                },
                attempts: 3,
            );

        /*
        |--------------------------------------------------------------------------
        | Reload Final Order
        |--------------------------------------------------------------------------
        */

        $order =
            Order::query()
                ->with([
                    'student.user',
                ])
                ->findOrFail(
                    $order->id,
                );

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: 'released',

            module: 'orders',

            description: "Released merchandise for order {$order->order_number}.",

            subject: $order,

            oldValues: $oldValues,

            newValues: [
                'fulfillment_status' => $order
                    ->fulfillment_status,

                'released_at' => $order
                    ->released_at
                    ?->toDateTimeString(),
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Student Notification
        |--------------------------------------------------------------------------
        */

        $student =
            $order->student;

        $studentUser =
            $student
                ?->user;

        if (
            $studentUser
            !== null
        ) {
            $notificationService->send(
                user: $studentUser,

                type: Notification::TYPE_ORDER_RELEASED,

                title: 'Order Released',

                message: "Order {$order->order_number} "
                    .'has been successfully released by PROWARE. '
                    .'Your merchandise has been claimed.',

                link: "/student/orders/{$order->id}",

                data: [
                    'order_id' => $order->id,

                    'order_number' => $order
                        ->order_number,

                    'student_id' => $student
                        ?->id,

                    'student_user_id' => $studentUser
                        ->id,

                    'payment_status' => $order
                        ->payment_status,

                    'fulfillment_status' => $order
                        ->fulfillment_status,

                    'released_at' => $order
                        ->released_at
                        ?->toDateTimeString(),
                ],
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Stock Threshold / Out-Of-Stock Alerts
        |--------------------------------------------------------------------------
        |
        | Check every inventory record affected by this release.
        | This happens only after the transaction succeeds.
        |
        */

        if (
            $affectedInventoryIds
            !== []
        ) {
            $affectedInventories =
                Inventory::query()
                    ->whereIn(
                        'id',
                        $affectedInventoryIds,
                    )
                    ->with([
                        'productVariant.product',
                    ])
                    ->get();

            foreach (
                $affectedInventories as $inventory
            ) {
                $stockAlertService->check(
                    $inventory,
                );
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Response
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'specialist.orders.index',
            )
            ->with(
                'success',
                "Order {$order->order_number} has been released successfully.",
            );

    }
}
