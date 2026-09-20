<?php

namespace App\Http\Controllers;

use App\Filters\ProductFilters;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\StorefrontCatalog;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class CatalogController extends Controller
{
    /**
     * A product is flagged as low stock once its total
     * available quantity across variants falls to or
     * below this amount.
     */
    private const LOW_STOCK_THRESHOLD = 10;

    /**
     * Products shown per catalog page.
     */
    private const PER_PAGE = 12;

    /**
     * Display merchandise that may appear in the shared catalog.
     */
    public function index(
        ProductFilters $productFilters,
        Request $request,
    ): Response {
        $eligibleProducts = $productFilters
            ->apply(
                Product::query()
                    ->with([
                        'category:id,name',
                    ])
                    ->with([
                        'variants' => function ($query): void {
                            $query
                                ->where('is_active', true)
                                ->with([
                                    'inventory:id,product_variant_id,quantity_on_hand,quantity_reserved,reorder_level',
                                ]);
                        },
                    ])
                    ->withCount([
                        'variants' => function ($query): void {
                            $query->where(
                                'is_active',
                                true,
                            );
                        },
                    ])
                    ->where(
                        'is_active',
                        true,
                    )
                    ->whereIn(
                        'availability_status',
                        [
                            Product::AVAILABILITY_AVAILABLE,
                            Product::AVAILABILITY_COMING_SOON,
                            Product::AVAILABILITY_OUT_OF_STOCK,
                        ],
                    ),
            )
            ->latest()
            ->get()
            ->map(
                fn (Product $product): array => $this->presentProduct($product),
            );

        /*
        |--------------------------------------------------------------------------
        | Available Products First
        |--------------------------------------------------------------------------
        |
        | Within each availability tier, products are shown in a
        | pseudo-random order that stays IDENTICAL across every
        | request for the same day. A true random shuffle() would
        | reorder the entire list on every page request, which
        | breaks pagination: clicking "Next" would re-shuffle
        | mid-browse, causing the same product to repeat across
        | pages or another to never appear at all. Seeding the
        | order by the current date keeps every page stable while
        | still rotating the order once per day.
        |
        */

        $availabilityPriority = [
            Product::AVAILABILITY_AVAILABLE => 0,

            Product::AVAILABILITY_COMING_SOON => 1,

            Product::AVAILABILITY_OUT_OF_STOCK => 2,
        ];

        $dailySeed =
            now()->format('Y-m-d');

        $sortedProducts =
            $eligibleProducts
                ->sortBy(
                    fn (array $product): int => (
                        (
                            $availabilityPriority[
                                $product['availability_status']
                            ] ?? 3
                        ) * 1_000_000_000
                    )
                        + crc32(
                            "{$dailySeed}-{$product['id']}",
                        ) % 1_000_000_000,
                )
                ->values();

        $currentPage =
            LengthAwarePaginator::resolveCurrentPage();

        $products = new LengthAwarePaginator(
            $sortedProducts
                ->forPage(
                    $currentPage,
                    self::PER_PAGE,
                )
                ->values(),
            $sortedProducts->count(),
            self::PER_PAGE,
            $currentPage,
            [
                'path' => $request->url(),

                'query' => $request->query(),
            ],
        );

        $comingSoonProducts =
            Product::query()
                ->with([
                    'category:id,name',
                ])
                ->with([
                    'variants' => function ($query): void {
                        $query
                            ->where('is_active', true)
                            ->with([
                                'inventory:id,product_variant_id,quantity_on_hand,quantity_reserved,reorder_level',
                            ]);
                    },
                ])
                ->withCount([
                    'variants' => function ($query): void {
                        $query->where(
                            'is_active',
                            true,
                        );
                    },
                ])
                ->where(
                    'is_active',
                    true,
                )
                ->where(
                    'availability_status',
                    Product::AVAILABILITY_COMING_SOON,
                )
                ->latest()
                ->get()
                ->map(
                    fn (Product $product): array => $this->presentProduct($product),
                )
                ->values();

        return Inertia::render(

            'catalog/Index',
            [
                'products' => $products,

                'comingSoonProducts' => $comingSoonProducts,

                'filters' => $productFilters->values(),

                'availabilityStatuses' => [
                    [
                        'value' => '',
                        'label' => 'All',
                    ],
                    [
                        'value' => Product::AVAILABILITY_AVAILABLE,

                        'label' => 'Available',
                    ],
                    [
                        'value' => Product::AVAILABILITY_COMING_SOON,

                        'label' => 'Coming Soon',
                    ],
                    [
                        'value' => Product::AVAILABILITY_OUT_OF_STOCK,

                        'label' => 'Out of Stock',
                    ],
                ],
            ],
        );
    }

    /**
     * Display one product with its variants.
     *
     * What is shown lives in StorefrontCatalog::detail() so the mobile app
     * shows exactly the same product page data.
     */
    public function show(
        Product $product,
        StorefrontCatalog $catalog,
    ): Response {
        /*
         * Inactive products must not be accessible even when
         * someone manually types their product ID in the URL.
         */
        abort_unless(
            $product->isCatalogVisible(),
            404,
        );

        return Inertia::render(
            'catalog/Show',
            [
                'product' => $catalog->detail($product),
            ],
        );
    }

    /**
     * Return a public-facing availability summary without
     * exposing exact internal stock quantities.
     */
    private function availabilitySummary(
        Product $product,
    ): string {
        if (
            $product->availability_status
            === Product::AVAILABILITY_COMING_SOON
        ) {
            return $product->acceptsPreorders()
                ? 'Preorder Available'
                : 'Coming Soon';
        }

        if (
            $product->availability_status
            === Product::AVAILABILITY_OUT_OF_STOCK
        ) {
            return 'Out of Stock';
        }

        $hasAvailableVariant = $product
            ->variants
            ->contains(
                function ($variant): bool {
                    $inventory =
                        $variant->inventory;

                    if (! $inventory) {
                        return false;
                    }

                    return $inventory
                        ->available_quantity > 0;
                },
            );

        return $hasAvailableVariant
            ? 'Available'
            : 'Out of Stock';
    }

    /**
     * Determine the actual catalog availability of a product.
     *
     * Coming Soon and explicitly Out of Stock products keep
     * their configured status.
     *
     * A product configured as Available is only truly available
     * when at least one active variant has usable stock.
     */
    private function effectiveAvailabilityStatus(
        Product $product,
    ): string {
        /*
        |--------------------------------------------------------------------------
        | Coming Soon / Preorder
        |--------------------------------------------------------------------------
        */

        if (
            $product->availability_status
            === Product::AVAILABILITY_COMING_SOON
        ) {
            return Product::AVAILABILITY_COMING_SOON;
        }

        /*
        |--------------------------------------------------------------------------
        | Explicitly Out Of Stock
        |--------------------------------------------------------------------------
        */

        if (
            $product->availability_status
            === Product::AVAILABILITY_OUT_OF_STOCK
        ) {
            return Product::AVAILABILITY_OUT_OF_STOCK;
        }

        /*
        |--------------------------------------------------------------------------
        | Check Actual Variant Inventory
        |--------------------------------------------------------------------------
        */

        $hasAvailableVariant =
            $product
                ->variants
                ->contains(
                    function ($variant): bool {
                        $inventory =
                            $variant->inventory;

                        if (! $inventory) {
                            return false;
                        }

                        return
                            $inventory
                                ->available_quantity
                            > 0;
                    },
                );

        return $hasAvailableVariant
            ? Product::AVAILABILITY_AVAILABLE
            : Product::AVAILABILITY_OUT_OF_STOCK;
    }

    /**
     * Human-readable effective catalog availability.
     */
    private function effectiveAvailabilityLabel(
        Product $product,
    ): string {
        return match (
            $this->effectiveAvailabilityStatus(
                $product,
            )
        ) {
            Product::AVAILABILITY_AVAILABLE => 'Available',

            Product::AVAILABILITY_COMING_SOON => 'Coming Soon',

            Product::AVAILABILITY_OUT_OF_STOCK => 'Out of Stock',

            default => 'Unavailable',
        };
    }

    /**
     * Human-readable tracking mode.
     */
    private function variantModeLabel(
        string $variantMode,
    ): string {
        return match ($variantMode) {
            Product::VARIANT_MODE_PROGRAM_AND_SIZE => 'Program and Size',

            Product::VARIANT_MODE_SIZE_ONLY => 'Size Only',

            Product::VARIANT_MODE_STANDARD => 'Standard / No Size',

            default => 'Unknown',
        };
    }

    /**
     * Build the full catalog-card payload for one product,
     * including the accurate price range, low-stock urgency,
     * and early-bird preorder information shown to students.
     *
     * @return array<string, mixed>
     */
    private function presentProduct(
        Product $product,
    ): array {
        $effectiveStatus =
            $this->effectiveAvailabilityStatus(
                $product,
            );

        $priceRange =
            $this->priceRange(
                $product,
            );

        return [
            'id' => $product->id,

            'code' => $product->code,

            'name' => $product->name,

            'description' => $product->description,

            'base_price' => $product->base_price,

            'price_min' => $priceRange['min'],

            'price_max' => $priceRange['max'],

            'variant_mode' => $product->variant_mode,

            'variant_mode_label' => $this->variantModeLabel(
                $product->variant_mode,
            ),

            'variants_count' => $product->variants_count
                    ?? $product->variants->count(),

            'availability_status' => $effectiveStatus,

            'availability_label' => $this->effectiveAvailabilityLabel(
                $product,
            ),

            'availability_summary' => $this->availabilitySummary(
                $product,
            ),

            'stock_urgency' => $this->stockUrgency(
                $product,
                $effectiveStatus,
            ),

            'early_bird' => $this->earlyBirdInfo(
                $product,
            ),

            'preorder_enabled' => $product->preorder_enabled,

            'accepts_preorders' => $product->acceptsPreorders(),

            'expected_release_date' => $product->expected_release_date
                    ? $product
                        ->expected_release_date
                        ->format('M d, Y')
                    : null,

            'new_badge_duration_days' => $product->new_badge_duration_days,

            'new_badge_started_at' => $product->new_badge_started_at
                    ? $product->new_badge_started_at->toISOString()
                    : null,

            'restocked_badge_duration_days' => $product->restocked_badge_duration_days,

            'restocked_badge_started_at' => $product->restocked_badge_started_at
                    ? $product->restocked_badge_started_at->toISOString()
                    : null,

            'image_url' => $product->image_path
                    ? asset(
                        'storage/'
                        .$product->image_path,
                    )
                    : null,

            'category' => [
                'id' => $product->category->id,

                'name' => $product->category->name,
            ],
        ];
    }

    /**
     * Return the lowest and highest selling price across a
     * product's active variants, falling back to the base
     * price when no variants exist yet.
     *
     * @return array{min: string, max: string}
     */
    private function priceRange(
        Product $product,
    ): array {
        $prices =
            $product
                ->variants
                ->map(
                    fn ($variant): float => (float) (
                        $variant->price_override
                        ?? $product->base_price
                    ),
                );

        if ($prices->isEmpty()) {
            $basePrice =
                (float) $product->base_price;

            return [
                'min' => number_format($basePrice, 2, '.', ''),

                'max' => number_format($basePrice, 2, '.', ''),
            ];
        }

        return [
            'min' => number_format($prices->min(), 2, '.', ''),

            'max' => number_format($prices->max(), 2, '.', ''),
        ];
    }

    /**
     * Flag a truly available product as low stock without
     * exposing the exact remaining quantity to students.
     */
    private function stockUrgency(
        Product $product,
        string $effectiveStatus,
    ): ?string {
        if (
            $effectiveStatus
            !== Product::AVAILABILITY_AVAILABLE
        ) {
            return null;
        }

        $totalAvailable =
            $product
                ->variants
                ->sum(
                    fn ($variant): int => $variant->inventory
                        ?->available_quantity
                            ?? 0,
                );

        return $totalAvailable > 0
            && $totalAvailable <= self::LOW_STOCK_THRESHOLD
                ? 'low_stock'
                : null;
    }

    /**
     * Return the remaining early-bird preorder discount for
     * a coming-soon product, or null when early-bird pricing
     * does not apply or no slots remain.
     *
     * @return array{discount_percent: string, remaining_slots: int}|null
     */
    private function earlyBirdInfo(
        Product $product,
    ): ?array {
        if (
            ! $product->isComingSoon()
            || ! $product->acceptsPreorders()
        ) {
            return null;
        }

        $slots =
            max(
                0,
                (int) ($product->preorder_early_bird_slots ?? 0),
            );

        $discountPercent =
            max(
                0,
                (float) ($product->preorder_early_bird_discount_percent ?? 0),
            );

        if ($slots <= 0 || $discountPercent <= 0) {
            return null;
        }

        $usedSlots =
            OrderItem::query()
                ->whereHas(
                    'productVariant',
                    fn ($query) => $query->where(
                        'product_id',
                        $product->id,
                    ),
                )
                ->where(
                    'early_bird_applied',
                    true,
                )
                ->where(
                    'preorder_status',
                    '!=',
                    OrderItem::PREORDER_STATUS_CANCELLED,
                )
                ->sum('quantity');

        $remainingSlots =
            max(
                0,
                $slots - (int) $usedSlots,
            );

        if ($remainingSlots <= 0) {
            return null;
        }

        return [
            'discount_percent' => number_format($discountPercent, 2, '.', ''),

            'remaining_slots' => $remainingSlots,
        ];
    }
}
