<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProductVariant extends Model
{
    /**
     * Fields allowed during mass assignment.
     */
    protected $fillable = [
        'product_id',
        'sku',
        'program',
        'size',
        'variant_name',
        'variant_key',
        'price_override',
        'is_active',
    ];

    /**
     * Convert database values into useful PHP types.
     */
    protected function casts(): array
    {
        return [
            'price_override' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Parent product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(
            Product::class,
        );
    }

    /**
     * Inventory record for this exact variant.
     */
    public function inventory(): HasOne
    {
        return $this->hasOne(
            Inventory::class,
        );
    }

    /**
     * Return the variant-specific price when one exists.
     * Otherwise, return the base product price.
     */
    public function getSellingPriceAttribute(): string
    {
        return $this->price_override
            ?? $this->product->base_price;
    }

    /**
     * Whether this variant belongs to a program.
     */
    public function hasProgram(): bool
    {
        return filled(
            $this->program,
        );
    }

    /**
     * Whether this variant has a size.
     */
    public function hasSize(): bool
    {
        return filled(
            $this->size,
        );
    }

    /**
     * Whether this is the default variant for a
     * product without sizes or programs.
     */
    public function isStandard(): bool
    {
        return $this->variant_key === 'STD';
    }

    /**
     * Purchase order lines that
     * include this exact variant.
     */
    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(
            PurchaseOrderItem::class,
        );
    }
}
