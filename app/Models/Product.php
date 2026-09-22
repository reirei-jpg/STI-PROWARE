<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    /*
    |--------------------------------------------------------------------------
    | Variant Modes
    |--------------------------------------------------------------------------
    */

    public const VARIANT_MODE_PROGRAM_AND_SIZE =
        'program_and_size';

    public const VARIANT_MODE_SIZE_ONLY =
        'size_only';

    public const VARIANT_MODE_STANDARD =
        'standard';

    /*
    |--------------------------------------------------------------------------
    | Catalog Availability
    |--------------------------------------------------------------------------
    */

    public const AVAILABILITY_AVAILABLE =
        'available';

    public const AVAILABILITY_COMING_SOON =
        'coming_soon';

    public const AVAILABILITY_OUT_OF_STOCK =
        'out_of_stock';

    public const AVAILABILITY_INACTIVE =
        'inactive';

    /*
    |--------------------------------------------------------------------------
    | Fillable
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'category_id',
        'created_by',
        'code',
        'name',
        'description',
        'base_price',
        'image_path',

        'variant_mode',

        'availability_status',

        'preorder_enabled',
        'expected_release_date',
        'preorder_starts_at',
        'preorder_ends_at',
        'preorder_limit_per_student',
        'preorder_capacity',

        'preorder_payment_deadline_hours',
        'preorder_early_bird_slots',
        'preorder_early_bird_discount_percent',

        'new_badge_duration_days',
        'new_badge_started_at',

        'restocked_badge_duration_days',
        'restocked_badge_started_at',

        'is_active',
    ];

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',

            'preorder_enabled' => 'boolean',

            'expected_release_date' => 'date',

            'preorder_starts_at' => 'datetime',

            'preorder_ends_at' => 'datetime',

            'preorder_limit_per_student' => 'integer',

            'preorder_capacity' => 'integer',

            'preorder_payment_deadline_hours' => 'integer',

            'preorder_early_bird_slots' => 'integer',

            'preorder_early_bird_discount_percent' => 'decimal:2',

            'new_badge_duration_days' => 'integer',

            'new_badge_started_at' => 'datetime',
            'restocked_badge_duration_days' => 'integer',

            'restocked_badge_started_at' => 'datetime',

            'is_active' => 'boolean',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Variant Modes
    |--------------------------------------------------------------------------
    */

    public static function variantModes(): array
    {
        return [
            self::VARIANT_MODE_PROGRAM_AND_SIZE,
            self::VARIANT_MODE_SIZE_ONLY,
            self::VARIANT_MODE_STANDARD,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Availability Statuses
    |--------------------------------------------------------------------------
    */

    public static function availabilityStatuses(): array
    {
        return [
            self::AVAILABILITY_AVAILABLE,
            self::AVAILABILITY_COMING_SOON,
            self::AVAILABILITY_OUT_OF_STOCK,
            self::AVAILABILITY_INACTIVE,
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function category(): BelongsTo
    {
        return $this->belongsTo(
            Category::class,
        );
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by',
        );
    }

    public function variants(): HasMany
    {
        return $this->hasMany(
            ProductVariant::class,
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Variant Helpers
    |--------------------------------------------------------------------------
    */

    public function usesPrograms(): bool
    {
        return $this->variant_mode
            ===
            self::VARIANT_MODE_PROGRAM_AND_SIZE;
    }

    public function usesSizes(): bool
    {
        return in_array(
            $this->variant_mode,
            [
                self::VARIANT_MODE_PROGRAM_AND_SIZE,
                self::VARIANT_MODE_SIZE_ONLY,
            ],
            true,
        );
    }

    public function isStandard(): bool
    {
        return $this->variant_mode
            ===
            self::VARIANT_MODE_STANDARD;
    }

    /*
    |--------------------------------------------------------------------------
    | Catalog Visibility
    |--------------------------------------------------------------------------
    */

    public function isCatalogVisible(): bool
    {
        return
            $this->is_active
            &&
            $this->availability_status
                !==
                self::AVAILABILITY_INACTIVE;
    }

    /*
    |--------------------------------------------------------------------------
    | Available
    |--------------------------------------------------------------------------
    */

    public function isAvailable(): bool
    {
        return
            $this->is_active
            &&
            $this->availability_status
                ===
                self::AVAILABILITY_AVAILABLE;
    }

    /*
    |--------------------------------------------------------------------------
    | Coming Soon
    |--------------------------------------------------------------------------
    */

    public function isComingSoon(): bool
    {
        return
            $this->is_active
            &&
            $this->availability_status
                ===
                self::AVAILABILITY_COMING_SOON;
    }

    /*
    |--------------------------------------------------------------------------
    | Out Of Stock
    |--------------------------------------------------------------------------
    */

    public function isOutOfStock(): bool
    {
        return
            $this->is_active
            &&
            $this->availability_status
                ===
                self::AVAILABILITY_OUT_OF_STOCK;
    }

    /*
    |--------------------------------------------------------------------------
    | Accepts Preorders
    |--------------------------------------------------------------------------
    |
    | A preorder is allowed only when:
    |
    | 1. Product is active
    | 2. Product is Coming Soon
    | 3. Preorders are enabled
    | 4. Current time is not before preorder start
    | 5. Current time is not after preorder end
    |
    */

    public function acceptsPreorders(): bool
    {
        /*
        |--------------------------------------------------------------------------
        | Active + Coming Soon
        |--------------------------------------------------------------------------
        */

        if (! $this->isComingSoon()) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Enabled
        |--------------------------------------------------------------------------
        */

        if (! $this->preorder_enabled) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | Current Time
        |--------------------------------------------------------------------------
        */

        $now =
            now();

        /*
        |--------------------------------------------------------------------------
        | Start Date
        |--------------------------------------------------------------------------
        */

        if (
            $this->preorder_starts_at
            &&
            $now->lt(
                $this->preorder_starts_at,
            )
        ) {
            return false;
        }

        /*
        |--------------------------------------------------------------------------
        | End Date
        |--------------------------------------------------------------------------
        */

        if (
            $this->preorder_ends_at
            &&
            $now->gt(
                $this->preorder_ends_at,
            )
        ) {
            return false;
        }

        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | Preorder Capacity Usage
    |--------------------------------------------------------------------------
    |
    | Both helpers below deliberately count WAITING, READY, and PAID
    | preorder items (not just paid ones) — an unpaid preorder still
    | holds a slot until it is cancelled or expires. Cancelled and
    | expired preorder items are excluded because their reserved stock
    | has already been released back for someone else to claim.
    */

    /**
     * Total preorder quantity already claimed against this product,
     * across every student, counted toward `preorder_capacity`.
     */
    public function usedPreorderCapacity(): int
    {
        return (int) OrderItem::query()
            ->whereHas(
                'productVariant',
                fn ($query) => $query->where('product_id', $this->id),
            )
            ->where('item_type', OrderItem::TYPE_PREORDER)
            ->whereNotIn('preorder_status', [
                OrderItem::PREORDER_STATUS_CANCELLED,
                OrderItem::PREORDER_STATUS_EXPIRED,
            ])
            ->sum('quantity');
    }

    /**
     * One student's preorder quantity for this product, counted toward
     * `preorder_limit_per_student`. Scoped to the current preorder
     * window (orders placed on or after `preorder_starts_at`) so the
     * per-student limit resets when the product opens a new preorder
     * batch, rather than acting as a lifetime cap.
     */
    public function studentPreorderQuantityInCurrentWindow(int $studentId): int
    {
        return (int) OrderItem::query()
            ->whereHas(
                'productVariant',
                fn ($query) => $query->where('product_id', $this->id),
            )
            ->where('item_type', OrderItem::TYPE_PREORDER)
            ->whereNotIn('preorder_status', [
                OrderItem::PREORDER_STATUS_CANCELLED,
                OrderItem::PREORDER_STATUS_EXPIRED,
            ])
            ->whereHas('order', function ($query) use ($studentId): void {
                $query->where('student_id', $studentId);

                if ($this->preorder_starts_at !== null) {
                    $query->where('created_at', '>=', $this->preorder_starts_at);
                }
            })
            ->sum('quantity');
    }

    /*
    |--------------------------------------------------------------------------
    | Availability Label
    |--------------------------------------------------------------------------
    */

    public function availabilityLabel(): string
    {
        return match (
            $this->availability_status
        ) {
            self::AVAILABILITY_AVAILABLE => 'Available',

            self::AVAILABILITY_COMING_SOON => 'Coming Soon',

            self::AVAILABILITY_OUT_OF_STOCK => 'Out of Stock',

            self::AVAILABILITY_INACTIVE => 'Inactive',

            default => 'Unknown',
        };
    }
}
