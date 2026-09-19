<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\CashierSalesSummaryService;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CashierOrderController extends Controller
{
    public function __construct(
        private readonly CashierSalesSummaryService $salesSummary,
    ) {}

    /**
     * Cashier dashboard.
     */
    public function dashboard(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'cashier',
            403,
        );

        $pendingPayments =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PENDING,
                )
                ->count();

        /*
         * Shared with the Sales report's "Today" card so the
         * two never disagree.
         */
        $todaySales =
            $this->salesSummary->today();

        /*
         * Oldest-first: the orders that have been
         * waiting the longest need attention first,
         * matching the same convention already used
         * by the Specialist Waiting List. Shown inside
         * the "Waiting for Payment" popup, not as a
         * standalone page section.
         */
        $pendingOrders =
            Order::query()
                ->with([
                    'student.user',
                ])
                ->where(
                    'payment_status',
                    Order::PAYMENT_PENDING,
                )
                ->oldest()
                ->limit(5)
                ->get()
                ->map(
                    function (
                        Order $order,
                    ): array {
                        return [
                            'id' => $order->id,

                            'order_number' => $order->order_number,

                            'student_name' => $order
                                ->student
                                ?->user
                                ?->name
                                ?? 'Unknown Student',

                            'total' => (string)
                                $order->total,

                            'created_at' => $order
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                )
                ->values();

        /*
         * What the cashier just finished, complementing
         * the "still to do" popup above with "already done".
         */
        $recentlyConfirmed =
            Order::query()
                ->with([
                    'student.user',
                ])
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereNotNull(
                    'paid_at',
                )
                ->latest('paid_at')
                ->limit(5)
                ->get()
                ->map(
                    function (
                        Order $order,
                    ): array {
                        return [
                            'id' => $order->id,

                            'order_number' => $order->order_number,

                            'student_name' => $order
                                ->student
                                ?->user
                                ?->name
                                ?? 'Unknown Student',

                            'total' => (string)
                                $order->total,

                            'paid_at' => $order
                                ->paid_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                )
                ->values();

        return Inertia::render(
            'cashier/Dashboard',
            [
                'pendingPayments' => $pendingPayments,

                'todaySales' => $todaySales,

                'pendingOrders' => $pendingOrders,

                'recentlyConfirmed' => $recentlyConfirmed,
            ],
        );
    }

    /**
     * Orders waiting for payment.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->role === 'cashier',
            403,
        );

        $orders =
            Order::query()
                ->with([
                    'student.user',
                    'items.productVariant.product',
                ])
                ->where(
                    'payment_status',
                    Order::PAYMENT_PENDING,
                )
                ->latest()
                ->get()
                ->map(
                    function (
                        Order $order,
                    ): array {
                        /*
                         * One representative image for the
                         * card thumbnail. An order can contain
                         * several different products, so this
                         * shows the first item's image only.
                         */
                        $product =
                            $order->items
                                ->first()
                                ?->productVariant
                                ?->product;

                        $imageUrl =
                            $product?->image_path
                                ? '/storage/'
                                    .ltrim(
                                        $product->image_path,
                                        '/',
                                    )
                                : null;

                        return [
                            'id' => $order->id,

                            'order_number' => $order->order_number,

                            'order_type' => $order->order_type,

                            'payment_status' => $order->payment_status,

                            'fulfillment_status' => $order
                                ->fulfillment_status,

                            'total' => (string)
                                $order->total,

                            'total_quantity' => $order
                                ->totalQuantity(),

                            'created_at' => $order
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),

                            'image_url' => $imageUrl,

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
                        ];
                    },
                )
                ->values();

        return Inertia::render(
            'cashier/Orders/Index',
            [
                'orders' => $orders,
            ],
        );
    }

    /**
     * Cashier payment history.
     *
     * Read-only list of confirmed PROWARE payments
     * for transaction tracing.
     */
    public function paymentHistory(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
                && $user->role === 'cashier',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        $search = trim(
            (string) $request->query(
                'search',
                '',
            ),
        );

        $method = trim(
            (string) $request->query(
                'method',
                '',
            ),
        );

        $date = trim(
            (string) $request->query(
                'date',
                '',
            ),
        );

        /*
        |--------------------------------------------------------------------------
        | Confirmed Payments
        |--------------------------------------------------------------------------
        */

        $query = Order::query()
            ->with([
                'student.user',
                'items',
            ])
            ->where(
                'payment_status',
                Order::PAYMENT_PAID,
            )
            ->whereNotNull(
                'transaction_number',
            )
            ->whereNotNull(
                'paid_at',
            );

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        |
        | Supports:
        | - Full transaction number
        | - Short transaction reference
        | - Order number
        | - Student name
        | - Student ID
        |
        */

        if ($search !== '') {
            $query->where(
                function ($paymentQuery) use (
                    $search,
                ): void {
                    $paymentQuery
                        ->where(
                            'transaction_number',
                            'ilike',
                            "%{$search}%",
                        )
                        ->orWhere(
                            'order_number',
                            'ilike',
                            "%{$search}%",
                        )
                        ->orWhereHas(
                            'student',
                            function (
                                $studentQuery,
                            ) use ($search): void {
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
                                        ) use ($search): void {
                                            $userQuery->where(
                                                'name',
                                                'ilike',
                                                "%{$search}%",
                                            );
                                        },
                                    );
                            },
                        );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Payment Method
        |--------------------------------------------------------------------------
        */

        if (
            in_array(
                $method,
                [
                    'cash',
                    'gcash',
                    'maya',
                ],
                true,
            )
        ) {
            $query->where(
                'payment_method',
                $method,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Date Filter
        |--------------------------------------------------------------------------
        */

        if ($date === 'today') {
            $query->whereDate(
                'paid_at',
                today(),
            );
        }

        if ($date === 'week') {
            $query->whereBetween(
                'paid_at',
                [
                    now()->startOfWeek(),
                    now()->endOfWeek(),
                ],
            );
        }

        if ($date === 'month') {
            $query
                ->whereYear(
                    'paid_at',
                    now()->year,
                )
                ->whereMonth(
                    'paid_at',
                    now()->month,
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Payment History
        |--------------------------------------------------------------------------
        */

        $payments = $query
            ->latest('paid_at')
            ->paginate(20)
            ->withQueryString();

        /*
        |--------------------------------------------------------------------------
        | Cashiers Who Confirmed Payments
        |--------------------------------------------------------------------------
        */

        $cashierIds = $payments
            ->getCollection()
            ->pluck(
                'payment_confirmed_by',
            )
            ->filter()
            ->unique()
            ->values();

        $cashiers = User::query()
            ->whereIn(
                'id',
                $cashierIds,
            )
            ->get([
                'id',
                'name',
            ])
            ->keyBy('id');

        /*
        |--------------------------------------------------------------------------
        | Transform Payment Records
        |--------------------------------------------------------------------------
        */

        $payments->through(
            function (
                Order $order,
            ) use ($cashiers): array {
                $cashier =
                    $cashiers->get(
                        $order
                            ->payment_confirmed_by,
                    );

                /*
                 * Short human-readable reference.
                 *
                 * Example:
                 * TXN-20260828-000044
                 * becomes:
                 * #000044
                 */
                $shortReference =
                    $order->transaction_number
                        ? '#'
                            .substr(
                                $order
                                    ->transaction_number,
                                -6,
                            )
                        : 'N/A';

                return [
                    'id' => $order->id,

                    'transaction_number' => $order
                        ->transaction_number,

                    'short_reference' => $shortReference,

                    'order_number' => $order
                        ->order_number,

                    'total' => (string)
                        $order->total,

                    'payment_method' => $order
                        ->payment_method,

                    'payment_reference' => $order
                        ->payment_reference,

                    'paid_at' => $order
                        ->paid_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    /*
                    |--------------------------------------------------------------------------
                    | Fulfillment Timeline
                    |--------------------------------------------------------------------------
                    |
                    | Lets the Details popup show everything that
                    | has happened to this transaction so far, not
                    | just the payment step.
                    |
                    */

                    'created_at' => $order
                        ->created_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'fulfillment_status' => $order
                        ->fulfillment_status,

                    'ready_for_release_at' => $order
                        ->ready_for_release_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'released_at' => $order
                        ->released_at
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

                    'confirmed_by' => [
                        'name' => $cashier?->name
                            ?? 'Unknown Cashier',
                    ],

                    /*
                    |--------------------------------------------------------------------------
                    | Items Purchased
                    |--------------------------------------------------------------------------
                    */

                    'items' => $order
                        ->items
                        ->map(
                            fn ($item): array => [
                                'id' => $item->id,

                                'product_name' => $item
                                    ->product_name,

                                'variant_name' => $item
                                    ->variant_name,

                                'quantity' => $item
                                    ->quantity,

                                'unit_price' => (string)
                                    $item->unit_price,

                                'line_total' => (string)
                                    $item->line_total,
                            ],
                        )
                        ->values(),
                ];
            },
        );

        return Inertia::render(
            'cashier/Payments/Index',
            [
                'payments' => $payments,

                'filters' => [
                    'search' => $search,

                    'method' => $method,

                    'date' => $date,
                ],
            ],
        );
    }

    /**
     * Open an order using its one-time Payment QR.
     */
    public function scan(
        Request $request,
        string $token,
    ): RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Cashier Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->role === 'cashier',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Find Payment QR
        |--------------------------------------------------------------------------
        |
        | Cashiers use qr_token.
        |
        | release_qr_token belongs only to
        | the Specialist fulfillment process.
        |
        */

        $order =
            Order::query()
                ->where(
                    'qr_token',
                    $token,
                )
                ->first();

        /*
        |--------------------------------------------------------------------------
        | Invalid QR
        |--------------------------------------------------------------------------
        */

        if (! $order) {
            return redirect()
                ->route(
                    'cashier.orders.index',
                )
                ->with(
                    'error',
                    'Invalid Payment QR. This QR code does not belong to a valid PROWARE order.',
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
                    'cashier.orders.index',
                )
                ->with(
                    'error',
                    "Order {$order->order_number} has been cancelled. This Payment QR can no longer be used.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Already Paid
        |--------------------------------------------------------------------------
        */

        if (
            $order->isPaid()
        ) {
            return redirect()
                ->route(
                    'cashier.orders.index',
                )
                ->with(
                    'error',
                    "Payment QR Already Used. Order {$order->order_number} has already been paid.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | One-Time Payment QR
        |--------------------------------------------------------------------------
        */

        if (
            $order->payment_qr_used_at
            !== null
        ) {
            return redirect()
                ->route(
                    'cashier.orders.index',
                )
                ->with(
                    'error',
                    "Payment QR Already Used. Order {$order->order_number} has already been verified by a PROWARE Cashier.",
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Consume Payment QR
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

                if (
                    $lockedOrder
                        ->payment_qr_used_at
                    !== null
                ) {
                    throw ValidationException::withMessages([
                        'qr' => 'This Payment QR has already been used.',
                    ]);
                }

                if (
                    $lockedOrder->isPaid()
                ) {
                    throw ValidationException::withMessages([
                        'qr' => 'Payment has already been confirmed for this order.',
                    ]);
                }

                if (
                    $lockedOrder->isCancelled()
                ) {
                    throw ValidationException::withMessages([
                        'qr' => 'This order has been cancelled.',
                    ]);
                }

                $lockedOrder->update([
                    'payment_qr_used_at' => now(),
                ]);
            },
            attempts: 3,
        );

        /*
        |--------------------------------------------------------------------------
        | Audit Payment QR Scan
        |--------------------------------------------------------------------------
        */

        $order->refresh();

        AuditLogger::log(
            request: $request,

            action: 'payment_qr_scanned',

            module: 'orders',

            description: "Payment QR verified for order {$order->order_number} by Cashier {$user->name}.",

            subject: $order,

            newValues: [
                'payment_qr_used_at' => $order
                    ->payment_qr_used_at
                    ?->toDateTimeString(),

                'verified_by' => $user->id,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Open Cashier Order
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'cashier.orders.show',
                $order,
            )
            ->with(
                'success',
                "Payment QR verified successfully for order {$order->order_number}.",
            );
    }

    /**
     * Cashier order verification page.
     */
    public function show(
        Request $request,
        Order $order,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'cashier',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Relationships
        |--------------------------------------------------------------------------
        |
        | Product is loaded so the Cashier can see the exact merchandise image.
        |
        */

        $order->load([
            'student.user',
            'canceller',
            'items.productVariant.product',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Render Cashier Order Verification
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'cashier/Orders/Show',
            [
                'order' => [
                    'id' => $order->id,

                    'order_number' => $order->order_number,

                    'order_type' => $order->order_type,

                    'payment_status' => $order->payment_status,

                    'fulfillment_status' => $order->fulfillment_status,

                    'subtotal' => (string) $order->subtotal,

                    'total' => (string) $order->total,

                    'total_quantity' => $order->totalQuantity(),

                    /*
                    |--------------------------------------------------------------------------
                    | Payment Verification
                    |--------------------------------------------------------------------------
                    */

                    'payment_qr_verified' => $order->payment_qr_used_at !== null,

                    'payment_method' => $order->payment_method,

                    'payment_reference' => $order->payment_reference,

                    'transaction_number' => $order->transaction_number,

                    /*
                    |--------------------------------------------------------------------------
                    | Dates
                    |--------------------------------------------------------------------------
                    */

                    'created_at' => $order->created_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'paid_at' => $order->paid_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'ready_for_release_at' => $order->ready_for_release_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'released_at' => $order->released_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'cancelled_at' => $order->cancelled_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'can_cancel' => $order
                        ->canBeCancelledByStaff(),

                    'cancel_url' => route(
                        'cashier.orders.cancel',
                        $order,
                        false,
                    ),

                    'cancellation' => $order
                        ->cancellationSummary(),

                    /*
                |--------------------------------------------------------------------------
                | Student
                |--------------------------------------------------------------------------
                */

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

                    /*
                |--------------------------------------------------------------------------
                | Ordered Items
                |--------------------------------------------------------------------------
                */

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

                                    'quantity' => $item
                                        ->quantity,

                                    'unit_price' => (string)
                                    $item
                                        ->unit_price,

                                    'line_total' => (string)
                                    $item
                                        ->line_total,

                                    'image_url' => $imageUrl,
                                ];
                            },
                        )
                        ->values(),
                ],
            ],
        );
    }

    public function confirmPayment(
        Request $request,
        Order $order,
        NotificationService $notificationService,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'cashier',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Payment QR Verification Required
        |--------------------------------------------------------------------------
        |
        | The Cashier cannot confirm payment unless
        | the student's one-time Payment QR was
        | successfully scanned first.
        |
        */

        if (
            $order->payment_qr_used_at
            === null
        ) {
            return back()->with(
                'error',
                'The Payment QR must be scanned and verified before payment can be confirmed.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent Invalid Payment
        |--------------------------------------------------------------------------
        */

        if ($order->isCancelled()) {
            return back()->with(
                'error',
                'A cancelled order cannot be paid.',
            );
        }

        if ($order->isPaid()) {
            return redirect()
                ->route(
                    'cashier.orders.receipt',
                    $order,
                )
                ->with(
                    'success',
                    'Payment has already been confirmed for this order.',
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Use Student Selected Payment Method
        |--------------------------------------------------------------------------
        |
        | The cashier does NOT select or type
        | the payment information anymore.
        |
        | This information was already supplied
        | during Student checkout.
        |
        */

        $paymentMethod =
            $order->payment_method;

        $paymentReference =
            $order->payment_reference;

        /*
        |--------------------------------------------------------------------------
        | Validate Stored Payment Information
        |--------------------------------------------------------------------------
        */

        if (
            ! in_array(
                $paymentMethod,
                [
                    'cash',
                    'gcash',
                    'maya',
                ],
                true,
            )
        ) {
            return back()->with(
                'error',
                'This order does not have a valid payment method. The student must select a payment method during checkout.',
            );
        }

        /*
         * Online payments must already have
         * a Student-submitted reference number.
         */
        if (
            in_array(
                $paymentMethod,
                [
                    'gcash',
                    'maya',
                ],
                true,
            )
            && ! $paymentReference
        ) {
            return back()->with(
                'error',
                'This online payment does not have a transaction reference number.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Load Student
        |--------------------------------------------------------------------------
        */

        $order->loadMissing([
            'student.user',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Previous State
        |--------------------------------------------------------------------------
        */

        $oldValues = [
            'payment_status' => $order->payment_status,

            'paid_at' => $order
                ->paid_at
                ?->toDateTimeString(),

            'payment_method' => $order
                ->payment_method,

            'payment_reference' => $order
                ->payment_reference,
        ];

        /*
        |--------------------------------------------------------------------------
        | Transaction Number
        |--------------------------------------------------------------------------
        */

        $transactionNumber =
            'TXN-'
            .now()->format(
                'Ymd',
            )
            .'-'
            .str_pad(
                (string) $order->id,
                6,
                '0',
                STR_PAD_LEFT,
            );

        /*
        |--------------------------------------------------------------------------
        | Generate New Release QR
        |--------------------------------------------------------------------------
        */

        do {
            $releaseQrToken =
                Str::random(
                    64,
                );
        } while (
            Order::query()
                ->where(
                    'release_qr_token',
                    $releaseQrToken,
                )
                ->exists()
        );

        /*
        |--------------------------------------------------------------------------
        | Confirm Payment
        |--------------------------------------------------------------------------
        |
        | Notice:
        |
        | payment_method and payment_reference
        | are NOT changed here.
        |
        | We preserve exactly what the Student
        | submitted during checkout.
        |
        | Locked and re-checked inside the transaction so two
        | concurrent confirmations (double-click, duplicate
        | network retry, two cashier tabs) can never both pass
        | the isPaid() guard and both write — which previously
        | produced duplicate audit entries and duplicate
        | notifications to the student and every specialist.
        */

        $confirmed =
            DB::transaction(
                function () use (
                    $order,
                    $user,
                    $transactionNumber,
                    $releaseQrToken,
                ): bool {
                    $lockedOrder =
                        Order::query()
                            ->lockForUpdate()
                            ->findOrFail(
                                $order->id,
                            );

                    if (
                        $lockedOrder->isCancelled()
                    ) {
                        throw ValidationException::withMessages([
                            'payment' => 'A cancelled order cannot be paid.',
                        ]);
                    }

                    if (
                        $lockedOrder->isPaid()
                    ) {
                        return false;
                    }

                    $lockedOrder->forceFill([
                        'payment_status' => Order::PAYMENT_PAID,

                        'paid_at' => now(),

                        /*
                         * Cashier responsible for
                         * verifying/receiving payment.
                         */
                        'payment_confirmed_by' => $user->id,

                        'transaction_number' => $transactionNumber,

                        /*
                         * Generate Release QR.
                         */
                        'release_qr_token' => $releaseQrToken,

                        'release_qr_used_at' => null,
                    ])->save();

                    /*
                    |--------------------------------------------------------------------------
                    | Advance Paid Preorder Items
                    |--------------------------------------------------------------------------
                    |
                    | A preorder reaches this point only after the Cashier
                    | successfully confirms payment. Its stock was already
                    | reserved earlier, when it first became "ready", so paying
                    | for it is the only remaining gate before it should behave
                    | exactly like a normal order item — including at release,
                    | where only item_type = TYPE_ORDER is ever scanned out. This
                    | used to require a separate manual "Process" step on the
                    | admin Waiting List page; promoting item_type here removes
                    | that gap so a paid preorder is never left unreleasable
                    | just because nobody remembered to click a button.
                    */

                    $lockedOrder->items()
                        ->where(
                            'item_type',
                            OrderItem::TYPE_PREORDER,
                        )
                        ->where(
                            'preorder_status',
                            OrderItem::PREORDER_STATUS_READY,
                        )
                        ->update([
                            'item_type' => OrderItem::TYPE_ORDER,

                            'preorder_status' => OrderItem::PREORDER_STATUS_PAID,

                            'preorder_paid_at' => $lockedOrder->paid_at,
                        ]);

                    return true;
                },
                attempts: 3,
            );

        $order->refresh();

        /*
        |--------------------------------------------------------------------------
        | Already Confirmed Concurrently
        |--------------------------------------------------------------------------
        |
        | Another request won the race and confirmed this order
        | first. Nothing more to do — the audit log entry and
        | notifications below belong to whichever request actually
        | performed the confirmation, not to this one.
        */

        if (! $confirmed) {
            return redirect()
                ->route(
                    'cashier.orders.receipt',
                    $order,
                )
                ->with(
                    'success',
                    'Payment has already been confirmed for this order.',
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: 'payment_confirmed',

            module: 'orders',

            description: "Confirmed payment for order {$order->order_number}. "
                .'Payment method: '
                .strtoupper(
                    $paymentMethod,
                )
                .'. Transaction '
                ."{$transactionNumber} generated.",

            subject: $order,

            oldValues: [
                'payment_status' => $oldValues[
                        'payment_status'
                    ],

                'paid_at' => $oldValues[
                        'paid_at'
                    ],

                'payment_method' => $oldValues[
                        'payment_method'
                    ],

                'payment_reference' => $oldValues[
                        'payment_reference'
                    ],
            ],

            newValues: [
                'payment_status' => $order
                    ->payment_status,

                'paid_at' => $order
                    ->paid_at
                    ?->toDateTimeString(),

                'payment_method' => $order
                    ->payment_method,

                'payment_reference' => $order
                    ->payment_reference,

                'transaction_number' => $order
                    ->transaction_number,

                'payment_confirmed_by' => $user->id,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Notify Student
        |--------------------------------------------------------------------------
        */

        $studentUser =
            $order
                ->student
                ?->user;

        if ($studentUser) {
            $notificationService->send(
                user: $studentUser,

                type: Notification::TYPE_PAYMENT_CONFIRMED,

                title: 'Payment Confirmed',

                message: "Payment for order {$order->order_number} "
                    .'has been confirmed. Your digital receipt '
                    .'and Release QR are now available.',

                link: "/student/orders/{$order->id}/receipt",

                data: [
                    'order_id' => $order->id,

                    'order_number' => $order
                        ->order_number,

                    'transaction_number' => $order
                        ->transaction_number,

                    'payment_method' => $order
                        ->payment_method,

                    'payment_reference' => $order
                        ->payment_reference,

                    'payment_status' => $order
                        ->payment_status,
                ],
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Notify Specialist
        |--------------------------------------------------------------------------
        */

        $notificationService
            ->specialists(
                type: Notification::TYPE_ORDER_READY_FOR_FULFILLMENT,

                title: 'Paid Order Ready for Fulfillment',

                message: "Order {$order->order_number} "
                    .'has been paid and now has '
                    .'a Release QR.',

                link: '/specialist/orders',

                data: [
                    'order_id' => $order->id,

                    'order_number' => $order
                        ->order_number,

                    'transaction_number' => $order
                        ->transaction_number,

                    'payment_method' => $order
                        ->payment_method,

                    'payment_status' => $order
                        ->payment_status,

                    'fulfillment_status' => $order
                        ->fulfillment_status,
                ],
            );

        /*
        |--------------------------------------------------------------------------
        | Open Receipt
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'cashier.orders.receipt',
                $order,
            )
            ->with(
                'success',
                'Payment confirmed. Receipt generated successfully.',
            );
    }
}
