<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    public const SOURCE_STUDENT_APP =
        'student_app';

    public const SOURCE_SPECIALIST_ASSISTED =
        'specialist_assisted';

    public const STATUS_ACTIVE =
        'active';

    public const STATUS_CHECKED_OUT =
        'checked_out';

    public const STATUS_ABANDONED =
        'abandoned';

    /**
     * Fields allowed during mass assignment.
     */
    protected $fillable = [
        'student_id',
        'created_by',
        'source',
        'status',
    ];

    /**
     * The student who will receive the merchandise.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(
            Student::class,
        );
    }

    /**
     * The user who created or currently manages the cart.
     *
     * This may be:
     * - the student
     * - a PROWARE specialist
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    /**
     * Exact product variants currently stored in the cart.
     */
    public function items(): HasMany
    {
        return $this->hasMany(
            CartItem::class,
        );
    }

    /**
     * All valid cart sources.
     *
     * @return array<int, string>
     */
    public static function sources(): array
    {
        return [
            self::SOURCE_STUDENT_APP,
            self::SOURCE_SPECIALIST_ASSISTED,
        ];
    }

    /**
     * All valid cart statuses.
     *
     * @return array<int, string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_CHECKED_OUT,
            self::STATUS_ABANDONED,
        ];
    }

    /**
     * Whether the cart is still editable.
     */
    public function isActive(): bool
    {
        return $this->status
            === self::STATUS_ACTIVE;
    }

    /**
     * Whether the cart belongs to a student shopping
     * through their own account.
     */
    public function isStudentCart(): bool
    {
        return $this->source
            === self::SOURCE_STUDENT_APP;
    }

    /**
     * Whether the cart is being managed by a specialist
     * on behalf of a student.
     */
    public function isAssistedCart(): bool
    {
        return $this->source
            === self::SOURCE_SPECIALIST_ASSISTED;
    }

    /**
     * Total number of units in the cart.
     */
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
     * Total monetary amount of all cart items.
     */
    public function subtotal(): string
    {
        if ($this->relationLoaded('items')) {
            $subtotal = $this
                ->items
                ->sum(
                    fn (CartItem $item): float => (float) $item->unit_price
                        * $item->quantity,
                );

            return number_format(
                $subtotal,
                2,
                '.',
                '',
            );
        }

        $subtotal = $this
            ->items()
            ->selectRaw(
                'COALESCE(SUM(quantity * unit_price), 0) AS subtotal',
            )
            ->value('subtotal');

        return number_format(
            (float) $subtotal,
            2,
            '.',
            '',
        );
    }

    /**
     * Whether this cart contains at least one normal-order item.
     */
    public function hasOrderItems(): bool
    {
        return $this
            ->items()
            ->where(
                'item_type',
                CartItem::TYPE_ORDER,
            )
            ->exists();
    }

    /**
     * Whether this cart contains at least one preorder item.
     */
    public function hasPreorderItems(): bool
    {
        return $this
            ->items()
            ->where(
                'item_type',
                CartItem::TYPE_PREORDER,
            )
            ->exists();
    }
}
