<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrder extends Model
{
    public const STATUS_DRAFT =
        'draft';

    public const STATUS_ORDERED =
        'ordered';

    public const STATUS_PARTIALLY_RECEIVED =
        'partially_received';

    public const STATUS_COMPLETED =
        'completed';

    public const STATUS_CANCELLED =
        'cancelled';

    protected $fillable = [
        'po_number',
        'supplier_name',
        'supplier_reference_number',
        'expected_delivery_date',
        'status',
        'created_by',
        'ordered_at',
        'completed_at',

        /*
        |--------------------------------------------------------------------------
        | Archive Tracking
        |--------------------------------------------------------------------------
        */

        'archived_at',
        'archived_by',

        'notes',
    ];

    protected function casts(): array
    {
        return [
            'expected_delivery_date' => 'date',

            'ordered_at' => 'datetime',

            'completed_at' => 'datetime',

            'archived_at' => 'datetime',
        ];
    }

    /**
     * Admin who created
     * the purchase order.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    /**
     * Admin who archived
     * the purchase order.
     */
    public function archivedBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'archived_by',
        );
    }

    /**
     * Variants ordered
     * under this PO.
     */
    public function items(): HasMany
    {
        return $this->hasMany(
            PurchaseOrderItem::class,
        );
    }

    /**
     * Total units ordered.
     */
    public function totalOrdered(): int
    {
        return (int)
            $this
                ->items
                ->sum(
                    'quantity_ordered',
                );
    }

    /**
     * Total units received.
     */
    public function totalReceived(): int
    {
        return (int)
            $this
                ->items
                ->sum(
                    'quantity_received',
                );
    }

    /**
     * Stock still expected.
     */
    public function totalRemaining(): int
    {
        return max(
            0,
            $this->totalOrdered()
            - $this->totalReceived(),
        );
    }

    /**
     * Whether this PO is archived.
     */
    public function isArchived(): bool
    {
        return $this->archived_at
            !== null;
    }

    public function isDraft(): bool
    {
        return $this->status
            === self::STATUS_DRAFT;
    }

    public function isOrdered(): bool
    {
        return $this->status
            === self::STATUS_ORDERED;
    }

    public function isPartiallyReceived(): bool
    {
        return $this->status
            === self::STATUS_PARTIALLY_RECEIVED;
    }

    public function isCompleted(): bool
    {
        return $this->status
            === self::STATUS_COMPLETED;
    }

    public function isCancelled(): bool
    {
        return $this->status
            === self::STATUS_CANCELLED;
    }
}
