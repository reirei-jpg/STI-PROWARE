<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\CashierSalesSummaryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    public function __construct(
        private readonly CashierSalesSummaryService $salesSummary,
    ) {}

    /**
     * Display PROWARE sales and transaction reports.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Date Filters
        |--------------------------------------------------------------------------
        */

        $dateFrom =
            $request->query(
                'date_from',
            );

        $dateTo =
            $request->query(
                'date_to',
            );

        /*
        |--------------------------------------------------------------------------
        | Base Paid Orders Query
        |--------------------------------------------------------------------------
        |
        | Sales are based on paid_at, not created_at.
        |
        */

        $salesQuery =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereNotNull(
                    'paid_at',
                );

        if ($dateFrom) {
            $salesQuery->whereDate(
                'paid_at',
                '>=',
                $dateFrom,
            );
        }

        if ($dateTo) {
            $salesQuery->whereDate(
                'paid_at',
                '<=',
                $dateTo,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */

        $totalSales =
            (clone $salesQuery)
                ->sum('total');

        $paidOrders =
            (clone $salesQuery)
                ->count();

        $releasedOrders =
            (clone $salesQuery)
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_RELEASED,
                )
                ->count();

        $totalItemsSold =
            OrderItem::query()
                ->whereHas(
                    'order',
                    function (
                        Builder $query,
                    ) use (
                        $dateFrom,
                        $dateTo,
                    ): void {
                        $query
                            ->where(
                                'payment_status',
                                Order::PAYMENT_PAID,
                            )
                            ->whereNotNull(
                                'paid_at',
                            );

                        if ($dateFrom) {
                            $query->whereDate(
                                'paid_at',
                                '>=',
                                $dateFrom,
                            );
                        }

                        if ($dateTo) {
                            $query->whereDate(
                                'paid_at',
                                '<=',
                                $dateTo,
                            );
                        }
                    },
                )
                ->sum('quantity');

        /*
        |--------------------------------------------------------------------------
        | Purchasing Cost & Profit
        |--------------------------------------------------------------------------
        |
        | Purchasing cost is only known for items whose variant had a
        | recorded average cost at the moment they were sold (see
        | CheckoutService). Items without one simply do not
        | contribute to the cost total, so this profit figure is an
        | estimate, not a guaranteed-complete accounting figure.
        */

        $totalCost =
            (float) OrderItem::query()
                ->whereHas(
                    'order',
                    function (
                        Builder $query,
                    ) use (
                        $dateFrom,
                        $dateTo,
                    ): void {
                        $query
                            ->where(
                                'payment_status',
                                Order::PAYMENT_PAID,
                            )
                            ->whereNotNull(
                                'paid_at',
                            );

                        if ($dateFrom) {
                            $query->whereDate(
                                'paid_at',
                                '>=',
                                $dateFrom,
                            );
                        }

                        if ($dateTo) {
                            $query->whereDate(
                                'paid_at',
                                '<=',
                                $dateTo,
                            );
                        }
                    },
                )
                ->whereNotNull('unit_cost')
                ->selectRaw(
                    'COALESCE(SUM(unit_cost * quantity), 0) AS total_cost',
                )
                ->value('total_cost');

        $totalProfit =
            $totalSales - $totalCost;

        /*
        |--------------------------------------------------------------------------
        | Today's Sales & This Month
        |--------------------------------------------------------------------------
        |
        | Delegated to the same shared service the Cashier Sales
        | page and Admin Dashboard use, with Philippine day/month
        | boundaries, so this page can never quietly disagree with
        | them on what "today" or "this month" means.
        |
        */

        $now =
            now(
                self::DISPLAY_TIMEZONE,
            );

        $todaySales =
            $this->salesSummary
                ->today()['total'];

        $monthTotal =
            $this->salesSummary->periodTotal(
                $now->clone()
                    ->startOfMonth()
                    ->utc(),
                $now->clone()
                    ->endOfMonth()
                    ->utc(),
            );

        $monthSales =
            $monthTotal['total'];

        /*
        |--------------------------------------------------------------------------
        | Sales Transactions
        |--------------------------------------------------------------------------
        |
        | This is a quick-glance shortcut, not the full transaction
        | list — capped to the 5 most recent so the page stays
        | scannable. Admins who want the complete, searchable list
        | click through to Orders (filtered to Paid).
        |
        */

        $transactions =
            (clone $salesQuery)
                ->with([
                    'student.user',
                ])
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

                            'student_id' => $order
                                ->student
                                ?->student_id
                                ?? 'N/A',

                            'total' => $order->total,

                            'payment_status' => $order
                                ->payment_status,

                            'fulfillment_status' => $order
                                ->fulfillment_status,

                            'paid_at' => $order
                                ->paid_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),

                            'released_at' => $order
                                ->released_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Top Selling Products
        |--------------------------------------------------------------------------
        */

        $topProducts =
            OrderItem::query()
                ->select([
                    'product_code',
                    'product_name',
                ])
                ->selectRaw(
                    'SUM(quantity) AS total_quantity',
                )
                ->selectRaw(
                    'SUM(line_total) AS total_sales',
                )
                ->selectRaw(
                    'SUM(unit_cost * quantity) AS total_cost',
                )
                ->selectRaw(
                    'CASE WHEN COUNT(unit_cost) = COUNT(*) THEN true ELSE false END AS has_complete_cost',
                )
                ->whereHas(
                    'order',
                    function (
                        Builder $query,
                    ) use (
                        $dateFrom,
                        $dateTo,
                    ): void {
                        $query
                            ->where(
                                'payment_status',
                                Order::PAYMENT_PAID,
                            )
                            ->whereNotNull(
                                'paid_at',
                            );

                        if ($dateFrom) {
                            $query->whereDate(
                                'paid_at',
                                '>=',
                                $dateFrom,
                            );
                        }

                        if ($dateTo) {
                            $query->whereDate(
                                'paid_at',
                                '<=',
                                $dateTo,
                            );
                        }
                    },
                )
                ->groupBy(
                    'product_code',
                    'product_name',
                )
                ->orderByDesc(
                    'total_quantity',
                )
                ->limit(5)
                ->get()
                ->map(
                    function ($item): array {
                        $totalSalesForProduct =
                            (float) $item->total_sales;

                        $totalCostForProduct =
                            (float) ($item->total_cost ?? 0);

                        return [
                            'product_code' => $item->product_code,

                            'product_name' => $item->product_name,

                            'total_quantity' => (int)
                                $item->total_quantity,

                            'total_sales' => number_format(
                                $totalSalesForProduct,
                                2,
                                '.',
                                '',
                            ),

                            'total_cost' => number_format(
                                $totalCostForProduct,
                                2,
                                '.',
                                '',
                            ),

                            'total_profit' => number_format(
                                $totalSalesForProduct
                                    - $totalCostForProduct,
                                2,
                                '.',
                                '',
                            ),

                            'has_complete_cost' => (bool) $item->has_complete_cost,
                        ];
                    },
                )
                ->values();

        return Inertia::render(
            'admin/Sales/Index',
            [
                'summary' => [
                    'today_sales' => number_format(
                        (float)
                        $todaySales,
                        2,
                        '.',
                        '',
                    ),

                    'month_sales' => number_format(
                        (float)
                        $monthSales,
                        2,
                        '.',
                        '',
                    ),

                    'filtered_sales' => number_format(
                        (float)
                        $totalSales,
                        2,
                        '.',
                        '',
                    ),

                    /*
                     * Estimated purchasing cost and profit for
                     * the same filtered period. Only items with
                     * a recorded purchasing cost contribute to
                     * `filtered_cost`, so `filtered_profit` is
                     * an estimate, not a guaranteed-complete
                     * accounting figure.
                     */
                    'filtered_cost' => number_format(
                        $totalCost,
                        2,
                        '.',
                        '',
                    ),

                    'filtered_profit' => number_format(
                        $totalProfit,
                        2,
                        '.',
                        '',
                    ),

                    'paid_orders' => $paidOrders,

                    'released_orders' => $releasedOrders,

                    'items_sold' => (int)
                        $totalItemsSold,
                ],

                'transactions' => $transactions,

                'topProducts' => $topProducts,

                'filters' => [
                    'date_from' => $dateFrom,

                    'date_to' => $dateTo,
                ],
            ],
        );
    }
}
