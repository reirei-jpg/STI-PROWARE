<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

class PreorderAvailabilityService
{
    /**
     * Check preorder entries for one inventory/variant
     * and notify students whose preorder is now ready.
     */
    public function check(
        Inventory $inventory,
    ): void {
        DB::transaction(
            function () use ($inventory): void {
                /*
                |--------------------------------------------------------------------------
                | Lock Inventory
                |--------------------------------------------------------------------------
                |
                | Reload and lock the inventory row so two processes cannot allocate
                | the same available stock to different preorder entries.
                |
                */

                $lockedInventory =
                    Inventory::query()
                        ->with([
                            'productVariant.product',
                        ])
                        ->lockForUpdate()
                        ->find(
                            $inventory->id,
                        );

                if (! $lockedInventory) {
                    return;
                }

                $variant =
                    $lockedInventory
                        ->productVariant;

                if (! $variant) {
                    return;
                }

                $product =
                    $variant->product;

                if (! $product) {
                    return;
                }

                /*
                |--------------------------------------------------------------------------
                | Available Quantity
                |--------------------------------------------------------------------------
                */

                $remainingAvailable =
                    max(
                        0,
                        (int)
                        $lockedInventory
                            ->quantity_on_hand
                        -
                        (int)
                        $lockedInventory
                            ->quantity_reserved,
                    );

                if ($remainingAvailable <= 0) {
                    return;
                }

                /*
                |--------------------------------------------------------------------------
                | Waiting Preorder Queue - FIFO
                |--------------------------------------------------------------------------
                |
                | Only WAITING preorder items are eligible for new stock allocation.
                | Ready, paid, expired, released, and cancelled entries must not
                | consume another allocation.
                |
                */

                $preorderItems =
                    OrderItem::query()
                        ->with([
                            'order.student.user',
                        ])
                        ->where(
                            'product_variant_id',
                            $variant->id,
                        )
                        ->where(
                            'item_type',
                            OrderItem::TYPE_PREORDER,
                        )
                        ->where(
                            'preorder_status',
                            OrderItem::PREORDER_STATUS_WAITING,
                        )
                        ->whereHas(
                            'order',
                            function ($query): void {
                                $query
                                    ->where(
                                        'fulfillment_status',
                                        '!=',
                                        'released',
                                    )
                                    ->where(
                                        'fulfillment_status',
                                        '!=',
                                        'cancelled',
                                    )
                                    ->where(
                                        'payment_status',
                                        '!=',
                                        'cancelled',
                                    );
                            },
                        )
                        ->orderBy(
                            'created_at',
                        )
                        ->orderBy(
                            'id',
                        )
                        ->lockForUpdate()
                        ->get();

                /*
                |--------------------------------------------------------------------------
                | Allocate Available Stock
                |--------------------------------------------------------------------------
                */

                foreach ($preorderItems as $item) {
                    $requestedQuantity =
                        (int) $item->quantity;

                    if ($requestedQuantity <= 0) {
                        continue;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Strict FIFO
                    |--------------------------------------------------------------------------
                    |
                    | If the oldest waiting preorder cannot be completely supplied,
                    | stop here. A newer preorder must not skip ahead.
                    |
                    */

                    if (
                        $remainingAvailable
                        <
                        $requestedQuantity
                    ) {
                        break;
                    }

                    $readyAt =
                        now();

                    $paymentDeadlineHours =
                        $product
                            ->preorder_payment_deadline_hours;

                    /*
                    |--------------------------------------------------------------------------
                    | Persist Ready Lifecycle
                    |--------------------------------------------------------------------------
                    */

                    $item->forceFill([
                        'preorder_status' => OrderItem::PREORDER_STATUS_READY,

                        'preorder_ready_at' => $readyAt,

                        'preorder_payment_deadline_at' => $paymentDeadlineHours !== null
                                ? $readyAt
                                    ->copy()
                                    ->addHours(
                                        (int) $paymentDeadlineHours,
                                    )
                                : null,

                        'preorder_reserved_quantity' => $requestedQuantity,
                    ])->save();

                    /*
                    |--------------------------------------------------------------------------
                    | Reserve Actual Inventory
                    |--------------------------------------------------------------------------
                    |
                    | quantity_on_hand remains unchanged.
                    | quantity_reserved increases so this stock cannot be allocated
                    | to another normal order or preorder.
                    |
                    */

                    $lockedInventory
                        ->increment(
                            'quantity_reserved',
                            $requestedQuantity,
                        );

                    $remainingAvailable -=
                        $requestedQuantity;

                    /*
                    |--------------------------------------------------------------------------
                    | Student Notification
                    |--------------------------------------------------------------------------
                    */

                    $order =
                        $item->order;

                    $studentUser =
                        $order
                            ?->student
                            ?->user;

                    if (
                        ! $order
                        || ! $studentUser
                    ) {
                        continue;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Prevent Duplicate Notification
                    |--------------------------------------------------------------------------
                    */

                    $alreadyNotified =
                        Notification::query()
                            ->where(
                                'user_id',
                                $studentUser->id,
                            )
                            ->where(
                                'type',
                                'preorder_ready',
                            )
                            ->where(
                                'link',
                                "/student/orders/{$order->id}",
                            )
                            ->exists();

                    if (
                        $alreadyNotified
                        || $item->preorder_notified_at !== null
                    ) {
                        continue;
                    }

                    Notification::query()
                        ->create([
                            'user_id' => $studentUser->id,

                            'type' => 'preorder_ready',

                            'title' => 'Preorder Merchandise Available',

                            'message' => "{$item->product_name} ({$item->variant_name}) "
                                ."from order {$order->order_number} now has "
                                .'enough stock available for your requested '
                                ."quantity of {$requestedQuantity}.",

                            'link' => "/student/orders/{$order->id}",

                            'read_at' => null,
                        ]);

                    $item->forceFill([
                        'preorder_notified_at' => now(),
                    ])->save();
                }
            },
            attempts: 3,
        );
    }

    public function readinessForVariant(
        int $productVariantId,
    ): array {
        /*
        |--------------------------------------------------------------------------
        | Inventory
        |--------------------------------------------------------------------------
        */

        $inventory =
            Inventory::query()
                ->where(
                    'product_variant_id',
                    $productVariantId,
                )
                ->first();

        /*
        |--------------------------------------------------------------------------
        | Available Quantity
        |--------------------------------------------------------------------------
        */

        $remainingAvailable =
            $inventory
                ? max(
                    0,
                    (int)
                    $inventory
                        ->quantity_on_hand
                    -
                    (int)
                    $inventory
                        ->quantity_reserved,
                )
                : 0;

        /*
        |--------------------------------------------------------------------------
        | Active FIFO Queue
        |--------------------------------------------------------------------------
        */

        $items =
            OrderItem::query()
                ->where(
                    'product_variant_id',
                    $productVariantId,
                )
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                )
                ->whereHas(
                    'order',
                    function (
                        $query,
                    ): void {
                        $query
                            ->where(
                                'fulfillment_status',
                                '!=',
                                'released',
                            )
                            ->where(
                                'fulfillment_status',
                                '!=',
                                'cancelled',
                            )
                            ->where(
                                'payment_status',
                                '!=',
                                'cancelled',
                            );
                    },
                )
                ->orderBy(
                    'created_at',
                )
                ->orderBy(
                    'id',
                )
                ->get();

        /*
        |--------------------------------------------------------------------------
        | Build Readiness Map
        |--------------------------------------------------------------------------
        */

        $statuses =
            [];

        foreach (
            $items as $item
        ) {
            $requested =
                (int)
                $item->quantity;

            if (
                $requested <= 0
            ) {
                $statuses[
                    $item->id
                ] =
                    'waiting';

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Ready
            |--------------------------------------------------------------------------
            */

            if (
                $remainingAvailable
                >=
                $requested
            ) {
                $statuses[
                    $item->id
                ] =
                    'ready';

                $remainingAvailable -=
                    $requested;

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Waiting
            |--------------------------------------------------------------------------
            */

            $statuses[
                $item->id
            ] =
                'waiting';
        }

        return $statuses;
    }
}
