<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const SOURCE_STUDENT_APP =
        'student_app';

    public const SOURCE_SPECIALIST_ASSISTED =
        'specialist_assisted';

    public const TYPE_ORDER =
        'order';

    public const TYPE_PREORDER =
        'preorder';

    public const TYPE_MIXED =
        'mixed';

    public const PAYMENT_PENDING =
        'pending';

    public const PAYMENT_PAID =
        'paid';

    public const PAYMENT_CANCELLED =
        'cancelled';

    public const FULFILLMENT_PENDING =
        'pending';

    public const FULFILLMENT_PREPARING =
        'preparing';

    public const FULFILLMENT_READY =
        'ready_for_release';

    public const FULFILLMENT_RELEASED =
        'released';

    public const FULFILLMENT_CANCELLED =
        'cancelled';

    /**
     * The Philippine VAT rate already included in every
     * listed price. Stored per order (see `tax_rate`) so a
     * future rate change never rewrites old receipts.
     */
    public const TAX_RATE = 0.12;

    protected $fillable = [
        'order_number',
        'student_id',
        'created_by',
        'source',
        'order_type',

        'payment_status',
        'fulfillment_status',

        'subtotal',
        'total',
        'tax_rate',
        'tax_amount',

        /*
      |--------------------------------------------------------------------------
      | Payment QR
      |--------------------------------------------------------------------------
      */

        'qr_token',
        'payment_qr_used_at',

        /*
      |--------------------------------------------------------------------------
      | Payment Information
      |--------------------------------------------------------------------------
      */

        'payment_method',
        'payment_reference',
        'payment_confirmed_by',
        'transaction_number',
        'paid_at',

        /*
      |--------------------------------------------------------------------------
      | Release QR
      |--------------------------------------------------------------------------
      */

        'release_qr_token',
        'release_qr_used_at',

        /*
      |--------------------------------------------------------------------------
      | Fulfillment Dates
      |--------------------------------------------------------------------------
      */

        'ready_for_release_at',
        'released_at',
        'cancelled_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',

            'total' => 'decimal:2',

            'tax_rate' => 'decimal:2',

            'tax_amount' => 'decimal:2',

            /*
            |--------------------------------------------------------------------------
            | Payment
            |--------------------------------------------------------------------------
            */

            'paid_at' => 'datetime',

            'payment_qr_used_at' => 'datetime',

            /*
            |--------------------------------------------------------------------------
            | Release
            |--------------------------------------------------------------------------
            */

            'release_qr_used_at' => 'datetime',

            /*
            |--------------------------------------------------------------------------
            | Fulfillment
            |--------------------------------------------------------------------------
            */

            'ready_for_release_at' => 'datetime',

            'released_at' => 'datetime',

            'cancelled_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(
            Student::class,
        );
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            OrderItem::class,
        );
    }

    public function isPaid(): bool
    {
        return $this->payment_status
            === self::PAYMENT_PAID;
    }

    public function isPendingPayment(): bool
    {
        return $this->payment_status
            === self::PAYMENT_PENDING;
    }

    public function isReadyForRelease(): bool
    {
        return $this->fulfillment_status
            === self::FULFILLMENT_READY;
    }

    public function isReleased(): bool
    {
        return $this->fulfillment_status
            === self::FULFILLMENT_RELEASED;
    }

    public function isCancelled(): bool
    {
        return $this->payment_status
                === self::PAYMENT_CANCELLED
            || $this->fulfillment_status
                === self::FULFILLMENT_CANCELLED;
    }

    public function isPreorder(): bool
    {
        return $this->order_type
            === self::TYPE_PREORDER;
    }

    public function isMixed(): bool
    {
        return $this->order_type
            === self::TYPE_MIXED;
    }

    public function totalQuantity(): int
    {
        if ($this->relationLoaded('items')) {
            return (int) $this
                ->items
                ->sum('quantity');
        }

        return (int) $this
            ->items()
            ->sum('quantity');
    }

    /**
     * The portion of `total` that is NOT tax.
     *
     * `total` already includes tax, so this is purely a
     * disclosure breakdown, not a different amount charged.
     */
    public function vatableSales(): string
    {
        return number_format(
            (float) $this->total
                - (float) $this->tax_amount,
            2,
            '.',
            '',
        );
    }
}
