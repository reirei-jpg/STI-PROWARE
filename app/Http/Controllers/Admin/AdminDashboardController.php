<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    /**
     * Display the PROWARE Admin dashboard.
     */
    public function index(
        Request $request,
    ): Response {
        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Philippine Day Boundaries
        |--------------------------------------------------------------------------
        |
        | The database/application remains UTC.
        |
        | Dashboard "Today" statistics should follow
        | the Philippine calendar day.
        |
        */

        $todayStartUtc =
            now(
                self::DISPLAY_TIMEZONE,
            )
                ->startOfDay()
                ->utc();

        $todayEndUtc =
            now(
                self::DISPLAY_TIMEZONE,
            )
                ->endOfDay()
                ->utc();

        /*
        |--------------------------------------------------------------------------
        | Cashier Monitoring - Sales Today
        |--------------------------------------------------------------------------
        |
        | Admin monitors confirmed cashier payments.
        | Admin does not process the payment here.
        |
        */

        $todaySales =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->sum(
                    'total',
                );

        /*
        |--------------------------------------------------------------------------
        | Orders Created Today
        |--------------------------------------------------------------------------
        */

        $ordersToday =
            Order::query()
                ->whereBetween(
                    'created_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
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
                ->where(
                    'fulfillment_status',
                    '!=',
                    Order::FULFILLMENT_CANCELLED,
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Paid Today
        |--------------------------------------------------------------------------
        */

        $paidToday =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Released Today
        |--------------------------------------------------------------------------
        |
        | This represents Specialist fulfillment activity.
        |
        */

        $releasedToday =
            Order::query()
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_RELEASED,
                )
                ->whereBetween(
                    'released_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Active Products
        |--------------------------------------------------------------------------
        */

        $activeProducts =
            Product::query()
                ->where(
                    'is_active',
                    true,
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Total Available Stock
        |--------------------------------------------------------------------------
        |
        | Available =
        |
        | quantity_on_hand - quantity_reserved
        |
        */

        $totalAvailableStock =
            (int)
            Inventory::query()
                ->selectRaw(
                    '
                    COALESCE(
                        SUM(
                            GREATEST(
                                quantity_on_hand
                                - quantity_reserved,
                                0
                            )
                        ),
                        0
                    ) AS total
                    ',
                )
                ->value(
                    'total',
                );

        /*
        |--------------------------------------------------------------------------
        | Low Stock
        |--------------------------------------------------------------------------
        */

        $lowStockCount =
            Inventory::query()
                ->whereRaw(
                    '
                    GREATEST(
                        quantity_on_hand
                        - quantity_reserved,
                        0
                    ) > 0
                    ',
                )
                ->whereRaw(
                    '
                    GREATEST(
                        quantity_on_hand
                        - quantity_reserved,
                        0
                    ) <= reorder_level
                    ',
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Out Of Stock
        |--------------------------------------------------------------------------
        */

        $outOfStockCount =
            Inventory::query()
                ->whereRaw(
                    '
                    GREATEST(
                        quantity_on_hand
                        - quantity_reserved,
                        0
                    ) = 0
                    ',
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Purchase Order Monitoring
        |--------------------------------------------------------------------------
        |
        | Admin manages procurement and monitors receiving.
        |
        | Receiving itself will later belong to Specialist.
        |
        */

        $draftPurchaseOrders =
            PurchaseOrder::query()
                ->where(
                    'status',
                    PurchaseOrder::STATUS_DRAFT,
                )
                ->count();

        $orderedPurchaseOrders =
            PurchaseOrder::query()
                ->where(
                    'status',
                    PurchaseOrder::STATUS_ORDERED,
                )
                ->count();

        $partiallyReceivedPurchaseOrders =
            PurchaseOrder::query()
                ->where(
                    'status',
                    PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
                )
                ->count();

        $completedPurchaseOrders =
            PurchaseOrder::query()
                ->where(
                    'status',
                    PurchaseOrder::STATUS_COMPLETED,
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Specialist / Inventory Activity
        |--------------------------------------------------------------------------
        |
        | Existing movement behavior:
        |
        | TYPE_RECEIVE
        | = physical Stock In
        |
        | TYPE_RELEASE
        | = physical Stock Out during merchandise release
        |
        | We intentionally do NOT use TYPE_SALE here because
        | the current system does not create TYPE_SALE records.
        |
        */

        $stockInToday =
            (int)
            StockMovement::query()
                ->where(
                    'movement_type',
                    StockMovement::TYPE_RECEIVE,
                )
                ->whereBetween(
                    'created_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->sum(
                    'quantity_change',
                );

        $stockOutTodayRaw =
            (int)
            StockMovement::query()
                ->where(
                    'movement_type',
                    StockMovement::TYPE_RELEASE,
                )
                ->whereBetween(
                    'created_at',
                    [
                        $todayStartUtc,
                        $todayEndUtc,
                    ],
                )
                ->sum(
                    'quantity_change',
                );

        /*
        |--------------------------------------------------------------------------
        | Display Stock Out As Positive Units
        |--------------------------------------------------------------------------
        |
        | The movement remains negative in inventory history.
        | Admin monitoring displays the number of units moved out.
        |
        */

        $stockOutToday =
            abs(
                $stockOutTodayRaw,
            );

        /*
        |--------------------------------------------------------------------------
        | Recent Orders
        |--------------------------------------------------------------------------
        */

        $recentOrders =
            Order::query()
                ->with([
                    'student.user',
                ])
                ->latest()
                ->limit(
                    6,
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

                            'payment_status' => $order
                                ->payment_status,

                            'fulfillment_status' => $order
                                ->fulfillment_status,

                            'total' => (string)
                                $order->total,

                            /*
                            |--------------------------------------------------------------------------
                            | Philippine Display Time
                            |--------------------------------------------------------------------------
                            */

                            'created_at' => $order
                                ->created_at
                                ?->copy()
                                ->timezone(
                                    self::DISPLAY_TIMEZONE,
                                )
                                ->format(
                                    'M d, Y h:i A',
                                ),
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Inventory Alerts
        |--------------------------------------------------------------------------
        */

        $inventoryAlerts =
            Inventory::query()
                ->with([
                    'productVariant.product',
                ])
                ->where(
                    function (
                        $query,
                    ): void {
                        /*
                        |--------------------------------------------------------------------------
                        | Out Of Stock
                        |--------------------------------------------------------------------------
                        */

                        $query
                            ->whereRaw(
                                '
                                GREATEST(
                                    quantity_on_hand
                                    - quantity_reserved,
                                    0
                                ) = 0
                                ',
                            )

                            /*
                            |--------------------------------------------------------------------------
                            | Low Stock
                            |--------------------------------------------------------------------------
                            */

                            ->orWhere(
                                function (
                                    $query,
                                ): void {
                                    $query
                                        ->whereRaw(
                                            '
                                            GREATEST(
                                                quantity_on_hand
                                                - quantity_reserved,
                                                0
                                            ) > 0
                                            ',
                                        )
                                        ->whereRaw(
                                            '
                                            GREATEST(
                                                quantity_on_hand
                                                - quantity_reserved,
                                                0
                                            ) <= reorder_level
                                            ',
                                        );
                                },
                            );
                    },
                )
                ->orderBy(
                    'quantity_on_hand',
                )
                ->limit(
                    6,
                )
                ->get()
                ->map(
                    function (
                        Inventory $inventory,
                    ): array {
                        $variant =
                            $inventory
                                ->productVariant;

                        $product =
                            $variant
                                ?->product;

                        return [
                            'id' => $inventory->id,

                            'product_name' => $product?->name
                                ?? 'Unknown Product',

                            'product_code' => $product?->code
                                ?? 'N/A',

                            'variant_name' => $variant
                                ?->variant_name
                                ?? 'Standard',

                            'available_quantity' => (int)
                                $inventory
                                    ->available_quantity,

                            'reorder_level' => (int)
                                $inventory
                                    ->reorder_level,

                            'stock_status' => $inventory
                                ->stock_status,
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Send Dashboard Data To React
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/Dashboard',
            [
                /*
                |--------------------------------------------------------------------------
                | Philippine "Today" Date
                |--------------------------------------------------------------------------
                |
                | Used by the dashboard to deep-link "today" metrics
                | (e.g. Sales Today) into date-filtered pages.
                */

                'todayDate' => now(
                    self::DISPLAY_TIMEZONE,
                )->toDateString(),

                /*
                |--------------------------------------------------------------------------
                | Overall System Monitoring
                |--------------------------------------------------------------------------
                */

                'overview' => [
                    'today_sales' => number_format(
                        (float)
                        $todaySales,
                        2,
                        '.',
                        '',
                    ),

                    'orders_today' => $ordersToday,

                    'active_products' => $activeProducts,

                    'total_available_stock' => $totalAvailableStock,

                    'low_stock' => $lowStockCount,

                    'out_of_stock' => $outOfStockCount,
                ],

                /*
                |--------------------------------------------------------------------------
                | Cashier / Transaction Monitoring
                |--------------------------------------------------------------------------
                */

                'transactions' => [
                    'pending_payments' => $pendingPayments,

                    'paid_today' => $paidToday,

                    'released_today' => $releasedToday,
                ],

                /*
                |--------------------------------------------------------------------------
                | Specialist Monitoring
                |--------------------------------------------------------------------------
                */

                'specialistActivity' => [
                    'stock_in_today' => $stockInToday,

                    'stock_out_today' => $stockOutToday,

                    'released_today' => $releasedToday,
                ],

                /*
                |--------------------------------------------------------------------------
                | Procurement Monitoring
                |--------------------------------------------------------------------------
                */

                'purchaseOrders' => [
                    'draft' => $draftPurchaseOrders,

                    'awaiting_delivery' => $orderedPurchaseOrders,

                    'partially_received' => $partiallyReceivedPurchaseOrders,

                    'completed' => $completedPurchaseOrders,
                ],

                /*
                |--------------------------------------------------------------------------
                | Activity
                |--------------------------------------------------------------------------
                */

                'recentOrders' => $recentOrders,

                'inventoryAlerts' => $inventoryAlerts,
            ],
        );
    }
}
