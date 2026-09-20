<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * A paid order that was cancelled and refunded. Kept distinct
     * from "paid" so every sales report, which counts only paid
     * orders, excludes it automatically.
     */
    public const PAYMENT_REFUNDED =
        'refunded';

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

    public const CANCEL_REASON_STUDENT_REQUEST =
        'student_request';

    public const CANCEL_REASON_WRONG_ITEM =
        'wrong_item';

    public const CANCEL_REASON_NEVER_CLAIMED =
        'never_claimed';

    public const CANCEL_REASON_UNPAID_EXPIRED =
        'unpaid_expired';

    public const CANCEL_REASON_OTHER =
        'other';

    /**
     * Reasons a person can pick when cancelling an order.
     * "unpaid_expired" is reserved for the automatic system cancel.
     *
     * @var list<string>
     */
    public const CANCEL_REASONS_SELECTABLE = [
        self::CANCEL_REASON_STUDENT_REQUEST,
        self::CANCEL_REASON_WRONG_ITEM,
        self::CANCEL_REASON_NEVER_CLAIMED,
        self::CANCEL_REASON_OTHER,
    ];

    /**
     * How long, in hours, a student may cancel an unpaid order they
     * placed. Staff are not bound by this limit.
     */
    public const STUDENT_CANCEL_WINDOW_HOURS = 24;

    /**
     * How long, in hours, an order may stay unpaid before the system
     * cancels it and releases its reserved stock.
     */
    public const UNPAID_AUTO_CANCEL_HOURS = 48;

    /**
     * Days a paid order may sit ready for pickup before the student is
     * reminded. One reminder is sent per milestone.
     *
     * @var list<int>
     */
    public const UNCLAIMED_REMINDER_DAYS = [7, 14, 30];

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

        /*
      |--------------------------------------------------------------------------
      | Cancellation Details
      |--------------------------------------------------------------------------
      */

        'cancelled_by',
        'cancellation_reason',
        'cancellation_note',
        'refund_confirmed_at',

        'unclaimed_reminder_days',
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

            'refund_confirmed_at' => 'datetime',
        ];
    }

    /**
     * Paid orders that are prepared and ready for pickup but not yet
     * claimed by the student.
     *
     * @param  Builder<Order>  $query
     * @return Builder<Order>
     */
    public function scopeUnclaimed(Builder $query): Builder
    {
        return $query
            ->where('payment_status', self::PAYMENT_PAID)
            ->where('fulfillment_status', self::FULFILLMENT_READY)
            ->whereNotNull('ready_for_release_at');
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

    public function canceller(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'cancelled_by',
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

    /**
     * Every item on the order is a preorder whose payment period expired, so
     * nothing here can still be paid for or collected. The order itself stays
     * "pending" in the database; this is how screens tell it apart.
     */
    public function hasOnlyExpiredPreorders(): bool
    {
        $items = $this->relationLoaded('items')
            ? $this->items
            : $this->items()->get();

        return $items->isNotEmpty()
            && $items->every(
                fn (OrderItem $item): bool => $item->item_type === OrderItem::TYPE_PREORDER
                    && $item->preorder_status === OrderItem::PREORDER_STATUS_EXPIRED,
            );
    }

    /**
     * Orders that are NOT made up only of expired preorders: those with no
     * expired preorder item, or with at least one item that is still live.
     */
    public function scopeExcludingExpiredPreorders(Builder $query): Builder
    {
        return $query->where(function (Builder $query): void {
            $query
                ->whereDoesntHave(
                    'items',
                    fn (Builder $items) => $items
                        ->where('item_type', OrderItem::TYPE_PREORDER)
                        ->where('preorder_status', OrderItem::PREORDER_STATUS_EXPIRED),
                )
                ->orWhereHas(
                    'items',
                    fn (Builder $items) => $items->where(
                        fn (Builder $live) => $live
                            ->where('item_type', '!=', OrderItem::TYPE_PREORDER)
                            ->orWhereNull('preorder_status')
                            ->orWhere('preorder_status', '!=', OrderItem::PREORDER_STATUS_EXPIRED),
                    ),
                );
        });
    }

    public function isCancelled(): bool
    {
        return $this->payment_status
                === self::PAYMENT_CANCELLED
            || $this->fulfillment_status
                === self::FULFILLMENT_CANCELLED;
    }

    /**
     * The moment a student can no longer cancel this order, or null
     * when no deadline applies.
     *
     * Merchandise held for the student is what the limit protects, so
     * the clock starts at checkout for normal items and when stock was
     * reserved for a ready preorder. A preorder still waiting for stock
     * holds nothing, so it never expires on its own.
     */
    public function studentCancelDeadline(): ?CarbonInterface
    {
        return $this->items
            ->map(function (OrderItem $item): ?CarbonInterface {
                if ($item->item_type === OrderItem::TYPE_ORDER) {
                    return $this->created_at?->copy()->addHours(
                        self::STUDENT_CANCEL_WINDOW_HOURS,
                    );
                }

                if (
                    $item->item_type === OrderItem::TYPE_PREORDER
                    && $item->preorder_status === OrderItem::PREORDER_STATUS_READY
                    && $item->preorder_ready_at
                ) {
                    return $item->preorder_ready_at->copy()->addHours(
                        self::STUDENT_CANCEL_WINDOW_HOURS,
                    );
                }

                return null;
            })
            ->filter()
            ->min();
    }

    /**
     * Why a student cannot cancel this order right now, or null when
     * they can.
     */
    public function studentCancelBlockedReason(): ?string
    {
        if ($this->isReleased()) {
            return 'This order has already been released.';
        }

        if (
            $this->isCancelled()
            || $this->payment_status === self::PAYMENT_REFUNDED
        ) {
            return 'This order has already been cancelled.';
        }

        if ($this->isPaid()) {
            return 'This order is already paid. Please see the cashier if you need to cancel it.';
        }

        if ($this->hasOnlyExpiredPreorders()) {
            return 'This preorder has expired.';
        }

        $deadline = $this->studentCancelDeadline();

        if ($deadline && $deadline->isPast()) {
            return 'The '.self::STUDENT_CANCEL_WINDOW_HOURS
                .'-hour cancellation period has ended. Please see the cashier.';
        }

        return null;
    }

    /**
     * Staff (cashier, admin) may cancel anything not yet released.
     */
    public function canBeCancelledByStaff(): bool
    {
        return ! $this->isReleased()
            && ! $this->isCancelled()
            && $this->payment_status !== self::PAYMENT_REFUNDED;
    }

    public function cancellationReasonLabel(): ?string
    {
        return match ($this->cancellation_reason) {
            self::CANCEL_REASON_STUDENT_REQUEST => 'Student asked to cancel',
            self::CANCEL_REASON_WRONG_ITEM => 'Wrong item ordered',
            self::CANCEL_REASON_NEVER_CLAIMED => 'Never claimed',
            self::CANCEL_REASON_UNPAID_EXPIRED => 'Not paid in time',
            self::CANCEL_REASON_OTHER => 'Other',
            default => null,
        };
    }

    /**
     * Who cancelled the order, why, and whether a refund was recorded,
     * shaped for the order pages. Null while the order is not cancelled.
     *
     * @return array{reason: string|null, note: string|null, cancelled_by: string, refunded_at: string|null}|null
     */
    public function cancellationSummary(): ?array
    {
        if (! $this->cancelled_at) {
            return null;
        }

        return [
            'reason' => $this->cancellationReasonLabel(),
            'note' => $this->cancellation_note,
            'cancelled_by' => $this->canceller?->name ?? 'System',
            'refunded_at' => $this->refund_confirmed_at
                ?->timezone('Asia/Manila')
                ->format('M d, Y h:i A'),
        ];
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
