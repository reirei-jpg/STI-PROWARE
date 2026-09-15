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
     * Display the Admin Reports dashboard.
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
                    'today',
                    'week',
                    'month',
                    'custom',
                ],
                true,
            )
        ) {
            $period =
                'month';
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
        | Paid Orders Query
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

        /*
        |--------------------------------------------------------------------------
        | Paid Orders
        |--------------------------------------------------------------------------
        */

        $paidOrders =
            (clone $paidOrderQuery)
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Total Sales
        |--------------------------------------------------------------------------
        */

        $totalSales =
            (clone $paidOrderQuery)
                ->sum(
                    'total',
                );

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

        /*
        |--------------------------------------------------------------------------
        | Stock Received
        |--------------------------------------------------------------------------
        */

        $totalStockReceived =
            StockMovement::query()
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
        | Inventory Status
        |--------------------------------------------------------------------------
        |
        | These are current inventory conditions, so they are NOT limited by
        | report date range.
        |
        */

        $inventories =
            Inventory::query()
                ->get();

        $lowStock =
            $inventories
                ->filter(
                    function (
                        Inventory $inventory,
                    ): bool {
                        $available =
                            max(
                                0,
                                (int)
                                $inventory
                                    ->quantity_on_hand
                                -
                                (int)
                                $inventory
                                    ->quantity_reserved,
                            );

                        return $available > 0
                            &&
                            $available <=
                            (int)
                            $inventory
                                ->reorder_level;
                    },
                )
                ->count();

        $outOfStock =
            $inventories
                ->filter(
                    function (
                        Inventory $inventory,
                    ): bool {
                        $available =
                            max(
                                0,
                                (int)
                                $inventory
                                    ->quantity_on_hand
                                -
                                (int)
                                $inventory
                                    ->quantity_reserved,
                            );

                        return $available <= 0;
                    },
                )
                ->count();

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
                    function (
                        Order $order,
                    ): array {
                        return [
                            'id' => $order->id,

                            'order_number' => $order
                                ->order_number,

                            'student_name' => $order
                                ->student
                                ?->user
                                ?->name
                                ?? 'Unknown Student',

                            'total' => (string)
                                $order->total,

                            'payment_status' => $order
                                ->payment_status,

                            'fulfillment_status' => $order
                                ->fulfillment_status,

                            'paid_at' => $order
                                ->paid_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
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
                    function (
                        StockMovement $movement,
                    ): array {
                        $variant =
                            $movement
                                ->productVariant;

                        $product =
                            $variant
                                ?->product;

                        return [
                            'id' => $movement->id,

                            'receipt_number' => $movement
                                ->receipt_number,

                            'product_code' => $product
                                ?->code
                                ?? 'N/A',

                            'product_name' => $product
                                ?->name
                                ?? 'Unknown Product',

                            'variant_name' => $variant
                                ?->variant_name
                                ?? 'Standard',

                            'quantity' => (int)
                                $movement
                                    ->quantity_change,

                            'received_by' => $movement
                                ->performer
                                ?->name
                                ?? 'Unknown Staff',

                            'created_at' => $movement
                                ->created_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Top-Selling Merchandise
        |--------------------------------------------------------------------------
        |
        | Only order items belonging to PAID orders inside the selected
        | report period are included.
        |
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
                    fn (
                        OrderItem $item,
                    ): array => [
                        'product_code' => $item->product_code,

                        'product_name' => $item->product_name,

                        'units_sold' => (int)
                            $item->units_sold,

                        'total_sales' => (float)
                            $item->total_sales,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Sales By Variant
        |--------------------------------------------------------------------------
        |
        | Shows the performance of each exact product variant.
        |
        | Only PAID orders inside the selected reporting period are counted.
        |
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
                    fn (
                        OrderItem $item,
                    ): array => [
                        'product_code' => $item->product_code,

                        'product_name' => $item->product_name,

                        'variant_name' => $item->variant_name
                            ?: 'Standard',

                        'sku' => $item->sku,

                        'units_sold' => (int)
                            $item->units_sold,

                        'total_sales' => (float)
                            $item->total_sales,
                    ],
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
                        ->toDateString(),

                    'end_date' => $endDate
                        ->toDateString(),
                ],

                'periodLabel' => $startDate->format(
                    'M d, Y',
                )
                    .' - '
                    .$endDate->format(
                        'M d, Y',
                    ),

                'summary' => [
                    'total_sales' => (float)
                        $totalSales,

                    'paid_orders' => $paidOrders,

                    'pending_payments' => $pendingPayments,

                    'released_orders' => $releasedOrders,

                    'total_stock_received' => (int)
                        $totalStockReceived,

                    'low_stock' => $lowStock,

                    'out_of_stock' => $outOfStock,
                ],

                'recentOrders' => $recentOrders,

                'recentReceipts' => $recentReceipts,
                'topSellingProducts' => $topSellingProducts,

                'salesByVariant' => $salesByVariant,
            ],
        );
    }

    /**
     * Resolve report start and end dates.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolveDateRange(
        Request $request,
        string $period,
    ): array {
        $now =
            now();

        if (
            $period === 'today'
        ) {
            return [
                $now
                    ->copy()
                    ->startOfDay(),

                $now
                    ->copy()
                    ->endOfDay(),
            ];
        }

        if (
            $period === 'week'
        ) {
            return [
                $now
                    ->copy()
                    ->startOfWeek(),

                $now
                    ->copy()
                    ->endOfWeek(),
            ];
        }

        if (
            $period === 'custom'
        ) {
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
                    $validated[
                        'start_date'
                    ],
                )->startOfDay(),

                Carbon::parse(
                    $validated[
                        'end_date'
                    ],
                )->endOfDay(),
            ];
        }

        return [
            $now
                ->copy()
                ->startOfMonth(),

            $now
                ->copy()
                ->endOfMonth(),
        ];
    }
}
