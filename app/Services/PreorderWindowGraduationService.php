<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Once a product's preorder window closes, it must stop being "Coming Soon"
 * forever. Whatever stock actually arrived decides where it goes next:
 * merchandise that was received becomes normally purchasable, and the "New"
 * badge starts counting down from that moment - the moment students can
 * actually buy it - rather than from whenever it was first registered while
 * still preorder-only. A product that never received any stock is marked
 * Out of Stock instead of being left stuck on Coming Soon indefinitely.
 */
class PreorderWindowGraduationService
{
    public function graduateClosedWindows(): int
    {
        $graduatedCount = 0;

        $productIds = Product::query()
            ->where('availability_status', Product::AVAILABILITY_COMING_SOON)
            ->where('preorder_enabled', true)
            ->whereNotNull('preorder_ends_at')
            ->where('preorder_ends_at', '<=', now())
            ->pluck('id');

        foreach ($productIds as $productId) {
            DB::transaction(function () use ($productId, &$graduatedCount): void {
                $product = Product::query()
                    ->lockForUpdate()
                    ->find($productId);

                if (
                    ! $product
                    || $product->availability_status !== Product::AVAILABILITY_COMING_SOON
                    || ! $product->preorder_ends_at
                    || $product->preorder_ends_at->isFuture()
                ) {
                    return;
                }

                $quantityOnHand = (int) Inventory::query()
                    ->whereIn(
                        'product_variant_id',
                        $product->variants()->pluck('id'),
                    )
                    ->sum('quantity_on_hand');

                $product->update([
                    'availability_status' => $quantityOnHand > 0
                        ? Product::AVAILABILITY_AVAILABLE
                        : Product::AVAILABILITY_OUT_OF_STOCK,

                    'new_badge_started_at' => $quantityOnHand > 0 && ! $product->new_badge_started_at
                        ? now()
                        : $product->new_badge_started_at,
                ]);

                $graduatedCount++;
            });
        }

        return $graduatedCount;
    }
}
