<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller
{
    /**
     * Display Stock In / Stock Out history.
     */
    public function index(
        Request $request,
    ): Response {
        $user = $request->user();

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
        | Filters
        |--------------------------------------------------------------------------
        */

        $search = trim(
            (string) $request->query(
                'search',
                '',
            ),
        );

        $direction = (string)
            $request->query(
                'direction',
                'all',
            );

        if (
            ! in_array(
                $direction,
                [
                    'all',
                    'in',
                    'out',
                ],
                true,
            )
        ) {
            $direction = 'all';
        }

        /*
        |--------------------------------------------------------------------------
        | Stock Movement Query
        |--------------------------------------------------------------------------
        */

        $query =
            StockMovement::query()
                ->with([
                    'productVariant.product.category',
                    'performer:id,name,email',
                ]);

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {
            $query->where(
                function (
                    Builder $query,
                ) use (
                    $search,
                ): void {
                    $query
                        ->where(
                            'receipt_number',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'supplier_reference_number',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhere(
                            'notes',
                            'ilike',
                            '%'.$search.'%',
                        )
                        ->orWhereHas(
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
                                                );
                                        },
                                    );
                            },
                        )
                        ->orWhereHas(
                            'performer',
                            function (
                                Builder $performerQuery,
                            ) use (
                                $search,
                            ): void {
                                $performerQuery
                                    ->where(
                                        'name',
                                        'ilike',
                                        '%'.$search.'%',
                                    );
                            },
                        );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Direction Filter
        |--------------------------------------------------------------------------
        |
        | Positive quantity_change = Stock In
        | Negative quantity_change = Stock Out
        |
        | quantity_change = 0 is neither and is excluded from these filters.
        |
        */

        if ($direction === 'in') {
            $query->where(
                'quantity_change',
                '>',
                0,
            );
        }

        if ($direction === 'out') {
            $query->where(
                'quantity_change',
                '<',
                0,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Movement History
        |--------------------------------------------------------------------------
        */

        $movements =
            $query
                ->latest('created_at')
                ->latest('id')
                ->paginate(20)
                ->withQueryString()
                ->through(
                    function (
                        StockMovement $movement,
                    ): array {
                        $variant =
                            $movement
                                ->productVariant;

                        $product =
                            $variant
                                ?->product;

                        $quantityChange =
                            (int)
                            $movement
                                ->quantity_change;

                        return [
                            'id' => $movement->id,

                            'movement_type' => $movement
                                ->movement_type,

                            'direction' => $quantityChange > 0
                                    ? 'in'
                                    : (
                                        $quantityChange < 0
                                            ? 'out'
                                            : 'neutral'
                                    ),

                            'quantity_change' => $quantityChange,

                            'quantity_before' => (int)
                                $movement
                                    ->quantity_before,

                            'quantity_after' => (int)
                                $movement
                                    ->quantity_after,

                            'receipt_number' => $movement
                                ->receipt_number,

                            'supplier_reference_number' => $movement
                                ->supplier_reference_number,

                            'notes' => $movement
                                ->notes,

                            'created_at' => $movement
                                ->created_at
                                ?->timezone(config('app.display_timezone'))
                                ->format(
                                    'M d, Y h:i A',
                                ),

                            'product' => [
                                'id' => $product?->id,

                                'code' => $product?->code
                                    ?? 'N/A',

                                'name' => $product?->name
                                    ?? 'Unknown Product',

                                'category' => $product
                                    ?->category
                                    ?->name,
                            ],

                            'variant' => [
                                'id' => $variant?->id,

                                'sku' => $variant?->sku
                                    ?? 'N/A',

                                'variant_name' => $variant
                                    ?->variant_name
                                    ?? 'Standard',

                                'program' => $variant
                                    ?->program,

                                'size' => $variant
                                    ?->size,
                            ],

                            'performed_by' => [
                                'id' => $movement
                                    ->performer
                                    ?->id,

                                'name' => $movement
                                    ->performer
                                    ?->name
                                    ?? 'System',
                            ],
                        ];
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Global Summary
        |--------------------------------------------------------------------------
        |
        | These are based on ALL recorded StockMovement rows.
        |
        */

        $stockIn =
            (int)
            StockMovement::query()
                ->where(
                    'quantity_change',
                    '>',
                    0,
                )
                ->sum(
                    'quantity_change',
                );

        $stockOut =
            abs(
                (int)
                StockMovement::query()
                    ->where(
                        'quantity_change',
                        '<',
                        0,
                    )
                    ->sum(
                        'quantity_change',
                    ),
            );

        $summary = [
            'stock_in' => $stockIn,

            'stock_out' => $stockOut,

            'net_movement' => $stockIn
                - $stockOut,

            'movement_count' => StockMovement::query()
                ->count(),
        ];

        /*
        |--------------------------------------------------------------------------
        | Send to React
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'staff/Inventory/Movements',
            [
                'movements' => $movements,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'direction' => $direction,
                ],

                /*
                |--------------------------------------------------------------------------
                | Adjustable Products
                |--------------------------------------------------------------------------
                |
                | Only Admin can record an inventory adjustment, so this
                | list is only built for Admin to avoid sending it to
                | Specialist for no reason.
                */

                'products' => $user->isAdminLevel()
                        ? $this->adjustableProducts()
                        : [],
            ],
        );
    }

    /**
     * Active products and variants available for a manual
     * inventory adjustment.
     *
     * @return array<int, array<string, mixed>>
     */
    private function adjustableProducts(): array
    {
        return Product::query()
            ->where('is_active', true)
            ->whereHas(
                'variants',
                fn ($query) => $query->where('is_active', true),
            )
            ->with([
                'variants' => fn ($query) => $query
                    ->where('is_active', true)
                    ->orderBy('variant_name'),
            ])
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'display_name' => "{$product->code} — {$product->name}",
                'variants' => $product->variants
                    ->map(fn (ProductVariant $variant): array => [
                        'id' => $variant->id,
                        'sku' => $variant->sku,
                        'display_name' => $variant->variant_name
                            ?? $variant->sku,
                    ])
                    ->values(),
            ])
            ->values()
            ->toArray();
    }
}
