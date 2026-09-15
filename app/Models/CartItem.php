<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    public const TYPE_ORDER =
        'order';

    public const TYPE_PREORDER =
        'preorder';

    /**
     * Fields allowed during mass assignment.
     */
    protected $fillable = [
        'cart_id',
        'product_variant_id',
        'item_type',
        'quantity',
        'unit_price',
    ];

    /**
     * Convert database values into useful PHP types.
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',

            'unit_price' => 'decimal:2',
        ];
    }

    /**
     * Parent cart.
     */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(
            Cart::class,
        );
    }

    /**
     * Exact product variant selected by the user.
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(
            ProductVariant::class,
        );
    }

    /**
     * All supported cart item types.
     *
     * @return array<int, string>
     */
    public static function types(): array
    {
        return [
            self::TYPE_ORDER,
            self::TYPE_PREORDER,
        ];
    }

    /**
     * Whether this is a normal in-stock order item.
     */
    public function isOrderItem(): bool
    {
        return $this->item_type
            === self::TYPE_ORDER;
    }

    /**
     * Whether this is a Coming Soon preorder item.
     */
    public function isPreorderItem(): bool
    {
        return $this->item_type
            === self::TYPE_PREORDER;
    }

    /**
     * Total price for this cart line.
     */
    public function lineTotal(): string
    {
        $total =
            (float) $this->unit_price
            * $this->quantity;

        return number_format(
            $total,
            2,
            '.',
            '',
        );
    }

    /**
     * Increase the item quantity.
     */
    public function increaseQuantity(
        int $quantity,
    ): void {
        if ($quantity < 1) {
            return;
        }

        $this->increment(
            'quantity',
            $quantity,
        );

        $this->refresh();
    }

    /**
     * Replace the current item quantity.
     */
    public function updateQuantity(
        int $quantity,
    ): void {
        $this->update([
            'quantity' => max(1, $quantity),
        ]);
    }
}
