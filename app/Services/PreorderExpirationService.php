<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;

class PreorderExpirationService
{
    public function expireOverdue(): int
    {
        $expiredCount = 0;

        $overdueIds =
            OrderItem::query()
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                )
                ->where(
                    'preorder_status',
                    OrderItem::PREORDER_STATUS_READY,
                )

                ->whereHas(
                    'order',
                    function ($query): void {
                        $query->where(
                            'payment_status',
                            '!=',
                            'paid',
                        );
                    },
                )
                ->whereNotNull(
                    'preorder_payment_deadline_at',
                )
                ->where(
                    'preorder_payment_deadline_at',
                    '<=',
                    now(),
                )
                ->orderBy('id')
                ->pluck('id');

        foreach ($overdueIds as $itemId) {
            $expired =
                DB::transaction(
                    function () use (
                        $itemId,
                    ): ?int {
                        $item =
                            OrderItem::query()
                                ->with('order')
                                ->lockForUpdate()
                                ->find($itemId);

                        if (
                            ! $item
                            || $item->item_type
                                !== OrderItem::TYPE_PREORDER
                            || $item->preorder_status
                                !== OrderItem::PREORDER_STATUS_READY
                            || $item->order?->payment_status === 'paid'
                            || ! $item->preorder_payment_deadline_at
                            || $item->preorder_payment_deadline_at->isFuture()
                        ) {
                            return null;
                        }

                        $reservedQuantity =
                            max(
                                0,
                                (int)
                                $item
                                    ->preorder_reserved_quantity,
                            );

                        $inventory =
                            Inventory::query()
                                ->where(
                                    'product_variant_id',
                                    $item->product_variant_id,
                                )
                                ->lockForUpdate()
                                ->first();

                        if (
                            $inventory
                            && $reservedQuantity > 0
                        ) {
                            $quantityToRelease =
                                min(
                                    $reservedQuantity,
                                    (int)
                                    $inventory
                                        ->quantity_reserved,
                                );

                            if ($quantityToRelease > 0) {
                                $inventory->decrement(
                                    'quantity_reserved',
                                    $quantityToRelease,
                                );
                            }
                        }

                        $item->forceFill([
                            'preorder_status' => OrderItem::PREORDER_STATUS_EXPIRED,

                            'preorder_expired_at' => now(),

                            'preorder_reserved_quantity' => 0,
                        ])->save();

                        return $inventory?->id;
                    },
                    attempts: 3,
                );

            if ($expired) {
                $expiredCount++;

                $inventory =
                    Inventory::query()
                        ->find($expired);

                if ($inventory) {
                    app(
                        PreorderAvailabilityService::class,
                    )->check(
                        $inventory,
                    );
                }
            }
        }

        return $expiredCount;
    }
}
