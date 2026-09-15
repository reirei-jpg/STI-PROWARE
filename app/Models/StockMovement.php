<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const TYPE_RECEIVE = 'receive';

    public const TYPE_SALE = 'sale';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_RETURN = 'return';

    public const TYPE_RESERVATION = 'reservation';

    public const TYPE_RELEASE = 'release';

    protected $fillable = [
        'receipt_number',
        'inventory_id',
        'product_variant_id',
        'performed_by',
        'movement_type',
        'quantity_change',
        'quantity_before',
        'quantity_after',
        'supplier_reference_number',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'inventory_id' => 'integer',
            'product_variant_id' => 'integer',
            'performed_by' => 'integer',
            'quantity_change' => 'integer',
            'quantity_before' => 'integer',
            'quantity_after' => 'integer',
        ];
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(
            Inventory::class,
        );
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(
            ProductVariant::class,
        );
    }

    public function performer(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'performed_by',
        );
    }
}
