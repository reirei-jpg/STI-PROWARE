<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Philippine calendar day boundaries, matching
     * AdminDashboardController. The database/application
     * remains UTC; only display and "day" boundaries
     * follow the Philippine calendar.
     */
    private const DISPLAY_TIMEZONE = 'Asia/Manila';

    /**
     * Display the merged Admin Reports & Analytics dashboard.
     *
     * This replaces the former separate Reports and Analytics
     * pages — same data, one page, one date-range resolver.
     */
    public function index(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Period
        |--------------------------------------------------------------------------
        */

        $period =
            $request->string(
                'period',
            )->toString();

        if (
            ! in_array(
                $period,
                [
                    'overall',
                    'today',
                    'week',
                    'month',
                    'custom',
                ],
                true,
            )
        ) {
            $period =
                'overall';
        }

        /*
        |--------------------------------------------------------------------------
        | Resolve Date Range
        |--------------------------------------------------------------------------
        */

        [
            $startDate,
            $endDate,
        ] =
            $this->resolveDateRange(
                request: $request,

                period: $period,
            );

        /*
        |--------------------------------------------------------------------------
        | Paid Orders
        |--------------------------------------------------------------------------
        */

        $paidOrderQuery =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                );

        $paidOrders =
            (clone $paidOrderQuery)
                ->count();

        $totalSales =
            (float) (clone $paidOrderQuery)
                ->sum(
                    'total',
                );

        $averageOrderValue =
            $paidOrders > 0
                ? round(
                    $totalSales / $paidOrders,
                    2,
                )
                : 0;

        /*
        |--------------------------------------------------------------------------
        | Pending Payments
        |--------------------------------------------------------------------------
        */

        $pendingPayments =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PENDING,
                )
                ->whereBetween(
                    'created_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Released Orders
        |--------------------------------------------------------------------------
        */

        $releasedOrders =
            Order::query()
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_RELEASED,
                )
                ->whereBetween(
                    'released_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->count();

        $fulfillmentRate =
            $paidOrders > 0
                ? round(
                    ($releasedOrders / $paidOrders) * 100,
                    1,
                )
                : 0;

        /*
        |--------------------------------------------------------------------------
        | Units Sold + Stock Received
        |--------------------------------------------------------------------------
        */

        $unitsSold =
            (int) OrderItem::query()
                ->join(
                    'orders',
                    'orders.id',
                    '=',
                    'order_items.order_id',
                )
                ->where(
                    'orders.payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'orders.paid_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->sum(
                    'order_items.quantity',
                );

        $totalStockReceived =
            (int) StockMovement::query()
                ->where(
                    'movement_type',
                    StockMovement::TYPE_RECEIVE,
                )
                ->whereBetween(
                    'created_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->sum(
                    'quantity_change',
                );

        /*
        |--------------------------------------------------------------------------
        | Inventory Health
        |--------------------------------------------------------------------------
        |
        | Current inventory condition — NOT limited by the report
        | date range, since "what's low right now" doesn't have a
        | meaningful historical value.
        */

        $inventoryHealth = [
            'in_stock' => 0,
            'low_stock' => 0,
            'out_of_stock' => 0,
        ];

        foreach (
            Inventory::query()->get() as $inventory
        ) {
            $available =
                max(
                    0,
                    (int) $inventory->quantity_on_hand
                    - (int) $inventory->quantity_reserved,
                );

            $threshold =
                (int) $inventory->reorder_level;

            if ($available <= 0) {
                $inventoryHealth['out_of_stock']++;

                continue;
            }

            if (
                $threshold > 0
                && $available <= $threshold
            ) {
                $inventoryHealth['low_stock']++;

                continue;
            }

            $inventoryHealth['in_stock']++;
        }

        /*
        |--------------------------------------------------------------------------
        | Daily Sales Trend
        |--------------------------------------------------------------------------
        |
        | Bucketed by Philippine calendar day, not the raw UTC
        | date the timestamp happens to fall on.
        */

        /*
         * The Manila timezone name is a hardcoded constant, never
         * user input, so it is safe to inline directly into the
         * raw SQL rather than bind as a parameter — PostgreSQL's
         * GROUP BY validity check requires the SELECT and GROUP BY
         * expressions to be syntactically identical, which two
         * separately-bound parameter placeholders are not.
         */
        $manilaDayExpression =
            "DATE(paid_at AT TIME ZONE 'UTC' AT TIME ZONE '".self::DISPLAY_TIMEZONE."')";

        $salesRows =
            Order::query()
                ->selectRaw(
                    "{$manilaDayExpression} AS sale_date",
                )
                ->selectRaw(
                    'SUM(total) AS total_sales',
                )
                ->selectRaw(
                    'COUNT(*) AS order_count',
                )
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->groupByRaw(
                    $manilaDayExpression,
                )
                ->orderByRaw(
                    $manilaDayExpression,
                )
                ->get();

        $salesTrend =
            $salesRows
                ->map(
                    fn ($row): array => [
                        'date' => Carbon::parse($row->sale_date)
                            ->format('M d'),

                        'full_date' => Carbon::parse($row->sale_date)
                            ->toDateString(),

                        'sales' => (float) $row->total_sales,

                        'orders' => (int) $row->order_count,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Top-Selling Merchandise
        |--------------------------------------------------------------------------
        */

        $topSellingProducts =
            OrderItem::query()
                ->select([
                    'order_items.product_code',
                    'order_items.product_name',
                ])
                ->selectRaw(
                    'SUM(order_items.quantity) AS units_sold',
                )
                ->selectRaw(
                    'SUM(order_items.line_total) AS total_sales',
                )
                ->join(
                    'orders',
                    'orders.id',
                    '=',
                    'order_items.order_id',
                )
                ->where(
                    'orders.payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'orders.paid_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->groupBy(
                    'order_items.product_code',
                    'order_items.product_name',
                )
                ->orderByDesc(
                    'units_sold',
                )
                ->limit(
                    10,
                )
                ->get()
                ->map(
                    fn (OrderItem $item): array => [
                        'product_code' => $item->product_code,

                        'product_name' => $item->product_name,

                        'units_sold' => (int) $item->units_sold,

                        'total_sales' => (float) $item->total_sales,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Sales By Variant
        |--------------------------------------------------------------------------
        */

        $salesByVariant =
            OrderItem::query()
                ->select([
                    'order_items.product_code',
                    'order_items.product_name',
                    'order_items.variant_name',
                    'order_items.sku',
                ])
                ->selectRaw(
                    'SUM(order_items.quantity) AS units_sold',
                )
                ->selectRaw(
                    'SUM(order_items.line_total) AS total_sales',
                )
                ->join(
                    'orders',
                    'orders.id',
                    '=',
                    'order_items.order_id',
                )
                ->where(
                    'orders.payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'orders.paid_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->groupBy(
                    'order_items.product_code',
                    'order_items.product_name',
                    'order_items.variant_name',
                    'order_items.sku',
                )
                ->orderByDesc(
                    'units_sold',
                )
                ->get()
                ->map(
                    fn (OrderItem $item): array => [
                        'product_code' => $item->product_code,

                        'product_name' => $item->product_name,

                        'variant_name' => $item->variant_name
                            ?: 'Standard',

                        'sku' => $item->sku,

                        'units_sold' => (int) $item->units_sold,

                        'total_sales' => (float) $item->total_sales,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Recent Paid Orders
        |--------------------------------------------------------------------------
        */

        $recentOrders =
            Order::query()
                ->with([
                    'student.user',
                ])
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->latest(
                    'paid_at',
                )
                ->limit(
                    10,
                )
                ->get()
                ->map(
                    fn (Order $order): array => [
                        'id' => $order->id,

                        'order_number' => $order->order_number,

                        'student_name' => $order->student
                            ?->user
                            ?->name
                            ?? 'Unknown Student',

                        'total' => (string) $order->total,

                        'payment_status' => $order->payment_status,

                        'fulfillment_status' => $order->fulfillment_status,

                        'paid_at' => $order->paid_at
                            ?->timezone(config('app.display_timezone'))
                            ->format('M d, Y h:i A'),
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Recent Stock Receipts
        |--------------------------------------------------------------------------
        */

        $recentReceipts =
            StockMovement::query()
                ->with([
                    'productVariant.product',
                    'performer:id,name',
                ])
                ->where(
                    'movement_type',
                    StockMovement::TYPE_RECEIVE,
                )
                ->whereBetween(
                    'created_at',
                    [
                        $startDate,
                        $endDate,
                    ],
                )
                ->latest()
                ->limit(
                    10,
                )
                ->get()
                ->map(
                    function (StockMovement $movement): array {
                        $variant =
                            $movement->productVariant;

                        $product =
                            $variant?->product;

                        return [
                            'id' => $movement->id,

                            'receipt_number' => $movement->receipt_number,

                            'product_code' => $product?->code
                                ?? 'N/A',

                            'product_name' => $product?->name
                                ?? 'Unknown Product',

                            'variant_name' => $variant?->variant_name
                                ?? 'Standard',

                            'quantity' => (int) $movement->quantity_change,

                            'received_by' => $movement->performer
                                ?->name
                                ?? 'Unknown Staff',

                            'created_at' => $movement->created_at
                                ?->timezone(config('app.display_timezone'))
                                ->format('M d, Y h:i A'),
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/Reports/Index',
            [
                'filters' => [
                    'period' => $period,

                    'start_date' => $startDate
                        ->copy()
                        ->timezone(self::DISPLAY_TIMEZONE)
                        ->toDateString(),

                    'end_date' => $endDate
                        ->copy()
                        ->timezone(self::DISPLAY_TIMEZONE)
                        ->toDateString(),
                ],

                'periodLabel' => $period === 'overall'
                    ? 'All Time'
                    : $startDate
                        ->copy()
                        ->timezone(self::DISPLAY_TIMEZONE)
                        ->format('M d, Y')
                        .' - '
                        .$endDate
                            ->copy()
                            ->timezone(self::DISPLAY_TIMEZONE)
                            ->format('M d, Y'),

                'summary' => [
                    'total_sales' => $totalSales,

                    'paid_orders' => $paidOrders,

                    'average_order_value' => $averageOrderValue,

                    'pending_payments' => $pendingPayments,

                    'released_orders' => $releasedOrders,

                    'fulfillment_rate' => $fulfillmentRate,

                    'units_sold' => $unitsSold,

                    'total_stock_received' => $totalStockReceived,
                ],

                'inventoryHealth' => $inventoryHealth,

                'salesTrend' => $salesTrend,

                'topSellingProducts' => $topSellingProducts,

                'salesByVariant' => $salesByVariant,

                'recentOrders' => $recentOrders,

                'recentReceipts' => $recentReceipts,
            ],
        );
    }

    /**
     * Resolve report start and end dates as UTC instants
     * representing Philippine calendar-day boundaries.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveDateRange(
        Request $request,
        string $period,
    ): array {
        if ($period === 'overall') {
            return [
                Carbon::createFromTimestamp(0)
                    ->utc(),

                now()->utc(),
            ];
        }

        if ($period === 'today') {
            return [
                now(self::DISPLAY_TIMEZONE)
                    ->startOfDay()
                    ->utc(),

                now(self::DISPLAY_TIMEZONE)
                    ->endOfDay()
                    ->utc(),
            ];
        }

        if ($period === 'week') {
            return [
                now(self::DISPLAY_TIMEZONE)
                    ->startOfWeek()
                    ->utc(),

                now(self::DISPLAY_TIMEZONE)
                    ->endOfWeek()
                    ->utc(),
            ];
        }

        if ($period === 'custom') {
            $validated =
                $request->validate([
                    'start_date' => [
                        'required',
                        'date',
                    ],

                    'end_date' => [
                        'required',
                        'date',
                        'after_or_equal:start_date',
                    ],
                ]);

            return [
                Carbon::parse(
                    $validated['start_date'],
                    self::DISPLAY_TIMEZONE,
                )
                    ->startOfDay()
                    ->utc(),

                Carbon::parse(
                    $validated['end_date'],
                    self::DISPLAY_TIMEZONE,
                )
                    ->endOfDay()
                    ->utc(),
            ];
        }

        return [
            now(self::DISPLAY_TIMEZONE)
                ->startOfMonth()
                ->utc(),

            now(self::DISPLAY_TIMEZONE)
                ->endOfMonth()
                ->utc(),
        ];
    }
}
