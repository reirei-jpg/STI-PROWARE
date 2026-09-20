<?php

namespace App\Services;

use App\Filters\ProductFilters;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * The student storefront: which products a student sees, in what order, and
 * how each product card is described.
 *
 * Shared by the website Home page and the mobile app API so both always show
 * the same products, statuses and prices.
 */
class StorefrontCatalog
{
    /**
     * A product is flagged as low stock once its total
     * available quantity across variants falls to or
     * below this amount.
     */
    private const LOW_STOCK_THRESHOLD = 10;

    /**
     * Products shown per page.
     */
    public const PER_PAGE = 12;

    public function __construct(
        private readonly ProductFilters $productFilters,
    ) {}

    /**
     * Search and status values currently applied, for the interface.
     *
     * @return array{search: string, status: string}
     */
    public function filterValues(): array
    {
        return $this->productFilters->values();
    }

    /**
     * One page of the product grid.
     *
     * Coming Soon products are excluded at the query because they are shown
     * in their own carousel; excluding them before paginating keeps page
     * counts and totals accurate. Only the search filter goes through
     * ProductFilters. The status filter is applied against the EFFECTIVE
     * status shown on each card, so choosing "Available" never lists a card
     * labelled Out of Stock.
     *
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function grid(
        Request $request,
        int $perPage = self::PER_PAGE,
    ): LengthAwarePaginator {
        $requestedStatus = $this->productFilters->availabilityStatus();

        $eligibleProducts = $this->productFilters
            ->applySearchFilter(
                Product::query()
                    ->with($this->relations())
                    ->where('is_active', true)
                    ->whereNotIn('availability_status', [
                        Product::AVAILABILITY_INACTIVE,
                        Product::AVAILABILITY_COMING_SOON,
                    ]),
            )
            ->latest()
            ->get()
            ->map(fn (Product $product): array => $this->presentProduct($product))
            ->when(
                $requestedStatus,
                fn ($products) => $products->filter(
                    fn (array $product): bool => $product['availability_status']
                        === $requestedStatus,
                ),
            );

        /*
        | Available products first. Within each tier, a pseudo-random order
        | that stays identical for the whole day, so paging never repeats or
        | skips a product mid-browse. It rotates at midnight Philippine time.
        */
        $availabilityPriority = [
            Product::AVAILABILITY_AVAILABLE => 0,
            Product::AVAILABILITY_OUT_OF_STOCK => 1,
        ];

        $dailySeed = now('Asia/Manila')->format('Y-m-d');

        $sortedProducts = $eligibleProducts
            ->sortBy(
                fn (array $product): int => (
                    ($availabilityPriority[$product['availability_status']] ?? 3)
                    * 1_000_000_000
                )
                    + crc32("{$dailySeed}-{$product['id']}") % 1_000_000_000,
            )
            ->values();

        $currentPage = LengthAwarePaginator::resolveCurrentPage();

