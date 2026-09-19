<?php

namespace App\Http\Controllers\Student;

use App\Filters\ProductFilters;
use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;
use Inertia\Response;

class StudentDashboardController extends Controller
{
    /**
     * A product is flagged as low stock once its total
     * available quantity across variants falls to or
     * below this amount.
     */
    private const LOW_STOCK_THRESHOLD = 10;

    /**
     * Products shown per Home page.
     */
    private const PER_PAGE = 12;

    /**
     * Display the Student Home storefront.
     */
    public function __invoke(
        Request $request,
        ProductFilters $productFilters,
    ): Response {
        /*
        |--------------------------------------------------------------------------
        | Authenticated Student
        |--------------------------------------------------------------------------
        */

        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'student',
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Home Merchandise
        |--------------------------------------------------------------------------
        |
        | The Student Dashboard now acts as the main PROWARE storefront.
        |
        | Only active, catalog-visible products are shown.
        |
        | Active variants and their inventory are loaded so that the displayed
        | availability reflects actual usable stock.
        |
        */

        /*
        |--------------------------------------------------------------------------
        | Grid Products
        |--------------------------------------------------------------------------
        |
        | Coming Soon products are excluded here, at the query, because
        | the page shows them in the carousel instead of repeating them
        | in the grid. Excluding them before paginating keeps page
        | counts, the "matching products" total, and each page's size
        | accurate — otherwise pages would fill with Coming Soon items
        | that the page then hid, leaving short or blank pages.
        |
        | Only the search filter goes through ProductFilters. The
        | status filter is applied below against the EFFECTIVE status
        | shown on each card, so choosing "Available" never lists a
        | card labelled Out of Stock, and "Out of Stock" also finds
        | products whose real stock has run out.
        |
        */

        $requestedStatus =
            $productFilters
                ->availabilityStatus();

        $eligibleProducts =
            $productFilters
                ->applySearchFilter(
                    Product::query()
                        ->with([
                            'category:id,name',

                            'variants' => function ($query) {
                                $query
                                    ->where(
                                        'is_active',
                                        true,
                                    )
                                    ->with(
                                        'inventory',
                                    );
                            },
                        ])
                        ->where(
                            'is_active',
                            true,
                        )
                        ->whereNotIn(
                            'availability_status',
                            [
                                Product::AVAILABILITY_INACTIVE,
                                Product::AVAILABILITY_COMING_SOON,
                            ],
                        ),
                )
                ->latest()
                ->get()
                ->map(
                    fn (Product $product): array => $this->presentProduct($product),
                )
                ->when(
                    $requestedStatus,
                    fn ($products) => $products->filter(
                        fn (array $product): bool => $product['availability_status']
                            === $requestedStatus,
                    ),
                );

        /*
        |--------------------------------------------------------------------------
        | Available Products First
        |--------------------------------------------------------------------------
        |
        | Within each availability tier, products are shown in a
        | pseudo-random order that stays IDENTICAL across every
        | request for the same day, so paging through Home never
        | repeats or skips a product mid-browse. The order still
        | rotates once per day, at midnight Philippine time.
        |
        */

        $availabilityPriority = [
            Product::AVAILABILITY_AVAILABLE => 0,

            Product::AVAILABILITY_OUT_OF_STOCK => 1,
        ];

        $dailySeed =
            now('Asia/Manila')
                ->format('Y-m-d');

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

        $homeProducts = new LengthAwarePaginator(
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

        /*
        |--------------------------------------------------------------------------
        | Coming Soon Advertisements
        |--------------------------------------------------------------------------
        |
        | The Coming Soon carousel always shows every upcoming
        | product, independent of which Home page is open.
        |
        */

        $comingSoonProducts =
            Product::query()
                ->with([
                    'category:id,name',

                    'variants' => function ($query) {
                        $query
                            ->where(
                                'is_active',
                                true,
                            )
                            ->with(
                                'inventory',
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

        /*
        |--------------------------------------------------------------------------
        | Render Student Home
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'student/Dashboard',
            [
                'homeProducts' => $homeProducts,

                'comingSoonProducts' => $comingSoonProducts,

                'filters' => $productFilters->values(),
            ],
        );
    }

    /**
     * Build the full storefront-card payload for one product.
     *
     * @return array<string, mixed>
     */
    private function presentProduct(
        Product $product,
    ): array {
        /*
        |--------------------------------------------------------------------------
        | Actual Variant Stock
        |--------------------------------------------------------------------------
        |
        | A normal product is available only when at least one
        | active variant has usable inventory.
        |
        | available_quantity already represents:
        |
        | quantity_on_hand - quantity_reserved
        |
        */

        $hasAvailableVariant =
            $product
                ->variants
                ->contains(
                    function (
                        $variant,
                    ): bool {
                        $inventory =
                            $variant
                                ->inventory;

                        if (
                            ! $inventory
                        ) {
                            return false;
                        }

                        return
                            $inventory
                                ->available_quantity
                            > 0;
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Effective Availability
        |--------------------------------------------------------------------------
        |
        | Coming Soon:
        | Keep the configured Coming Soon status.
        |
        | Explicit Out of Stock:
        | Keep the configured Out of Stock status.
        |
        | Available:
        | Verify that real variant stock actually exists.
        |
        */

        if (
            $product
                ->availability_status
            ===
            Product::AVAILABILITY_COMING_SOON
        ) {
            $availabilityStatus =
                Product::AVAILABILITY_COMING_SOON;
        } elseif (
            $product
                ->availability_status
            ===
            Product::AVAILABILITY_OUT_OF_STOCK
        ) {
            $availabilityStatus =
                Product::AVAILABILITY_OUT_OF_STOCK;
        } else {
            $availabilityStatus =
                $hasAvailableVariant
                    ? Product::AVAILABILITY_AVAILABLE
                    : Product::AVAILABILITY_OUT_OF_STOCK;
        }

        /*
        |--------------------------------------------------------------------------
        | Availability Label
        |--------------------------------------------------------------------------
        */

        $availabilityLabel =
            match (
                $availabilityStatus
            ) {
                Product::AVAILABILITY_AVAILABLE => 'Available',

                Product::AVAILABILITY_COMING_SOON => 'Coming Soon',

                Product::AVAILABILITY_OUT_OF_STOCK => 'Out of Stock',

                default => 'Unavailable',
            };

        /*
        |--------------------------------------------------------------------------
        | Variant Mode Label
        |--------------------------------------------------------------------------
        */

        $variantModeLabel =
            match (
                $product->variant_mode
            ) {
                Product::VARIANT_MODE_PROGRAM_AND_SIZE => 'Program and Size',

                Product::VARIANT_MODE_SIZE_ONLY => 'Size Only',

                Product::VARIANT_MODE_STANDARD => 'Standard / No Size',

                default => 'Unknown',
            };

        $priceRange =
            $this->priceRange(
                $product,
            );

        /*
        |--------------------------------------------------------------------------
        | Product Data
        |--------------------------------------------------------------------------
        */

        return [
            'id' => $product->id,

            'code' => $product->code,

            'name' => $product->name,

            'description' => $product->description,

            'price_min' => $priceRange['min'],

            'price_max' => $priceRange['max'],

            'variant_mode' => $product
                ->variant_mode,

            'variant_mode_label' => $variantModeLabel,

            'variants_count' => $product
                ->variants
                ->count(),

            'availability_status' => $availabilityStatus,

            'availability_label' => $availabilityLabel,

            'availability_summary' => $availabilityLabel,

            'stock_urgency' => $this->stockUrgency(
                $product,
                $availabilityStatus,
            ),

            'early_bird' => $this->earlyBirdInfo(
                $product,
            ),

            'preorder_enabled' => (bool)
                $product
                    ->preorder_enabled,

            'accepts_preorders' => $product
                ->acceptsPreorders(),

            'expected_release_date' => $product
                ->expected_release_date
                ?->format(
                    'M d, Y',
                ),

            'new_badge_duration_days' => $product->new_badge_duration_days,

            'new_badge_started_at' => $product->new_badge_started_at
                    ? $product->new_badge_started_at->toISOString()
                    : null,

            'restocked_badge_duration_days' => $product->restocked_badge_duration_days,

            'restocked_badge_started_at' => $product->restocked_badge_started_at
                    ? $product->restocked_badge_started_at->toISOString()
                    : null,

            'image_url' => $product
                ->image_path
                ? asset(
                    'storage/'
                    .$product
                        ->image_path,
                )
                    : null,

            'category' => [
                'id' => $product
                    ->category
                    ->id,

                'name' => $product
                    ->category
                    ->name,
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
                ->where(
                    'item_type',
                    OrderItem::TYPE_PREORDER,
                )
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
