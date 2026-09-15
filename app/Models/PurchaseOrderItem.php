<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    public const TYPE_CATALOG =
        'catalog';

    public const TYPE_MANUAL =
        'manual';

    public const ORIGIN_EXISTING =
        'existing';

    public const ORIGIN_NEW =
        'new';

    protected $fillable = [
        'purchase_order_id',
        'item_type',
        'merchandise_origin',
        'product_variant_id',
        'manual_name',
        'manual_description',
        'proposed_category_id',
        'proposed_selling_price',
        'manual_sku',
        'track_inventory',
        'quantity_ordered',
        'quantity_received',
        'unit_cost',

        'archived_at',
        'archived_by',
    ];

    protected function casts(): array
    {
        return [
            'purchase_order_id' => 'integer',

            'product_variant_id' => 'integer',

            'track_inventory' => 'boolean',

            'quantity_ordered' => 'integer',

            'quantity_received' => 'integer',

            'unit_cost' => 'decimal:2',

            'archived_at' => 'datetime',

            'archived_by' => 'integer',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(
            PurchaseOrder::class,
        );
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(
            ProductVariant::class,
        );
    }

    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'archived_by',
        );
    }

    public function remainingQuantity(): int
    {
        return max(
            0,
            $this->quantity_ordered
            - $this->quantity_received,
        );
    }

    public function isFullyReceived(): bool
    {
        return $this->quantity_received
            >= $this->quantity_ordered;
    }

    public function isCatalogItem(): bool
    {
        return $this->item_type
            === self::TYPE_CATALOG;
    }

    public function isManualItem(): bool
    {
        return $this->item_type
            === self::TYPE_MANUAL;
    }

    public function isArchived(): bool
    {
        return $this->archived_at
            !== null;
    }
}
