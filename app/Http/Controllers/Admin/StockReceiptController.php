<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReceiveStockRequest;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Services\AuditLogger;
use App\Services\PreorderAvailabilityService;
use App\Services\ProductCodeGenerator;
use App\Services\ProductVariantGenerator;
use App\Services\StockAlertService;
use App\Services\StockReceiptNumberGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class StockReceiptController extends Controller
{
    /**
     * Display stock receipt history.
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

        $search =
            trim(
                (string)
                $request->query(
                    'search',
                    '',
                ),
            );

        $date =
            trim(
                (string)
                $request->query(
                    'date',
                    'all',
                ),
            );

        if (
            ! in_array(
                $date,
                [
                    'all',
                    'today',
                ],
                true,
            )
        ) {
            $date = 'all';
        }

        /*
        |--------------------------------------------------------------------------
        | Stock Receipt Query
        |--------------------------------------------------------------------------
        |
        | Each TYPE_RECEIVE StockMovement represents one received variant.
        |
        */

        $query =
            StockMovement::query()
                ->with([
                    'performer:id,name,email',
                    'productVariant.product:id,code,name',
                ])
                ->where(
                    'movement_type',
                    StockMovement::TYPE_RECEIVE,
                )
                ->latest();

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {
            $query->where(
                function ($query) use (
                    $search,
                ) {
                    $query
                        ->where(
                            'receipt_number',
                            'ilike',
                            "%{$search}%",
                        )
                        ->orWhere(
                            'supplier_reference_number',
                            'ilike',
                            "%{$search}%",
                        )
                        ->orWhereHas(
                            'productVariant.product',
                            function ($productQuery) use (
                                $search,
                            ) {
                                $productQuery
                                    ->where(
                                        'name',
                                        'ilike',
                                        "%{$search}%",
                                    )
                                    ->orWhere(
                                        'code',
                                        'ilike',
                                        "%{$search}%",
                                    );
                            },
                        )
                        ->orWhereHas(
                            'productVariant',
                            function ($variantQuery) use (
                                $search,
                            ) {
                                $variantQuery
                                    ->where(
                                        'variant_name',
                                        'ilike',
                                        "%{$search}%",
                                    )
                                    ->orWhere(
                                        'sku',
                                        'ilike',
                                        "%{$search}%",
                                    );
                            },
                        )
                        ->orWhereHas(
                            'performer',
                            function ($userQuery) use (
                                $search,
                            ) {
                                $userQuery->where(
                                    'name',
                                    'ilike',
                                    "%{$search}%",
                                );
                            },
                        );
                },
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Date Filter
        |--------------------------------------------------------------------------
        */

        if ($date === 'today') {
            $query->whereDate(
                'created_at',
                today(),
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Paginated Receipt History
        |--------------------------------------------------------------------------
        */

        $receipts =
            $query
                ->paginate(15)
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

                        return [
                            'id' => $movement->id,

                            'receipt_number' => $movement
                                ->receipt_number,

                            'supplier_reference_number' => $movement
                                ->supplier_reference_number,

                            'movement_type' => $movement
                                ->movement_type,

                            'quantity_received' => (int)
                                $movement
                                    ->quantity_change,

                            'quantity_before' => (int)
                                $movement
                                    ->quantity_before,

                            'quantity_after' => (int)
                                $movement
                                    ->quantity_after,

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
                            ],

                            'variant' => [
                                'id' => $variant?->id,

                                'sku' => $variant?->sku
                                    ?? 'N/A',

                                'program' => $variant?->program,

                                'size' => $variant?->size,

                                'variant_name' => $variant
                                    ?->variant_name
                                    ?? 'Standard',
                            ],

                            'performed_by' => [
                                'id' => $movement
                                    ->performer
                                    ?->id,

                                'name' => $movement
                                    ->performer
                                    ?->name
                                    ?? 'Unknown Staff',

                                'email' => $movement
                                    ->performer
                                    ?->email,
                            ],
                        ];
                    },
                );

        /*
        |--------------------------------------------------------------------------
        | Summary
        |--------------------------------------------------------------------------
        */

        $summaryBase =
            StockMovement::query()
                ->where(
                    'movement_type',
                    StockMovement::TYPE_RECEIVE,
                );

        $summary = [
            'total_receipts' => (clone $summaryBase)
                ->count(),

            'total_units_received' => (int)
                (clone $summaryBase)
                    ->sum(
                        'quantity_change',
                    ),

            'received_today' => (clone $summaryBase)
                ->whereDate(
                    'created_at',
                    today(),
                )
                ->count(),

            'units_received_today' => (int)
                (clone $summaryBase)
                    ->whereDate(
                        'created_at',
                        today(),
                    )
                    ->sum(
                        'quantity_change',
                    ),
        ];

        return Inertia::render(
            'staff/StockReceipts/Index',
            [
                'receipts' => $receipts,

                'summary' => $summary,

                'filters' => [
                    'search' => $search,

                    'date' => $date,
                ],
            ],
        );
    }

    /**
     * Display the Receive Stock form.
     */

    /**
     * Display one stock receipt record.
     */
    public function show(
        Request $request,
        StockMovement $stockMovement,
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
        | Only Receiving Movements
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $stockMovement->movement_type ===
            StockMovement::TYPE_RECEIVE,
            404,
        );

        /*
        |--------------------------------------------------------------------------
        | Load Related Records
        |--------------------------------------------------------------------------
        */

        $stockMovement->load([
            'performer:id,name,email',
            'productVariant.product:id,code,name',
        ]);

        $variant =
            $stockMovement
                ->productVariant;

        $product =
            $variant
                ?->product;

        /*
        |--------------------------------------------------------------------------
        | Render Receipt Details
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'staff/StockReceipts/Show',
            [
                'receipt' => [
                    'id' => $stockMovement->id,

                    'receipt_number' => $stockMovement
                        ->receipt_number,

                    'supplier_reference_number' => $stockMovement
                        ->supplier_reference_number,

                    'movement_type' => $stockMovement
                        ->movement_type,

                    'quantity_received' => (int)
                        $stockMovement
                            ->quantity_change,

                    'quantity_before' => (int)
                        $stockMovement
                            ->quantity_before,

                    'quantity_after' => (int)
                        $stockMovement
                            ->quantity_after,

                    'notes' => $stockMovement
                        ->notes,

                    'created_at' => $stockMovement
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
                    ],

                    'variant' => [
                        'id' => $variant?->id,

                        'sku' => $variant?->sku
                            ?? 'N/A',

                        'program' => $variant?->program,

                        'size' => $variant?->size,

                        'variant_name' => $variant
                            ?->variant_name
                            ?? 'Standard',
                    ],

                    'performed_by' => [
                        'id' => $stockMovement
                            ->performer
                            ?->id,

                        'name' => $stockMovement
                            ->performer
                            ?->name
                            ?? 'Unknown Staff',

                        'email' => $stockMovement
                            ->performer
                            ?->email,
                    ],
                ],
            ],
        );
    }

    /**
     * Display the Receive Stock form.
     */
    public function create(
        Request $request,
    ): Response {
        $user =
            $request->user();

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
        | Existing Products / Variants
        |--------------------------------------------------------------------------
        |
        | Used to link an unlinked purchase-order item to an
        | existing PROWARE catalog variant before receiving.
        |
        */

        $products =
            Product::query()
                ->where(
                    'is_active',
                    true,
                )
                ->whereHas(
                    'variants',
                    fn ($query) => $query->where(
                        'is_active',
                        true,
                    ),
                )
                ->with([
                    'category:id,name',

                    'variants' => fn ($query) => $query
                        ->where(
                            'is_active',
                            true,
                        )
                        ->with([
                            'inventory:id,product_variant_id,quantity_on_hand,quantity_reserved,reorder_level',
                        ])
                        ->orderBy(
                            'variant_name',
                        ),
                ])
                ->orderBy(
                    'name',
                )
                ->get([
                    'id',
                    'category_id',
                    'code',
                    'name',
                    'variant_mode',
                    'base_price',
                ])
                ->map(
                    fn (
                        Product $product,
                    ): array => [
                        'id' => $product->id,

                        'code' => $product->code,

                        'name' => $product->name,

                        'display_name' => "{$product->code} — {$product->name}",

                        'variant_mode' => $product
                            ->variant_mode,

                        'category' => [
                            'id' => $product
                                ->category
                                ?->id,

                            'name' => $product
                                ->category
                                ?->name
                                ?? 'Uncategorized',
                        ],

                        'variants' => $product
                            ->variants
                            ->map(
                                fn (
                                    ProductVariant $variant,
                                ): array => [
                                    'id' => $variant->id,

                                    'sku' => $variant->sku,

                                    'program' => $variant
                                        ->program,

                                    'size' => $variant
                                        ->size,

                                    'variant_name' => $variant
                                        ->variant_name,

                                    'display_name' => $this
                                        ->variantDisplayName(
                                            $variant,
                                        ),

                                    'current_stock' => $variant
                                        ->inventory
                                        ? (int)
                                            $variant
                                                ->inventory
                                                ->quantity_on_hand
                                        : 0,

                                    'reserved_stock' => $variant
                                        ->inventory
                                        ? (int)
                                            $variant
                                                ->inventory
                                                ->quantity_reserved
                                        : 0,

                                    'available_stock' => $variant
                                        ->inventory
                                        ? (int)
                                            $variant
                                                ->inventory
                                                ->available_quantity
                                        : 0,

                                    'reorder_level' => $variant
                                        ->inventory
                                        ? (int)
                                            $variant
                                                ->inventory
                                                ->reorder_level
                                        : 0,

                                    'stock_status' => $variant
                                        ->inventory
                                        ? $variant
                                            ->inventory
                                            ->stock_status
                                        : 'out_of_stock',
                                ],
                            )
                            ->values(),
                    ],
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Outstanding Purchase Orders
        |--------------------------------------------------------------------------
        |
        | Only active POs that still have merchandise waiting to be received
        | are shown to the Specialist.
        |
        */

        $purchaseOrders =
            PurchaseOrder::query()
                ->whereNull(
                    'archived_at',
                )
                ->whereIn(
                    'status',
                    [
                        PurchaseOrder::STATUS_ORDERED,
                        PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
                    ],
                )
                ->whereHas(
                    'items',
                    function ($query): void {
                        $query
                            ->whereNull(
                                'archived_at',
                            )
                            ->whereColumn(
                                'quantity_received',
                                '<',
                                'quantity_ordered',
                            );
                    },
                )
                ->with([
                    'items' => function ($query): void {
                        $query
                            ->whereNull(
                                'archived_at',
                            )
                            ->whereColumn(
                                'quantity_received',
                                '<',
                                'quantity_ordered',
                            )
                            ->with([
                                'productVariant.product:id,code,name',
                            ])
                            ->orderBy(
                                'id',
                            );
                    },
                ])
                ->orderBy(
                    'expected_delivery_date',
                )
                ->orderBy(
                    'id',
                )
                ->get()
                ->map(
                    function (
                        PurchaseOrder $purchaseOrder,
                    ): array {
                        return [
                            'id' => $purchaseOrder->id,

                            'po_number' => $purchaseOrder
                                ->po_number,

                            'supplier_name' => $purchaseOrder
                                ->supplier_name,

                            'supplier_reference_number' => $purchaseOrder
                                ->supplier_reference_number,

                            'expected_delivery_date' => $purchaseOrder
                                ->expected_delivery_date
                                ?->format(
                                    'Y-m-d',
                                ),

                            'status' => $purchaseOrder
                                ->status,

                            'items' => $purchaseOrder
                                ->items
                                ->map(
                                    function (
                                        PurchaseOrderItem $item,
                                    ): array {
                                        $variant =
                                            $item
                                                ->productVariant;

                                        $product =
                                            $variant
                                                ?->product;

                                        $remaining =
                                            max(
                                                0,
                                                (int)
                                                $item
                                                    ->quantity_ordered
                                                - (int)
                                                $item
                                                    ->quantity_received,
                                            );

                                        return [
                                            'id' => $item->id,

                                            'item_type' => $item
                                                ->item_type,

                                            'merchandise_origin' => $item
                                                ->merchandise_origin,

                                            'product_variant_id' => $item
                                                ->product_variant_id,

                                            'product_code' => $product
                                                ?->code,

                                            'product_name' => $product
                                                ?->name,

                                            'variant_name' => $variant
                                                ?->variant_name,

                                            'sku' => $variant
                                                ?->sku
                                                ?? $item
                                                    ->manual_sku,

                                            'program' => $variant
                                                ?->program,

                                            'size' => $variant
                                                ?->size,

                                            'manual_name' => $item
                                                ->manual_name,

                                            'manual_description' => $item
                                                ->manual_description,

                                            'proposed_category_id' => $item
                                                ->proposed_category_id,

                                            'proposed_selling_price' => $item
                                                ->proposed_selling_price,

                                            'manual_sku' => $item
                                                ->manual_sku,

                                            'track_inventory' => (bool)
                                                $item
                                                    ->track_inventory,

                                            'quantity_ordered' => (int)
                                                $item
                                                    ->quantity_ordered,

                                            'quantity_received' => (int)
                                                $item
                                                    ->quantity_received,

                                            'quantity_remaining' => $remaining,

                                            'unit_cost' => $item
                                                ->unit_cost,
                                        ];
                                    },
                                )
                                ->values(),
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'staff/StockReceipts/Create',
            [
                'products' => $products,

                'purchaseOrders' => $purchaseOrders,

                /*
                |--------------------------------------------------------------------------
                | Active Categories
                |--------------------------------------------------------------------------
                |
                | Used when a legacy/manual PO item must first be registered
                | as a real PROWARE product before receiving its stock.
                |
                */

                'categories' => Category::query()
                    ->where(
                        'is_active',
                        true,
                    )
                    ->orderBy(
                        'name',
                    )
                    ->get([
                        'id',
                        'name',
                    ])
                    ->map(
                        fn (
                            Category $category,
                        ): array => [
                            'id' => $category->id,

                            'name' => $category->name,
                        ],
                    )
                    ->values(),
            ],
        );
    }

    /**
     * Receive stock and record the inventory movement.
     *
     * Every receipt must be tied to a purchase order item —
     * there is no untraceable "manual" receiving mode.
     */
    public function store(
        ReceiveStockRequest $request,
        StockReceiptNumberGenerator $receiptNumberGenerator,
        StockAlertService $stockAlertService,
        PreorderAvailabilityService $preorderAvailabilityService,
    ): RedirectResponse {
        $user =
            $request->user();

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

        $validated =
            $request->validated();

        /*
        |--------------------------------------------------------------------------
        | Receive Transaction
        |--------------------------------------------------------------------------
        */

        $result =
            DB::transaction(
                function () use (
                    $request,
                    $validated,
                    $receiptNumberGenerator,
                ): array {
                    /*
                    |--------------------------------------------------------------------------
                    | Common Quantity
                    |--------------------------------------------------------------------------
                    */

                    $quantityReceived =
                        (int)
                        $validated[
                            'quantity'
                        ];

                    /*
                    |--------------------------------------------------------------------------
                    | Purchase Order Receiving
                    |--------------------------------------------------------------------------
                    */

                    /*
                    |--------------------------------------------------------------------------
                    | Lock Purchase Order
                    |--------------------------------------------------------------------------
                    */

                    $purchaseOrder =
                        PurchaseOrder::query()
                            ->whereKey(
                                $validated[
                                    'purchase_order_id'
                                ],
                            )
                            ->lockForUpdate()
                            ->first();

                    if (
                        ! $purchaseOrder
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_id' => 'The selected purchase order could not be found.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | PO Safeguards
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $purchaseOrder
                            ->isArchived()
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_id' => 'Archived purchase orders cannot receive merchandise.',
                        ]);
                    }

                    if (
                        $purchaseOrder
                            ->isCompleted()
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_id' => 'This purchase order is already completed.',
                        ]);
                    }

                    if (
                        ! in_array(
                            $purchaseOrder
                                ->status,
                            [
                                PurchaseOrder::STATUS_ORDERED,
                                PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
                            ],
                            true,
                        )
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_id' => 'This purchase order cannot currently receive merchandise.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Lock Purchase Order Item
                    |--------------------------------------------------------------------------
                    */

                    $purchaseOrderItem =
                        PurchaseOrderItem::query()
                            ->whereKey(
                                $validated[
                                    'purchase_order_item_id'
                                ],
                            )
                            ->where(
                                'purchase_order_id',
                                $purchaseOrder
                                    ->id,
                            )
                            ->lockForUpdate()
                            ->first();

                    if (
                        ! $purchaseOrderItem
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_item_id' => 'The selected item does not belong to this purchase order.',
                        ]);
                    }

                    if (
                        $purchaseOrderItem
                            ->isArchived()
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_item_id' => 'Archived purchase order items cannot receive merchandise.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Remaining Quantity
                    |--------------------------------------------------------------------------
                    */

                    $remainingQuantity =
                        max(
                            0,
                            (int)
                            $purchaseOrderItem
                                ->quantity_ordered
                            - (int)
                            $purchaseOrderItem
                                ->quantity_received,
                        );

                    if (
                        $remainingQuantity
                        <= 0
                    ) {
                        throw ValidationException::withMessages([
                            'quantity' => 'This purchase order item has already been fully received.',
                        ]);
                    }

                    if (
                        $quantityReceived
                        > $remainingQuantity
                    ) {
                        throw ValidationException::withMessages([
                            'quantity' => "Only {$remainingQuantity} unit(s) remain to be received for this purchase order item.",
                        ]);
                    }

                    /*
|--------------------------------------------------------------------------
| Resolve Inventory Variant
|--------------------------------------------------------------------------
|
| The purchase-order item is the source of truth.
| A PO item must already be linked to a PROWARE inventory variant
| before physical stock can be received.
|
*/

                    $variantId =
                        $purchaseOrderItem
                            ->product_variant_id;

                    if (! $variantId) {
                        throw ValidationException::withMessages([
                            'purchase_order_item_id' => 'This purchase-order item is not linked to PROWARE inventory yet. Link it to an existing product variant or register it as a new product before receiving stock.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Prevent Variant Substitution
                    |--------------------------------------------------------------------------
                    |
                    | Even if a manipulated request submits another product_variant_id,
                    | it must match the variant already linked to the PO item.
                    |
                    */

                    if (
                        isset(
                            $validated[
                                'product_variant_id'
                            ],
                        )
                        && (int) $validated[
                            'product_variant_id'
                        ] !== (int) $variantId
                    ) {
                        throw ValidationException::withMessages([
                            'product_variant_id' => 'The selected product variant does not match the variant linked to this purchase-order item.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Catalog Variant Protection
                    |--------------------------------------------------------------------------
                    */

                    if (
                        $purchaseOrderItem
                            ->isCatalogItem()
                        && ! $variantId
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_item_id' => 'This catalog purchase-order item has no product variant.',
                        ]);
                    }

                    if (
                        $purchaseOrderItem
                            ->isCatalogItem()
                        && isset(
                            $validated[
                                'product_variant_id'
                            ],
                        )
                        && (int)
                        $validated[
                            'product_variant_id'
                        ]
                        !== (int)
                        $purchaseOrderItem
                            ->product_variant_id
                    ) {
                        throw ValidationException::withMessages([
                            'product_variant_id' => 'The selected variant does not match the purchase-order item.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Non-Inventory Manual Item
                    |--------------------------------------------------------------------------
                    |
                    | This Receive Stock screen is an inventory receiving module.
                    | A manual PO item with inventory tracking disabled must not create
                    | a fake StockMovement.
                    |
                    */

                    if (
                        $purchaseOrderItem
                            ->isManualItem()
                        && ! $purchaseOrderItem
                            ->track_inventory
                    ) {
                        throw ValidationException::withMessages([
                            'purchase_order_item_id' => 'This manual purchase-order item is not configured for inventory tracking and cannot be received through Inventory Receiving.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Find Variant
                    |--------------------------------------------------------------------------
                    */

                    $variant =
                        ProductVariant::query()
                            ->with([
                                'product:id,code,name,is_active',
                            ])
                            ->whereKey(
                                $variantId,
                            )
                            ->where(
                                'is_active',
                                true,
                            )
                            ->whereHas(
                                'product',
                                fn ($query) => $query->where(
                                    'is_active',
                                    true,
                                ),
                            )
                            ->first();

                    if (
                        ! $variant
                    ) {
                        throw ValidationException::withMessages([
                            'product_variant_id' => 'The selected product variant is unavailable.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Lock Inventory
                    |--------------------------------------------------------------------------
                    */

                    $inventory =
                        Inventory::query()
                            ->where(
                                'product_variant_id',
                                $variant
                                    ->id,
                            )
                            ->lockForUpdate()
                            ->first();

                    if (
                        ! $inventory
                    ) {
                        throw ValidationException::withMessages([
                            'product_variant_id' => 'The selected product variant has no inventory record.',
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Inventory Quantities
                    |--------------------------------------------------------------------------
                    */

                    $quantityBefore =
                        (int)
                        $inventory
                            ->quantity_on_hand;

                    $quantityAfter =
                        $quantityBefore
                        + $quantityReceived;

                    /*
                    |--------------------------------------------------------------------------
                    | Purchasing Price
                    |--------------------------------------------------------------------------
                    |
                    | Prefer whatever cost was actually entered for
                    | this receipt. Fall back to the PO item's
                    | planned unit_cost when the specialist did not
                    | type a fresh one (i.e. the price didn't change).
                    */

                    $receivedUnitCost =
                        $validated['unit_cost']
                        ?? (
                            $purchaseOrderItem->unit_cost !== null
                                ? (float) $purchaseOrderItem->unit_cost
                                : null
                        );

                    $inventory->applyReceivedCost(
                        $quantityReceived,
                        $receivedUnitCost,
                    );

                    $inventory->update([
                        'quantity_on_hand' => $quantityAfter,

                        'average_cost' => $inventory->average_cost,
                    ]);

                    if (
                        $purchaseOrderItem->merchandise_origin
                        === PurchaseOrderItem::ORIGIN_EXISTING
                    ) {
                        $variant->product->update([
                            'restocked_badge_started_at' => now(),
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Update PO Item
                    |--------------------------------------------------------------------------
                    */

                    $newItemReceived =
                        (int)
                        $purchaseOrderItem
                            ->quantity_received
                        + $quantityReceived;

                    $purchaseOrderItem->update([
                        'quantity_received' => $newItemReceived,
                    ]);

                    /*
                    |--------------------------------------------------------------------------
                    | Recalculate PO Status
                    |--------------------------------------------------------------------------
                    */

                    $activeItems =
                        PurchaseOrderItem::query()
                            ->where(
                                'purchase_order_id',
                                $purchaseOrder
                                    ->id,
                            )
                            ->whereNull(
                                'archived_at',
                            )
                            ->get([
                                'quantity_ordered',
                                'quantity_received',
                            ]);

                    $totalOrdered =
                        (int)
                        $activeItems->sum(
                            'quantity_ordered',
                        );

                    $totalReceived =
                        (int)
                        $activeItems->sum(
                            'quantity_received',
                        );

                    $purchaseOrderCompleted =
                        $totalOrdered > 0
                        && $totalReceived
                            >= $totalOrdered;

                    if (
                        $purchaseOrderCompleted
                    ) {
                        $purchaseOrder->update([
                            'status' => PurchaseOrder::STATUS_COMPLETED,

                            'completed_at' => now(),
                        ]);
                    } else {
                        $purchaseOrder->update([
                            'status' => PurchaseOrder::STATUS_PARTIALLY_RECEIVED,

                            'completed_at' => null,
                        ]);
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Receipt Number
                    |--------------------------------------------------------------------------
                    */

                    $receiptNumber =
                        $receiptNumberGenerator
                            ->generate();

                    /*
                    |--------------------------------------------------------------------------
                    | Stock Movement
                    |--------------------------------------------------------------------------
                    */

                    $stockMovement =
                        StockMovement::create([
                            'receipt_number' => $receiptNumber,

                            'inventory_id' => $inventory->id,

                            'product_variant_id' => $variant->id,

                            'performed_by' => $request
                                ->user()
                                ->id,

                            'movement_type' => StockMovement::TYPE_RECEIVE,

                            'quantity_change' => $quantityReceived,

                            'quantity_before' => $quantityBefore,

                            'quantity_after' => $quantityAfter,

                            'supplier_reference_number' => $validated[
                                    'supplier_reference_number'
                                ]
                                ?? $purchaseOrder
                                    ->supplier_reference_number,

                            'notes' => $validated[
                                    'notes'
                                ]
                                ?? (
                                    $purchaseOrderCompleted
                                        ? "Received against {$purchaseOrder->po_number}. "
                                            .'This receipt completed the purchase order.'
                                        : "Received against {$purchaseOrder->po_number}."
                                ),
                        ]);

                    return [
                        'receiving_mode' => 'purchase_order',

                        'stock_movement_id' => $stockMovement->id,

                        'inventory_id' => $inventory->id,

                        'receipt_number' => $receiptNumber,

                        'purchase_order_id' => $purchaseOrder->id,

                        'purchase_order_item_id' => $purchaseOrderItem->id,

                        'po_number' => $purchaseOrder
                            ->po_number,

                        'po_status' => $purchaseOrder
                            ->fresh()
                            ->status,

                        'po_completed' => $purchaseOrderCompleted,

                        'total_po_ordered' => $totalOrdered,

                        'total_po_received' => $totalReceived,

                        'total_po_remaining' => max(
                            0,
                            $totalOrdered
                            - $totalReceived,
                        ),

                        'product_code' => $variant
                            ->product
                            ->code,

                        'product_name' => $variant
                            ->product
                            ->name,

                        'variant_name' => $this
                            ->variantDisplayName(
                                $variant,
                            ),

                        'sku' => $variant->sku,

                        'quantity_received' => $quantityReceived,

                        'quantity_before' => $quantityBefore,

                        'quantity_after' => $quantityAfter,

                        'po_item_received' => $newItemReceived,

                        'po_item_remaining' => max(
                            0,
                            (int)
                            $purchaseOrderItem
                                ->quantity_ordered
                            - $newItemReceived,
                        ),

                        'supplier_reference_number' => $validated[
                                'supplier_reference_number'
                            ]
                            ?? $purchaseOrder
                                ->supplier_reference_number,

                        'notes' => $validated[
                                'notes'
                            ]
                            ?? null,
                    ];
                },
                attempts: 3,
            );

        /*
        |--------------------------------------------------------------------------
        | Load Movement
        |--------------------------------------------------------------------------
        */

        $stockMovement =
            StockMovement::query()
                ->findOrFail(
                    $result[
                        'stock_movement_id'
                    ],
                );

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        $description =
            "Received {$result['quantity_received']} unit(s) for "
            ."{$result['product_code']} — {$result['product_name']} "
            ."({$result['variant_name']}) against purchase order "
            ."{$result['po_number']} under receipt "
            ."{$result['receipt_number']}.";

        AuditLogger::log(
            request: $request,

            action: 'stock_received',

            module: 'inventory',

            description: $description,

            subject: $stockMovement,

            oldValues: [
                'quantity_on_hand' => $result[
                        'quantity_before'
                    ],
            ],

            newValues: [
                'receiving_mode' => $result[
                        'receiving_mode'
                    ],

                'receipt_number' => $result[
                        'receipt_number'
                    ],

                'purchase_order_id' => $result[
                        'purchase_order_id'
                    ],

                'purchase_order_item_id' => $result[
                        'purchase_order_item_id'
                    ],

                'po_number' => $result[
                        'po_number'
                    ],

                'po_status' => $result[
                        'po_status'
                    ],

                'product_code' => $result[
                        'product_code'
                    ],

                'product_name' => $result[
                        'product_name'
                    ],

                'variant_name' => $result[
                        'variant_name'
                    ],

                'sku' => $result[
                        'sku'
                    ],

                'quantity_received' => $result[
                        'quantity_received'
                    ],

                'quantity_on_hand' => $result[
                        'quantity_after'
                    ],

                'po_item_received' => $result[
                        'po_item_received'
                    ],

                'po_item_remaining' => $result[
                        'po_item_remaining'
                    ],

                'supplier_reference_number' => $result[
                        'supplier_reference_number'
                    ],

                'notes' => $result[
                        'notes'
                    ],
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Recheck Restock Threshold
        |--------------------------------------------------------------------------
        */

        $updatedInventory =
            Inventory::query()
                ->with([
                    'productVariant.product',
                ])
                ->findOrFail(
                    $result[
                        'inventory_id'
                    ],
                );

        $stockAlertService->check(
            $updatedInventory,
        );

        /*
        |--------------------------------------------------------------------------
        | Check Preorder Waiting List
        |--------------------------------------------------------------------------
        */

        $preorderAvailabilityService->check(
            $updatedInventory,
        );

        /*
        |--------------------------------------------------------------------------
        | Redirect
        |--------------------------------------------------------------------------
        */

        if (
            $result[
                'po_completed'
            ]
        ) {
            $message =
                'Purchase Order Completed. '
                ."Receipt {$result['receipt_number']} was created. "
                ."{$result['po_number']} has now been fully received. "
                ."Ordered: {$result['total_po_ordered']} unit(s). "
                ."Received: {$result['total_po_received']} unit(s). "
                .'Remaining: 0. '
                ."New quantity on hand for {$result['product_name']} "
                ."({$result['variant_name']}): {$result['quantity_after']}.";
        } else {
            $message =
                "Receipt {$result['receipt_number']} was created. "
                ."{$result['quantity_received']} unit(s) were received against "
                ."{$result['po_number']}. "
                ."PO item remaining: {$result['po_item_remaining']}. "
                ."PO remaining overall: {$result['total_po_remaining']}. "
                ."New quantity on hand: {$result['quantity_after']}.";
        }

        return redirect()
            ->route(
                'staff.stock-receipts.create',
            )
            ->with(
                'success',
                $message,
            );
    }

    /**
     * Register a legacy/manual purchase-order item
     * as a real PROWARE inventory product.
     *
     * This does not receive stock yet.
     * It creates the Product, ProductVariant and Inventory,
     * then links the existing PO item to the generated variant.
     */
    public function registerPurchaseOrderItemProduct(
        Request $request,
        PurchaseOrderItem $purchaseOrderItem,
        ProductCodeGenerator $productCodeGenerator,
        ProductVariantGenerator $productVariantGenerator,
    ): RedirectResponse {
        $user = $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
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
        | Load Purchase Order
        |--------------------------------------------------------------------------
        */

        $purchaseOrderItem->load(
            'purchaseOrder',
        );

        $purchaseOrder =
            $purchaseOrderItem->purchaseOrder;

        if (! $purchaseOrder) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'The purchase order for this item could not be found.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate PO State
        |--------------------------------------------------------------------------
        */

        if ($purchaseOrder->isArchived()) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'Archived purchase orders cannot be modified.',
            ]);
        }

        if ($purchaseOrder->isCompleted()) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'Completed purchase orders cannot be modified.',
            ]);
        }

        if ($purchaseOrder->isCancelled()) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'Cancelled purchase orders cannot be modified.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate PO Item
        |--------------------------------------------------------------------------
        */

        if ($purchaseOrderItem->isArchived()) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'Archived purchase-order items cannot be registered as products.',
            ]);
        }

        if (! $purchaseOrderItem->isManualItem()) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'This purchase-order item is already a catalog item.',
            ]);
        }

        if (
            $purchaseOrderItem->merchandise_origin
            !== PurchaseOrderItem::ORIGIN_NEW
        ) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'Only purchase-order items declared as new merchandise can be registered as a new PROWARE product.',
            ]);
        }

        if ($purchaseOrderItem->product_variant_id) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'This purchase-order item is already linked to a product variant.',
            ]);
        }

        if (
            (int) $purchaseOrderItem->quantity_received
            > 0
        ) {
            throw ValidationException::withMessages([
                'purchase_order_item_id' => 'A purchase-order item that already has received units cannot be converted.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Product Information
        |--------------------------------------------------------------------------
        |
        | Legacy PO conversion starts with STANDARD products only.
        |
        | A manual PO contains one total quantity and does not contain a reliable
        | quantity breakdown for Small, Medium, Large, programs, etc.
        |
        */

        $validated = $request->validate([
            'category_id' => [
                'required',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'required',
                'string',
                'max:255',

                Rule::unique(
                    'products',
                    'name',
                )->where(
                    fn ($query) => $query->where(
                        'category_id',
                        $request->input(
                            'category_id',
                        ),
                    ),
                ),
            ],

            'description' => [
                'nullable',
                'string',
                'max:5000',
            ],

            'base_price' => [
                'required',
                'numeric',
                'min:0.01',
                'max:99999999.99',
                'decimal:0,2',
            ],
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | Create Product + Standard Variant + Inventory
        |--------------------------------------------------------------------------
        */

        DB::transaction(
            function () use (
                $request,
                $validated,
                $purchaseOrderItem,
                $user,
                $productCodeGenerator,
                $productVariantGenerator,
            ): void {
                /*
                |--------------------------------------------------------------------------
                | Lock PO Item
                |--------------------------------------------------------------------------
                */

                $lockedItem =
                    PurchaseOrderItem::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $purchaseOrderItem->id,
                        );

                /*
                |--------------------------------------------------------------------------
                | Recheck Link Inside Transaction
                |--------------------------------------------------------------------------
                */

                if (
                    $lockedItem->product_variant_id
                ) {
                    throw ValidationException::withMessages([
                        'purchase_order_item_id' => 'This purchase-order item has already been linked to a product.',
                    ]);
                }

                if (
                    (int) $lockedItem->quantity_received
                    > 0
                ) {
                    throw ValidationException::withMessages([
                        'purchase_order_item_id' => 'This purchase-order item already has received units.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Create Product
                |--------------------------------------------------------------------------
                */

                $imagePath =
                    $request
                        ->file('image')
                        ->store(
                            'products',
                            'public',
                        );
                $product =
                    Product::query()->create([
                        'category_id' => (int) $validated[
                                'category_id'
                            ],

                        'created_by' => $user->id,

                        'code' => $productCodeGenerator
                            ->generate(),

                        'name' => trim(
                            (string) $validated[
                                'name'
                            ],
                        ),

                        'description' => filled(
                            $validated[
                                'description'
                            ] ?? null,
                        )
                                ? trim(
                                    (string) $validated[
                                        'description'
                                    ],
                                )
                                : null,

                        'base_price' => $validated[
                                'base_price'
                            ],

                        'image_path' => $imagePath,

                        'variant_mode' => Product::VARIANT_MODE_STANDARD,

                        'availability_status' => Product::AVAILABILITY_AVAILABLE,

                        'preorder_enabled' => false,

                        'expected_release_date' => null,

                        'preorder_starts_at' => null,

                        'preorder_ends_at' => null,

                        'preorder_limit_per_student' => null,

                        'preorder_capacity' => null,

                        'new_badge_duration_days' => 7,

                        'new_badge_started_at' => now(),

                        'is_active' => true,
                    ]);

                /*
                |--------------------------------------------------------------------------
                | Generate Standard Variant + Zero-Stock Inventory
                |--------------------------------------------------------------------------
                */

                $productVariantGenerator->generate(
                    $product,
                );

                $variant =
                    $product
                        ->variants()
                        ->first();

                if (! $variant) {
                    throw new RuntimeException(
                        'PROWARE could not create the inventory variant for this product.',
                    );
                }

                /*
                |--------------------------------------------------------------------------
                | Link Existing PO Item
                |--------------------------------------------------------------------------
                |
                | We update the SAME purchase_order_items row.
                | We do not create another PO line and we do not change its
                | ordered quantity.
                |
                */

                $lockedItem->update([
                    'item_type' => PurchaseOrderItem::TYPE_CATALOG,

                    'product_variant_id' => $variant->id,

                    'track_inventory' => true,
                ]);
            },
            3,
        );

        /*
        |--------------------------------------------------------------------------
        | Redirect Back To Receiving
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'staff.stock-receipts.create',
            )
            ->with(
                'success',
                'The purchase-order item was registered as a PROWARE product. You can now receive its delivered stock.',
            );
    }

    /**
     * Link a manual purchase-order item to an existing
     * PROWARE product variant.
     *
     * This does NOT receive stock.
     * It only connects the PO item to an existing variant.
     */
    public function linkPurchaseOrderItemVariant(
        Request $request,
        PurchaseOrderItem $purchaseOrderItem,
    ): RedirectResponse {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
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
        | Validation
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate([
                'product_variant_id' => [
                    'required',
                    'integer',
                    'exists:product_variants,id',
                ],
            ]);

        /*
        |--------------------------------------------------------------------------
        | Load Purchase Order
        |--------------------------------------------------------------------------
        */

        $purchaseOrder =
            $purchaseOrderItem
                ->purchaseOrder()
                ->firstOrFail();

        /*
        |--------------------------------------------------------------------------
        | Safeguards
        |--------------------------------------------------------------------------
        */

        if (
            $purchaseOrder->isArchived()
        ) {
            return back()->with(
                'error',
                'Archived purchase orders cannot be modified.',
            );
        }

        if (
            $purchaseOrder->isCompleted()
        ) {
            return back()->with(
                'error',
                'Completed purchase orders cannot be modified.',
            );
        }

        if (
            $purchaseOrderItem->isArchived()
        ) {
            return back()->with(
                'error',
                'Archived purchase order items cannot be modified.',
            );
        }

        if (
            ! $purchaseOrderItem
                ->isManualItem()
        ) {
            return back()->with(
                'error',
                'Only manual purchase order items can be linked to an existing product.',
            );
        }

        if (
            $purchaseOrderItem
                ->product_variant_id
            !== null
        ) {
            return back()->with(
                'error',
                'This purchase order item is already linked to a PROWARE product variant.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Find Existing Variant
        |--------------------------------------------------------------------------
        */

        $variant =
            ProductVariant::query()
                ->with([
                    'product',
                    'inventory',
                ])
                ->whereKey(
                    $validated[
                        'product_variant_id'
                    ],
                )
                ->where(
                    'is_active',
                    true,
                )
                ->first();

        if (
            ! $variant
        ) {
            return back()->withErrors([
                'product_variant_id' => 'The selected product variant is not available.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Product Safeguard
        |--------------------------------------------------------------------------
        */

        if (
            ! $variant->product
            || ! $variant
                ->product
                ->is_active
        ) {
            return back()->withErrors([
                'product_variant_id' => 'The selected product is not active.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Inventory Safeguard
        |--------------------------------------------------------------------------
        */

        if (
            ! $variant->inventory
        ) {
            return back()->withErrors([
                'product_variant_id' => 'The selected product variant does not have an inventory record.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Link Existing Variant
        |--------------------------------------------------------------------------
        |
        | Do NOT modify inventory here.
        | Physical stock changes only when Receive Stock is submitted.
        |
        | Locked and rechecked inside a transaction, matching
        | registerPurchaseOrderItemProduct() below — otherwise two
        | concurrent "link" requests for the same item could both pass
        | the "not already linked" check above and race on which
        | variant ends up linked.
        |
        */

        DB::transaction(
            function () use (
                $purchaseOrderItem,
                $variant,
            ): void {
                $lockedItem =
                    PurchaseOrderItem::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $purchaseOrderItem->id,
                        );

                if (
                    $lockedItem->product_variant_id
                    !== null
                ) {
                    throw ValidationException::withMessages([
                        'product_variant_id' => 'This purchase order item is already linked to a PROWARE product variant.',
                    ]);
                }

                $lockedItem->update([
                    'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,

                    'product_variant_id' => $variant->id,

                    'track_inventory' => true,
                ]);
            },
            3,
        );

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        $productName =
            $variant
                ->product
                ->name;

        $variantName =
            $this->variantDisplayName(
                $variant,
            );

        return redirect()
            ->route(
                'staff.stock-receipts.create',
            )
            ->with(
                'success',
                "{$purchaseOrderItem->manual_name} was linked to "
                ."{$productName} ({$variantName}). "
                .'You can now receive stock against this purchase order item.',
            );
    }

    /**
     * Build a readable variant label.
     */
    private function variantDisplayName(
        ProductVariant $variant,
    ): string {
        if (
            filled(
                $variant
                    ->variant_name,
            )
        ) {
            return $variant
                ->variant_name;
        }

        $parts =
            array_filter([
                $variant->program,
                $variant->size,
            ]);

        if ($parts !== []) {
            return implode(
                ' / ',
                $parts,
            );
        }

        return $variant->sku
            ?: 'Standard';
    }
}
