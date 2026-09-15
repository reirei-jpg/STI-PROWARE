<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $fillable = [
        'product_variant_id',
        'quantity_on_hand',
        'quantity_reserved',
        'reorder_level',
        'average_cost',
    ];

    protected function casts(): array
    {
        return [
            'average_cost' => 'decimal:2',
        ];
    }

    protected $appends = [
        'available_quantity',
        'stock_status',
    ];

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    /**
     * Fold newly received stock into the running
     * weighted-average purchasing cost for this variant.
     *
     * If no cost is known yet (first-ever receipt, or a
     * receipt that didn't record a cost), the received
     * cost simply becomes the new average.
     */
    public function applyReceivedCost(
        int $quantityReceived,
        ?float $receivedUnitCost,
    ): void {
        if ($receivedUnitCost === null) {
            return;
        }

        $existingQuantity = (int) $this->quantity_on_hand;
        $existingAverage = $this->average_cost !== null
            ? (float) $this->average_cost
            : null;

        if ($existingAverage === null || $existingQuantity <= 0) {
            $this->average_cost = number_format(
                $receivedUnitCost,
                2,
                '.',
                '',
            );

            return;
        }

        $newAverage =
            (
                ($existingQuantity * $existingAverage)
                + ($quantityReceived * $receivedUnitCost)
            )
            / ($existingQuantity + $quantityReceived);

        $this->average_cost = number_format(
            $newAverage,
            2,
            '.',
            '',
        );
    }

    public function getAvailableQuantityAttribute(): int
    {
        return max(
            0,
            $this->quantity_on_hand - $this->quantity_reserved
        );
    }

    public function getStockStatusAttribute(): string
    {
        if ($this->available_quantity === 0) {
            return 'out_of_stock';
        }

        if ($this->available_quantity <= $this->reorder_level) {
            return 'low_stock';
        }

        return 'in_stock';
    }
}
