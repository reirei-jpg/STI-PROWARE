<?php

namespace App\Http\Controllers\Specialist;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SpecialistDashboardController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    /**
     * Display the Specialist dashboard.
     *
     * Everything shown here describes the specialist's own day:
     * what is waiting to be handed out, what was handed out, what
     * stock needs attention, and what deliveries are still expected.
     */
    public function __invoke(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'specialist',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Fulfillment Queue
        |--------------------------------------------------------------------------
        |
        | Same definition as the Order Fulfillment page: paid orders
        | that have not been released or cancelled. Split into orders
        | already prepared and ready to hand over versus orders still
        | waiting to be prepared.
        |
        */

        $queue = fn () => Order::query()
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
            );

        $readyForRelease =
            $queue()
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_READY,
                )
                ->count();

        $toPrepare =
            $queue()
                ->where(
                    'fulfillment_status',
                    '!=',
                    Order::FULFILLMENT_READY,
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Released Today (Philippine Day)
        |--------------------------------------------------------------------------
        */

        $now =
            now(
                self::DISPLAY_TIMEZONE,
            );

        $releasedToday =
            Order::query()
                ->where(
                    'fulfillment_status',
                    Order::FULFILLMENT_RELEASED,
                )
                ->whereBetween(
                    'released_at',
                    [
                        $now->startOfDay()->utc(),
                        $now->endOfDay()->utc(),
                    ],
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Stock Needing Attention
        |--------------------------------------------------------------------------
        |
        | Same definitions as the Inventory page's Low Stock and
        | Out of Stock filters: available = on hand - reserved.
        |
        */

        $outOfStock =
            Inventory::query()
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) = 0',
                )
                ->count();

        $lowStock =
            Inventory::query()
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) > 0',
                )
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) <= reorder_level',
                )
                ->count();

        /*
        |--------------------------------------------------------------------------
        | Deliveries Still Expected
        |--------------------------------------------------------------------------
        |
        | Active purchase orders that can still receive merchandise.
        |
        */

        $deliveriesExpected =
            PurchaseOrder::query()
                ->whereNull(
                    'archived_at',
                )
                ->whereIn(
                    'status',
                    [
                        PurchaseOrder::STATUS_ORDERED,
                        PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
                    ],
                )
                ->count();

        return Inertia::render(
            'specialist/Dashboard',
            [
                'stats' => [
                    'ready_for_release' => $readyForRelease,

                    'to_prepare' => $toPrepare,

                    'released_today' => $releasedToday,

                    'low_stock' => $lowStock,

                    'out_of_stock' => $outOfStock,

                    'deliveries_expected' => $deliveriesExpected,
                ],
            ],
        );
    }
}
