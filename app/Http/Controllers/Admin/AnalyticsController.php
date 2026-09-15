<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    /**
     * Display the Admin Analytics dashboard.
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
        | Selected Period
        |--------------------------------------------------------------------------
        */

        $period =
            $request
                ->string(
                    'period',
                )
                ->toString();

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

        $paidOrdersQuery =
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

        $totalSales =
            (float)
            (clone $paidOrdersQuery)
                ->sum(
                    'total',
                );

        $paidOrders =
            (clone $paidOrdersQuery)
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Average Order Value
        |--------------------------------------------------------------------------
        */

        $averageOrderValue =
            $paidOrders > 0
                ? $totalSales
                    / $paidOrders
                : 0;

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
        | Units Sold
        |--------------------------------------------------------------------------
        */

        $unitsSold =
            (int)
            OrderItem::query()
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

        /*
        |--------------------------------------------------------------------------
        | Inventory Health
        |--------------------------------------------------------------------------
        */

        $inventories =
            Inventory::query()
                ->get();

        $inventoryHealth = [
            'in_stock' => 0,
            'low_stock' => 0,
            'out_of_stock' => 0,
        ];

        foreach (
            $inventories as $inventory
        ) {
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

            $threshold =
                (int)
                $inventory
                    ->reorder_level;

            if (
                $available <= 0
            ) {
                $inventoryHealth[
                    'out_of_stock'
                ]++;

                continue;
            }

            if (
                $threshold > 0
                &&
                $available
                <=
                $threshold
            ) {
                $inventoryHealth[
                    'low_stock'
                ]++;

                continue;
            }

            $inventoryHealth[
                'in_stock'
            ]++;
        }

        /*
        |--------------------------------------------------------------------------
        | Top Merchandise
        |--------------------------------------------------------------------------
        */

        $topProducts =
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
                    5,
                )
                ->get()
                ->map(
                    fn (
                        OrderItem $item,
                    ): array => [
                        'product_code' => $item
                            ->product_code,

                        'product_name' => $item
                            ->product_name,

                        'units_sold' => (int)
                            $item
                                ->units_sold,

                        'total_sales' => (float)
                            $item
                                ->total_sales,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Daily Sales Trend
        |--------------------------------------------------------------------------
        */

        $salesRows =
            Order::query()
                ->selectRaw(
                    'DATE(paid_at) AS sale_date',
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
                    'DATE(paid_at)',
                )
                ->orderByRaw(
                    'DATE(paid_at)',
                )
                ->get();

        $salesTrend =
            $salesRows
                ->map(
                    fn ($row): array => [
                        'date' => Carbon::parse(
                            $row
                                ->sale_date,
                        )
                            ->format(
                                'M d',
                            ),

                        'full_date' => Carbon::parse(
                            $row
                                ->sale_date,
                        )
                            ->toDateString(),

                        'sales' => (float)
                            $row
                                ->total_sales,

                        'orders' => (int)
                            $row
                                ->order_count,
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Fulfillment Rate
        |--------------------------------------------------------------------------
        */

        $fulfillmentRate =
            $paidOrders > 0
                ? round(
                    (
                        $releasedOrders
                        /
                        $paidOrders
                    )
                    * 100,
                    1,
                )
                : 0;

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/Analytics/Index',
            [
                'filters' => [
                    'period' => $period,

                    'start_date' => $startDate
                        ->toDateString(),

                    'end_date' => $endDate
                        ->toDateString(),
                ],

                'periodLabel' => $startDate
                    ->format(
                        'M d, Y',
                    )
                    .' - '
                    .$endDate
                        ->format(
                            'M d, Y',
                        ),

                'summary' => [
                    'total_sales' => $totalSales,

                    'paid_orders' => $paidOrders,

                    'units_sold' => $unitsSold,

                    'average_order_value' => round(
                        $averageOrderValue,
                        2,
                    ),

                    'released_orders' => $releasedOrders,

                    'pending_payments' => $pendingPayments,

                    'fulfillment_rate' => $fulfillmentRate,
                ],

                'inventoryHealth' => $inventoryHealth,

                'topProducts' => $topProducts,

                'salesTrend' => $salesTrend,
            ],
        );
    }

    /**
     * Resolve the selected reporting period.
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
