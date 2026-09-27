<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Services\StockAlertService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Display the centralized PROWARE inventory.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        |
        | Inventory Management is shared by:
        |
        | - Admin
        | - PROWARE Specialist
        |
        */

        abort_unless(
            $user
            && in_array(
                $user->role,
                [
                    'super_admin',
                    'admin',
                    'specialist',
                ],
                true,
            ),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Read Search / Filter Values
        |--------------------------------------------------------------------------
        */

        $search = trim(
            (string)
            $request->query(
                'search',
                '',
            ),
        );

        $status = (string)
            $request->query(
                'status',
                'all',
            );

        /*
         * Only allow known stock-status filters.
         */
        if (
            ! in_array(
                $status,
                [
                    'all',
                    'in_stock',
                    'low_stock',
                    'out_of_stock',
                ],
                true,
            )
        ) {
            $status = 'all';
        }

        /*
        |--------------------------------------------------------------------------
        | Main Inventory Query
        |--------------------------------------------------------------------------
        |
        | Important:
        |
        | We no longer use ->get() here.
        |
        | PostgreSQL will search, filter, sort, and paginate before
        | Laravel receives the final inventory rows.
        |
        */

        $inventoryQuery =
            Inventory::query()
                ->with([
                    'productVariant.product.category',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        |
        | Staff can search using:
        |
        | - Product code
        | - Product name
        | - Category
        | - SKU
        | - Variant name
        | - Program
        | - Size
        |
        */

        if ($search !== '') {
            $inventoryQuery->where(
                function (
                    Builder $query,
                ) use (
                    $search,
                ): void {
                    $query->whereHas(
                        'productVariant',
                        function (
                            Builder $variantQuery,
                        ) use (
                            $search,
                        ): void {
                            $variantQuery
                                ->where(
                                    'sku',
                                    'ilike',
                                    '%'.$search.'%',
                                )
                                ->orWhere(
                                    'variant_name',
                                    'ilike',
                                    '%'.$search.'%',
                                )
                                ->orWhere(
                                    'program',
                                    'ilike',
                                    '%'.$search.'%',
                                )
                                ->orWhere(
                                    'size',
                                    'ilike',
                                    '%'.$search.'%',
                                )
                                ->orWhereHas(
                                    'product',
                                    function (
                                        Builder $productQuery,
                                    ) use (
                                        $search,
                                    ): void {
                                        $productQuery
                                            ->where(
                                                'code',
                                                'ilike',
                                                '%'.$search.'%',
                                            )
                                            ->orWhere(
                                                'name',
                                                'ilike',
                                                '%'.$search.'%',
                                            )
                                            ->orWhereHas(
                                                'category',
                                                function (
                                                    Builder $categoryQuery,
                                                ) use (
                                                    $search,
                                                ): void {
                                                    $categoryQuery
                                                        ->where(
                                                            'name',
                                                            'ilike',
                                                            '%'.$search.'%',
                                                        );
                                                },
                                            );
                                    },
                                );
                        },
                    );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Stock Status Filter
        |--------------------------------------------------------------------------
        |
        | Your Inventory model calculates:
        |
        | available =
        | quantity_on_hand - quantity_reserved
        |
        | We reproduce the same logic here so PostgreSQL can perform
        | the filtering before pagination.
        |
        */

        if ($status === 'out_of_stock') {
            $inventoryQuery->whereRaw(
                'GREATEST(quantity_on_hand - quantity_reserved, 0) = 0',
            );
        }

        if ($status === 'low_stock') {
            $inventoryQuery
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) > 0',
                )
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) <= reorder_level',
                );
        }

        if ($status === 'in_stock') {
            $inventoryQuery->whereRaw(
                'GREATEST(quantity_on_hand - quantity_reserved, 0) > reorder_level',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Group By Product
        |--------------------------------------------------------------------------
        |
        | The page lists products, and each product expands to show its
        | variants. Search and the status filter decide which variants
        | match; a product is listed when at least one of its variants
        | matches, and only the matching variants are shown under it.
        | The product's own totals always cover all of its variants.
        |
        | Twenty products are returned per page, sorted by product name.
        */

        $inventoryQuery
            ->join(
                'product_variants',
                'inventories.product_variant_id',
                '=',
                'product_variants.id',
            )
            ->join(
                'products',
                'product_variants.product_id',
                '=',
                'products.id',
            );

        $productPage = (clone $inventoryQuery)
            ->toBase()
            ->select(
                'products.id',
                'products.name',
            )
            ->groupBy(
                'products.id',
                'products.name',
            )
            ->orderBy(
                'products.name',
            )
            ->paginate(20)
            ->withQueryString();

        $productIds = $productPage
            ->getCollection()
            ->pluck('id')
            ->all();

        $matchingVariants = (clone $inventoryQuery)
            ->whereIn(
                'products.id',
                $productIds,
            )
            ->orderBy(
                'products.name',
            )
            ->orderBy(
                'product_variants.variant_name',
            )
            ->select(
                'inventories.*',
            )
            ->get()
            ->map(
                fn (Inventory $inventory): array => $this->presentInventoryRow($inventory),
            )
            ->groupBy(
                fn (array $row): int => (int) $row['product']['id'],
            );

        $productTotals = Inventory::query()
            ->join(
                'product_variants',
                'inventories.product_variant_id',
                '=',
                'product_variants.id',
            )
            ->whereIn(
                'product_variants.product_id',
                $productIds,
            )
            ->groupBy(
                'product_variants.product_id',
            )
            ->selectRaw('product_variants.product_id AS product_id')
            ->selectRaw('COUNT(*) AS variant_count')
            ->selectRaw('COALESCE(SUM(inventories.quantity_on_hand), 0) AS total_on_hand')
            ->selectRaw('COALESCE(SUM(inventories.quantity_reserved), 0) AS total_reserved')
            ->selectRaw('COALESCE(SUM(GREATEST(inventories.quantity_on_hand - inventories.quantity_reserved, 0)), 0) AS total_available')
            ->selectRaw('COUNT(*) FILTER (WHERE GREATEST(inventories.quantity_on_hand - inventories.quantity_reserved, 0) = 0) AS out_of_stock_count')
            ->selectRaw('COUNT(*) FILTER (WHERE GREATEST(inventories.quantity_on_hand - inventories.quantity_reserved, 0) > 0 AND GREATEST(inventories.quantity_on_hand - inventories.quantity_reserved, 0) <= inventories.reorder_level) AS low_stock_count')
            ->toBase()
            ->get()
            ->keyBy('product_id');

        $products = $productPage->through(
            function (object $productRow) use ($matchingVariants, $productTotals): array {
                $variants = $matchingVariants
                    ->get((int) $productRow->id, collect())
                    ->values();

                $totals = $productTotals->get($productRow->id);

                return [
                    'product' => $variants->first()['product'] ?? [
                        'id' => (int) $productRow->id,
                        'code' => 'N/A',
                        'name' => $productRow->name,
                        'category' => null,
                    ],

                    'variant_count' => (int) ($totals->variant_count ?? 0),

                    'total_on_hand' => (int) ($totals->total_on_hand ?? 0),

                    'total_reserved' => (int) ($totals->total_reserved ?? 0),

                    'total_available' => (int) ($totals->total_available ?? 0),

                    'low_stock_count' => (int) ($totals->low_stock_count ?? 0),

                    'out_of_stock_count' => (int) ($totals->out_of_stock_count ?? 0),

                    'variants' => $variants->all(),
                ];
            },
        );

        /*
        |--------------------------------------------------------------------------
        | Global Inventory Summary
        |--------------------------------------------------------------------------
        |
        | These values intentionally represent the ENTIRE inventory.
        |
        | They do not change when:
        |
        | - searching
        | - filtering
        | - moving to another page
        |
        | This makes the summary cards reliable operational totals.
        |
        */

        $summary = [
            'variants' => Inventory::query()
                ->count(),

            'total_on_hand' => (int)
                Inventory::query()
                    ->sum(
                        'quantity_on_hand',
                    ),

            'total_reserved' => (int)
                Inventory::query()
                    ->sum(
                        'quantity_reserved',
                    ),

            'total_available' => (int)
                Inventory::query()
                    ->selectRaw(
                        'COALESCE(SUM(GREATEST(quantity_on_hand - quantity_reserved, 0)), 0) AS total',
                    )
                    ->value(
                        'total',
                    ),

            'low_stock' => Inventory::query()
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) > 0',
                )
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) <= reorder_level',
                )
                ->count(),

            'out_of_stock' => Inventory::query()
                ->whereRaw(
                    'GREATEST(quantity_on_hand - quantity_reserved, 0) = 0',
                )
                ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | Send Data to React
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'staff/Inventory/Index',
            [
                'products' => $products,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'status' => $status,
                ],
            ],
        );
    }

    /**
     * One variant's stock, in the shape the Inventory page shows it.
     *
     * @return array{id: int, product_variant_id: int, product: array{id: int|null, code: string, name: string, category: string|null}, variant: array{id: int|null, sku: string, variant_name: string, program: string|null, size: string|null, is_active: bool}, quantity_on_hand: int, quantity_reserved: int, available_quantity: int, reorder_level: int, stock_status: string}
     */
    private function presentInventoryRow(Inventory $inventory): array
    {
        $variant = $inventory->productVariant;

        $product = $variant?->product;

        return [
            'id' => $inventory->id,

            'product_variant_id' => $inventory->product_variant_id,

            'product' => [
                'id' => $product?->id,

                'code' => $product?->code ?? 'N/A',

                'name' => $product?->name ?? 'Unknown Product',

                'category' => $product?->category?->name,
            ],

            'variant' => [
                'id' => $variant?->id,

                'sku' => $variant?->sku ?? 'N/A',

                'variant_name' => $variant?->variant_name ?? 'Standard',

                'program' => $variant?->program,

                'size' => $variant?->size,

                'is_active' => (bool) ($variant?->is_active ?? false),
            ],

            'quantity_on_hand' => (int) $inventory->quantity_on_hand,

            'quantity_reserved' => (int) $inventory->quantity_reserved,

            'available_quantity' => (int) $inventory->available_quantity,

            'reorder_level' => (int) $inventory->reorder_level,

            'stock_status' => $inventory->stock_status,
        ];
    }

    /**
     * Update the reorder/restock threshold.
     */
    public function updateReorderLevel(
        Request $request,
        Inventory $inventory,
        StockAlertService $stockAlertService,
    ): RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Admin Only
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate(
                [
                    'reorder_level' => [
                        'required',
                        'integer',
                        'min:0',
                        'max:999999',
                    ],
                ],
                [
                    'reorder_level.required' => 'The restock threshold is required.',

                    'reorder_level.integer' => 'The restock threshold must be a whole number.',

                    'reorder_level.min' => 'The restock threshold cannot be negative.',

                    'reorder_level.max' => 'The restock threshold is too large.',
                ],
            );

        /*
        |--------------------------------------------------------------------------
        | Update Threshold
        |--------------------------------------------------------------------------
        */

        $inventory->update([
            'reorder_level' => (int)
                $validated[
                    'reorder_level'
                ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Reload Inventory
        |--------------------------------------------------------------------------
        */

        $inventory->refresh();

        /*
        |--------------------------------------------------------------------------
        | Recheck Alert Status
        |--------------------------------------------------------------------------
        |
        | Example:
        |
        | Available stock = 8
        | Old threshold = 5
        |
        | Admin changes threshold to 10.
        |
        | 8 <= 10
        |
        | PROWARE should immediately notify Admin/Specialist that
        | the restock threshold has been reached.
        |
        */

        $stockAlertService->check(
            $inventory,
        );

        return back()->with(
            'success',
            'Restock threshold updated successfully.',
        );
    }
}
