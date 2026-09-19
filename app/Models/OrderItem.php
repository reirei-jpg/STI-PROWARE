<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    public const TYPE_ORDER =
        'order';

    public const TYPE_PREORDER =
        'preorder';

    public const PREORDER_STATUS_WAITING =
        'waiting';

    public const PREORDER_STATUS_READY =
        'ready';

    public const PREORDER_STATUS_PAID =
        'paid';

    public const PREORDER_STATUS_EXPIRED =
        'expired';

    public const PREORDER_STATUS_CANCELLED =
        'cancelled';

    protected $fillable = [
        'order_id',
        'product_variant_id',
        'product_code',
        'product_name',
        'variant_name',
        'sku',
        'program',
        'size',
        'item_type',
        'preorder_status',
        'preorder_ready_at',
        'preorder_notified_at',
        'preorder_payment_deadline_at',
        'preorder_paid_at',
        'preorder_expired_at',
        'preorder_reserved_quantity',
        'original_unit_price',
        'discount_percent',
        'discount_amount',
        'early_bird_applied',
        'quantity',
        'unit_price',
        'unit_cost',
        'line_total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',

            'unit_price' => 'decimal:2',

            'unit_cost' => 'decimal:2',

            'line_total' => 'decimal:2',

            'preorder_ready_at' => 'datetime',

            'preorder_notified_at' => 'datetime',

            'preorder_payment_deadline_at' => 'datetime',

            'preorder_paid_at' => 'datetime',

            'preorder_expired_at' => 'datetime',

            'preorder_reserved_quantity' => 'integer',
            'original_unit_price' => 'decimal:2',

            'discount_percent' => 'decimal:2',

            'discount_amount' => 'decimal:2',

            'early_bird_applied' => 'boolean',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(
            Order::class,
        );
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(
            ProductVariant::class,
        );
    }

    public function isOrderItem(): bool
    {
        return $this->item_type
            === self::TYPE_ORDER;
    }

    public function isPreorderItem(): bool
    {
        return $this->item_type
            === self::TYPE_PREORDER;
    }

    /**
     * Estimated profit for this line: what the student paid
     * minus what PROWARE paid to acquire the merchandise sold.
     *
     * Returns null when no cost was ever recorded for this
     * item (e.g. sold before cost tracking existed), since
     * zero would misleadingly imply 100% profit.
     */
    public function lineProfit(): ?string
    {
        if ($this->unit_cost === null) {
            return null;
        }

        $cost =
            (float) $this->unit_cost
            * (int) $this->quantity;

        return number_format(
            (float) $this->line_total - $cost,
            2,
            '.',
            '',
        );
    }
}