        return new LengthAwarePaginator(
            $sortedProducts->forPage($currentPage, $perPage)->values(),
            $sortedProducts->count(),
            $perPage,
            $currentPage,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ],
        );
    }

    /**
     * Every upcoming product, independent of search or page.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function comingSoon(): Collection
    {
        return Product::query()
            ->with($this->relations())
            ->where('is_active', true)
            ->where('availability_status', Product::AVAILABILITY_COMING_SOON)
            ->latest()
            ->get()
            ->map(fn (Product $product): array => $this->presentProduct($product))
            ->values();
    }

    /**
     * One product in full, for its own page: the card details plus every
     * active variant with its price and a general stock status.
     *
     * Students receive only general stock availability, never exact internal
     * counts. The website product page and the mobile app share this.
     *
     * @return array<string, mixed>
     */
    public function detail(Product $product): array
    {
        $product->load([
            'category:id,name',
            'variants' => fn ($query) => $query
                ->where('is_active', true)
                ->orderBy('program')
                ->orderBy('size')
                ->orderBy('variant_name')
                ->with([
                    'inventory:id,product_variant_id,quantity_on_hand,quantity_reserved,reorder_level',
                ]),
        ]);

        $card = $this->presentProduct($product);

        $variants = $product->variants
            ->map(function ($variant): array {
                $availableQuantity = $variant->inventory
                    ? $variant->inventory->available_quantity
                    : 0;

                return [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'program' => $variant->program,
                    'size' => $variant->size,
                    'variant_name' => $variant->variant_name,
                    'variant_key' => $variant->variant_key,
                    'selling_price' => $variant->selling_price,
                    'is_available' => $availableQuantity > 0,
                    'stock_status' => $availableQuantity > 0
                        ? 'Available'
                        : 'Unavailable',
                ];
            })
            ->values();

        return [
            'id' => $product->id,
            'code' => $product->code,
            'name' => $product->name,
            'description' => $product->description,
            'base_price' => $product->base_price,
            'image_url' => $card['image_url'],
            'variant_mode' => $product->variant_mode,
            'variant_mode_label' => $card['variant_mode_label'],
            'availability_status' => $card['availability_status'],
            'availability_label' => $card['availability_label'],
            'availability_summary' => $this->availabilitySummary(
                $product,
                $card['availability_status'],
            ),
            'preorder_enabled' => $product->preorder_enabled,
            'accepts_preorders' => $product->acceptsPreorders(),
            'expected_release_date' => $card['expected_release_date'],
            'category' => $card['category'],
            'variants' => $variants,

            // Extra details the mobile app shows on the product page.
            'price_min' => $card['price_min'],
            'price_max' => $card['price_max'],
            'stock_urgency' => $card['stock_urgency'],
            'early_bird' => $card['early_bird'],
        ];
    }

    /**
     * A public-facing summary that never exposes exact stock quantities.
     */
    private function availabilitySummary(
        Product $product,
        string $effectiveStatus,
    ): string {
        if ($effectiveStatus === Product::AVAILABILITY_COMING_SOON) {
            return $product->acceptsPreorders()
                ? 'Preorder Available'
                : 'Coming Soon';
        }

        return $effectiveStatus === Product::AVAILABILITY_AVAILABLE
            ? 'Available'
            : 'Out of Stock';
    }

    /**
     * @return array<string, mixed>
     */
    private function relations(): array
    {
        return [
            'category:id,name',
            'variants' => fn ($query) => $query
                ->where('is_active', true)
                ->with('inventory'),
        ];
    }

    /**
     * Build the full storefront-card payload for one product.
     *
     * @return array<string, mixed>
     */
    private function presentProduct(Product $product): array
    {
        $hasAvailableVariant = $product->variants->contains(
            fn ($variant): bool => $variant->inventory !== null
                && $variant->inventory->available_quantity > 0,
        );

        /*
        | Effective availability: keep Coming Soon and an explicit Out of
        | Stock as configured; for "available", verify real variant stock.
        */
        if ($product->availability_status === Product::AVAILABILITY_COMING_SOON) {
            $availabilityStatus = Product::AVAILABILITY_COMING_SOON;
        } elseif ($product->availability_status === Product::AVAILABILITY_OUT_OF_STOCK) {
            $availabilityStatus = Product::AVAILABILITY_OUT_OF_STOCK;
        } else {
            $availabilityStatus = $hasAvailableVariant
                ? Product::AVAILABILITY_AVAILABLE
                : Product::AVAILABILITY_OUT_OF_STOCK;
        }

        $availabilityLabel = match ($availabilityStatus) {
            Product::AVAILABILITY_AVAILABLE => 'Available',
            Product::AVAILABILITY_COMING_SOON => 'Coming Soon',
            Product::AVAILABILITY_OUT_OF_STOCK => 'Out of Stock',
            default => 'Unavailable',
        };

        $variantModeLabel = match ($product->variant_mode) {
            Product::VARIANT_MODE_PROGRAM_AND_SIZE => 'Program and Size',
            Product::VARIANT_MODE_SIZE_ONLY => 'Size Only',
            Product::VARIANT_MODE_STANDARD => 'Standard / No Size',
            default => 'Unknown',
        };

        $priceRange = $this->priceRange($product);

        return [
            'id' => $product->id,
            'code' => $product->code,
            'name' => $product->name,
            'description' => $product->description,
            'price_min' => $priceRange['min'],
            'price_max' => $priceRange['max'],
            'variant_mode' => $product->variant_mode,
            'variant_mode_label' => $variantModeLabel,
            'variants_count' => $product->variants->count(),
            'availability_status' => $availabilityStatus,
            'availability_label' => $availabilityLabel,
            'availability_summary' => $availabilityLabel,
            'stock_urgency' => $this->stockUrgency($product, $availabilityStatus),
            'early_bird' => $this->earlyBirdInfo($product),
            'preorder_enabled' => (bool) $product->preorder_enabled,
            'accepts_preorders' => $product->acceptsPreorders(),
            'expected_release_date' => $product->expected_release_date?->format('M d, Y'),
            'new_badge_duration_days' => $product->new_badge_duration_days,
            'new_badge_started_at' => $product->new_badge_started_at
                ? $product->new_badge_started_at->toISOString()
                : null,
            'restocked_badge_duration_days' => $product->restocked_badge_duration_days,
            'restocked_badge_started_at' => $product->restocked_badge_started_at
                ? $product->restocked_badge_started_at->toISOString()
                : null,
            'image_url' => $product->image_path
                ? asset('storage/'.$product->image_path)
                : null,
            'category' => [
                'id' => $product->category->id,
                'name' => $product->category->name,
            ],
        ];
    }

    /**
     * The lowest and highest selling price across a product's active
     * variants, falling back to the base price when it has no variants yet.
     *
     * @return array{min: string, max: string}
     */
    private function priceRange(Product $product): array
    {
        $prices = $product->variants->map(
            fn ($variant): float => (float) ($variant->price_override ?? $product->base_price),
        );

        if ($prices->isEmpty()) {
            $basePrice = number_format((float) $product->base_price, 2, '.', '');

            return ['min' => $basePrice, 'max' => $basePrice];
        }

        return [
            'min' => number_format($prices->min(), 2, '.', ''),
            'max' => number_format($prices->max(), 2, '.', ''),
        ];
    }

    /**
     * Flag a truly available product as low stock without exposing the exact
     * remaining quantity to students.
     */
    private function stockUrgency(
        Product $product,
        string $effectiveStatus,
    ): ?string {
        if ($effectiveStatus !== Product::AVAILABILITY_AVAILABLE) {
            return null;
        }

        $totalAvailable = $product->variants->sum(
            fn ($variant): int => $variant->inventory?->available_quantity ?? 0,
        );

        return $totalAvailable > 0 && $totalAvailable <= self::LOW_STOCK_THRESHOLD
            ? 'low_stock'
            : null;
    }

    /**
     * The remaining early-bird preorder discount for a coming-soon product,
     * or null when early-bird pricing does not apply or no slots remain.
     *
     * @return array{discount_percent: string, remaining_slots: int}|null
     */
    private function earlyBirdInfo(Product $product): ?array
    {
        if (! $product->isComingSoon() || ! $product->acceptsPreorders()) {
            return null;
        }

        $slots = max(0, (int) ($product->preorder_early_bird_slots ?? 0));

        $discountPercent = max(
            0,
            (float) ($product->preorder_early_bird_discount_percent ?? 0),
        );

        if ($slots <= 0 || $discountPercent <= 0) {
            return null;
        }

        $usedSlots = OrderItem::query()
            ->whereHas(
                'productVariant',
                fn ($query) => $query->where('product_id', $product->id),
            )
            ->where('early_bird_applied', true)
            ->where(
                'preorder_status',
                '!=',
                OrderItem::PREORDER_STATUS_CANCELLED,
            )
            ->sum('quantity');

        $remainingSlots = max(0, $slots - (int) $usedSlots);

        if ($remainingSlots <= 0) {
            return null;
        }

        return [
            'discount_percent' => number_format($discountPercent, 2, '.', ''),
            'remaining_slots' => $remainingSlots,
        ];
    }
}
