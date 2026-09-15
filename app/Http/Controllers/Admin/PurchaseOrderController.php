<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\ProductCodeGenerator;
use App\Services\ProductVariantGenerator;
use App\Services\PurchaseOrderNumberGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    /**
     * Display active purchase orders.
     */
    public function index(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Status Filter
        |--------------------------------------------------------------------------
        |
        | Lets the Admin dashboard deep-link into a specific
        | procurement stage (e.g. only Draft, or only Completed).
        */

        $status =
            (string) $request->query(
                'status',
                'all',
            );

        $allowedStatuses = [
            'all',
            PurchaseOrder::STATUS_DRAFT,
            PurchaseOrder::STATUS_ORDERED,
            PurchaseOrder::STATUS_PARTIALLY_RECEIVED,
            PurchaseOrder::STATUS_COMPLETED,
        ];

        if (
            ! in_array(
                $status,
                $allowedStatuses,
                true,
            )
        ) {
            $status = 'all';
        }

        $purchaseOrders =
            PurchaseOrder::query()
                ->whereNull(
                    'archived_at',
                )
                ->when(
                    $status !== 'all',
                    fn ($query) => $query->where(
                        'status',
                        $status,
                    ),
                )
                ->with([
                    'creator:id,name',
                ])
                ->withSum(
                    [
                        'items as total_quantity_ordered' => fn ($itemQuery) => $itemQuery->whereNull(
                            'archived_at',
                        ),
                    ],
                    'quantity_ordered',
                )
                ->withSum(
                    [
                        'items as total_quantity_received' => fn ($itemQuery) => $itemQuery->whereNull(
                            'archived_at',
                        ),
                    ],
                    'quantity_received',
                )
                ->latest()
                ->paginate(15)
                ->withQueryString();

        return Inertia::render(
            'admin/PurchaseOrders/Index',
            [
                'purchaseOrders' => $purchaseOrders,

                'filters' => [
                    'status' => $status,
                ],
            ],
        );
    }

    /**
     * Display the purchase-order creation page.
     */
    public function create(
        Request $request,
    ): Response {
        $user =
            $request->user();

        /*
        |--------------------------------------------------------------------------
        | Authorization
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Existing Catalog Variants
        |--------------------------------------------------------------------------
        |
        | These are existing PROWARE products/variants that the Admin can
        | immediately add to the Purchase Order.
        |
        | Physical inventory is shown only for reference.
        | Creating a Purchase Order does NOT increase stock.
        |
        */

        $variants =
            ProductVariant::query()
                ->with([
                    'product:id,code,name',
                    'inventory',
                ])
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
                ->orderBy(
                    'sku',
                )
                ->get()
                ->map(
                    function (
                        ProductVariant $variant,
                    ): array {
                        $product =
                            $variant->product;

                        return [
                            'id' => $variant->id,

                            'sku' => $variant->sku,

                            'program' => $variant->program,

                            'size' => $variant->size,

                            'variant_name' => $variant->variant_name,

                            'product' => [
                                'id' => $product->id,

                                'code' => $product->code,

                                'name' => $product->name,
                            ],

                            'inventory' => [
                                'quantity_on_hand' => (int) (
                                    $variant
                                        ->inventory
                                        ?->quantity_on_hand
                                    ?? 0
                                ),

                                'quantity_reserved' => (int) (
                                    $variant
                                        ->inventory
                                        ?->quantity_reserved
                                    ?? 0
                                ),

                                'available_quantity' => (int) (
                                    $variant
                                        ->inventory
                                        ?->available_quantity
                                    ?? 0
                                ),

                                'reorder_level' => (int) (
                                    $variant
                                        ->inventory
                                        ?->reorder_level
                                    ?? 0
                                ),
                            ],
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Active Categories
        |--------------------------------------------------------------------------
        |
        | Used when the Admin chooses "New Inventory Item".
        |
        | The Admin selects the correct existing category instead of manually
        | typing a category name.
        |
        */

        $categories =
            Category::query()
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
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Product Configuration
        |--------------------------------------------------------------------------
        |
        | Reuse config/proware.php instead of duplicating programs and sizes
        | inside the React page.
        |
        */

        $productConfiguration = [
            /*
            |--------------------------------------------------------------------------
            | Variant Modes
            |--------------------------------------------------------------------------
            */

            'variant_modes' => [
                [
                    'value' => Product::VARIANT_MODE_STANDARD,

                    'label' => 'Standard',
                ],

                [
                    'value' => Product::VARIANT_MODE_SIZE_ONLY,

                    'label' => 'Size Only',
                ],

                [
                    'value' => Product::VARIANT_MODE_PROGRAM_AND_SIZE,

                    'label' => 'Program and Size',
                ],
            ],

            /*
            |--------------------------------------------------------------------------
            | Programs
            |--------------------------------------------------------------------------
            */

            'programs' => config(
                'proware.programs',
                [],
            ),

            /*
        |--------------------------------------------------------------------------
        | Sizes
        |--------------------------------------------------------------------------
        */

            'sizes' => config(
                'proware.sizes',
                [],
            ),
        ];

        /*
        |--------------------------------------------------------------------------
        | Render Purchase Order Creation Page
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/PurchaseOrders/Create',
            [
                'variants' => $variants,

                'categories' => $categories,

                'productConfiguration' => $productConfiguration,
            ],
        );
    }

    /**
     * Display a purchase order.
     */
    public function show(
        Request $request,
        PurchaseOrder $purchaseOrder,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Load Purchase Order
        |--------------------------------------------------------------------------
        */

        $purchaseOrder->load([
            'creator:id,name',
            'archivedBy:id,name',
            'items.archivedBy:id,name',
            'items.productVariant.product:id,code,name,image_path',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Active Purchase Order Items
        |--------------------------------------------------------------------------
        |
        | Archived line items stay in the database for history, but are not
        | included in the active PO item list.
        |
        */

        $items =
            $purchaseOrder
                ->items
                ->whereNull(
                    'archived_at',
                )
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

                        return [
                            'id' => $item->id,

                            'item_type' => $item->item_type,

                            'merchandise_origin' => $item->merchandise_origin,

                            'product_variant_id' => $item
                                ->product_variant_id,

                            'product_code' => $product
                                ?->code,

                            'product_name' => $product
                                ?->name,

                            'image_url' => $product
                                ?->image_path
                                ? '/storage/'
                                .ltrim(
                                    $product
                                        ->image_path,
                                    '/',
                                )
                                : null,

                            'sku' => $variant
                                ?->sku
                                ?? $item
                                    ->manual_sku,

                            'variant_name' => $variant
                                ?->variant_name,

                            'program' => $variant
                                ?->program,

                            'size' => $variant
                                ?->size,

                            'manual_name' => $item
                                ->manual_name,

                            'manual_description' => $item
                                ->manual_description,

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

                            'quantity_remaining' => $item
                                ->remainingQuantity(),

                            'unit_cost' => $item
                                ->unit_cost,
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Archived Purchase Order Items
        |--------------------------------------------------------------------------
        |
        | Archived line items remain available for read-only history.
        |
        */

        $archivedItems =
            $purchaseOrder
                ->items
                ->whereNotNull(
                    'archived_at',
                )
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

                        return [
                            'id' => $item->id,

                            'item_type' => $item->item_type,

                            'product_variant_id' => $item
                                ->product_variant_id,

                            'product_code' => $product
                                ?->code,

                            'product_name' => $product
                                ?->name,

                            'image_url' => $product
                                ?->image_path
                                ? '/storage/'
                                .ltrim(
                                    $product
                                        ->image_path,
                                    '/',
                                )
                                : null,

                            'sku' => $variant
                                ?->sku
                                ?? $item
                                    ->manual_sku,

                            'variant_name' => $variant
                                ?->variant_name,

                            'program' => $variant
                                ?->program,

                            'size' => $variant
                                ?->size,

                            'manual_name' => $item
                                ->manual_name,

                            'manual_description' => $item
                                ->manual_description,

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

                            'quantity_remaining' => $item
                                ->remainingQuantity(),

                            'unit_cost' => $item
                                ->unit_cost,

                            'archived_at' => $item
                                ->archived_at
                                ?->format(
                                    'M d, Y h:i A',
                                ),

                            'archived_by' => $item
                                ->archivedBy
                                ?->name
                                ?? 'Unknown',
                        ];
                    },
                )
                ->values();

        /*
        |--------------------------------------------------------------------------
        | Catalog Variants For Add Item
        |--------------------------------------------------------------------------
        |
        | These variants are used by the Add Item dialog on the saved PO page.
        | Inventory is shown for reference only. Adding a PO item does NOT
        | increase physical inventory.
        |
        */

        $variants =
            ProductVariant::query()
                ->with([
                    'product:id,code,name,image_path',
                    'inventory',
                ])
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
                ->orderBy(
                    'sku',
                )
                ->get()
                ->map(
                    function (
                        ProductVariant $variant,
                    ): array {
                        $product =
                            $variant
                                ->product;

                        return [
                            'id' => $variant->id,

                            'sku' => $variant->sku,

                            'program' => $variant->program,

                            'size' => $variant->size,

                            'variant_name' => $variant
                                ->variant_name,

                            'product' => [
                                'id' => $product->id,

                                'code' => $product->code,

                                'name' => $product->name,

                                'image_url' => $product
                                    ->image_path
                                    ? '/storage/'
                                    .ltrim(
                                        $product
                                            ->image_path,
                                        '/',
                                    )
                                    : null,
                            ],

                            'inventory' => [
                                'quantity_on_hand' => (int) (
                                    $variant
                                        ->inventory
                                        ?->quantity_on_hand
                                    ?? 0
                                ),

                                'quantity_reserved' => (int) (
                                    $variant
                                        ->inventory
                                        ?->quantity_reserved
                                    ?? 0
                                ),

                                'available_quantity' => (int) (
                                    $variant
                                        ->inventory
                                        ?->available_quantity
                                    ?? 0
                                ),

                                'reorder_level' => (int) (
                                    $variant
                                        ->inventory
                                        ?->reorder_level
                                    ?? 0
                                ),
                            ],
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
            'admin/PurchaseOrders/Show',
            [
                'purchaseOrder' => [
                    'id' => $purchaseOrder->id,

                    'po_number' => $purchaseOrder->po_number,

                    'supplier_name' => $purchaseOrder->supplier_name,

                    'supplier_reference_number' => $purchaseOrder
                        ->supplier_reference_number,

                    'expected_delivery_date' => $purchaseOrder
                        ->expected_delivery_date
                        ?->format(
                            'M d, Y',
                        ),

                    'status' => $purchaseOrder->status,

                    'notes' => $purchaseOrder->notes,

                    /*
            |--------------------------------------------------------------
            | Dates
            |--------------------------------------------------------------
            */

                    'ordered_at' => $purchaseOrder
                        ->ordered_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'completed_at' => $purchaseOrder
                        ->completed_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    /*
            |--------------------------------------------------------------
            | Archive Information
            |--------------------------------------------------------------
            */

                    'archived_at' => $purchaseOrder
                        ->archived_at
                        ?->format(
                            'M d, Y h:i A',
                        ),

                    'archived_by' => $purchaseOrder
                        ->archivedBy
                        ?->name,

                    'is_archived' => $purchaseOrder
                        ->isArchived(),

                    /*
            |--------------------------------------------------------------
            | Creator
            |--------------------------------------------------------------
            */

                    'created_by' => $purchaseOrder
                        ->creator
                        ?->name
                        ?? 'Unknown',

                    /*
            |--------------------------------------------------------------
            | Purchase Order Totals
            |--------------------------------------------------------------
            |
            | Use the ACTIVE mapped items so archived lines do not
            | incorrectly remain in the operational totals.
            |
            */

                    'total_ordered' => (int)
                        $items->sum(
                            'quantity_ordered',
                        ),

                    'total_received' => (int)
                        $items->sum(
                            'quantity_received',
                        ),

                    'total_remaining' => (int)
                        $items->sum(
                            'quantity_remaining',
                        ),

                    /*
            |--------------------------------------------------------------
            | Active + Archived Items
            |--------------------------------------------------------------
            */

                    'items' => $items,

                    'archived_items' => $archivedItems,
                ],

                /*
        |------------------------------------------------------------------
        | Catalog Variants For Add Item Dialog
        |------------------------------------------------------------------
        */

                'variants' => $variants,
            ],
        );
    }

    /**
     * Store a newly created purchase order.
     */
    public function store(
        Request $request,
        PurchaseOrderNumberGenerator $purchaseOrderNumberGenerator,
        ProductCodeGenerator $productCodeGenerator,
        ProductVariantGenerator $productVariantGenerator,
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
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Validate Purchase Order
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate([
                'supplier_name' => [
                    'required',
                    'string',
                    'max:255',
                ],

                'supplier_reference_number' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'expected_delivery_date' => [
                    'nullable',
                    'date',
                ],

                'notes' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'items' => [
                    'required',
                    'array',
                    'min:1',
                ],

                /*
                |--------------------------------------------------------------------------
                | Item Source
                |--------------------------------------------------------------------------
                |
                | existing_catalog
                |     Existing ProductVariant already in PROWARE.
                |
                | new_inventory
                |     Product does not exist yet. PROWARE creates it automatically.
                |
                | manual
                |     PO-only item. It does not become inventory.
                |
                */

                'items.*.source_type' => [
                    'required',
                    Rule::in([
                        'existing_catalog',
                        'new_inventory',
                        'manual',
                    ]),
                ],

                /*
                |--------------------------------------------------------------------------
                | Existing Catalog
                |--------------------------------------------------------------------------
                */

                'items.*.product_variant_id' => [
                    'nullable',
                    'integer',
                    'exists:product_variants,id',
                ],

                /*
                |--------------------------------------------------------------------------
                | New Inventory Product
                |--------------------------------------------------------------------------
                */

                'items.*.category_id' => [
                    'nullable',
                    'integer',
                    'exists:categories,id',
                ],

                'items.*.product_name' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'items.*.product_description' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'items.*.base_price' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],

                'items.*.variant_mode' => [
                    'nullable',
                    Rule::in(
                        Product::variantModes(),
                    ),
                ],

                'items.*.programs' => [
                    'nullable',
                    'array',
                ],

                'items.*.programs.*' => [
                    'string',
                    Rule::in(
                        collect(
                            config(
                                'proware.programs',
                                [],
                            ),
                        )
                            ->pluck('value')
                            ->all(),
                    ),
                ],

                'items.*.sizes' => [
                    'nullable',
                    'array',
                ],

                'items.*.sizes.*' => [
                    'string',
                    Rule::in(
                        collect(
                            config(
                                'proware.sizes',
                                [],
                            ),
                        )
                            ->pluck('value')
                            ->all(),
                    ),
                ],

                /*
            |--------------------------------------------------------------------------
            | Manual / Non-Inventory
            |--------------------------------------------------------------------------
            */

                'items.*.manual_name' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'items.*.manual_description' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'items.*.manual_sku' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                /*
            |--------------------------------------------------------------------------
            | Quantity / Cost
            |--------------------------------------------------------------------------
            */

                'items.*.quantity_ordered' => [
                    'required',
                    'integer',
                    'min:1',
                    'max:1000000',
                ],

                'items.*.unit_cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
            ]);

        /*
        |--------------------------------------------------------------------------
        | Validate Each Item According To Its Source
        |--------------------------------------------------------------------------
        */

        foreach (
            $validated['items'] as $index => $item
        ) {
            $sourceType =
                $item['source_type'];

            /*
            |--------------------------------------------------------------------------
            | Existing Catalog Item
            |--------------------------------------------------------------------------
            */

            if (
                $sourceType
                === 'existing_catalog'
                && empty(
                    $item['product_variant_id']
                )
            ) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'Please select an existing product variant.',
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | New Inventory Item
            |--------------------------------------------------------------------------
            */

            if (
                $sourceType
                === 'new_inventory'
            ) {
                if (
                    empty(
                        $item['category_id']
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.category_id" => 'Please select a category for the new product.',
                    ]);
                }

                if (
                    blank(
                        $item['product_name']
                        ?? null,
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.product_name" => 'Please enter the new product name.',
                    ]);
                }

                if (
                    ! isset(
                        $item['base_price']
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.base_price" => 'Please enter the selling price.',
                    ]);
                }

                if (
                    empty(
                        $item['variant_mode']
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.variant_mode" => 'Please select how this product is tracked.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Size Only Requires At Least One Size
                |--------------------------------------------------------------------------
                */

                if (
                    $item['variant_mode']
                        === Product::VARIANT_MODE_SIZE_ONLY
                    && empty(
                        $item['sizes']
                        ?? []
                    )
                ) {
                    throw ValidationException::withMessages([
                        "items.{$index}.sizes" => 'Please select at least one size.',
                    ]);
                }

                /*
                |--------------------------------------------------------------------------
                | Program + Size Requires Both
                |--------------------------------------------------------------------------
                */

                if (
                    $item['variant_mode']
                        === Product::VARIANT_MODE_PROGRAM_AND_SIZE
                ) {
                    if (
                        empty(
                            $item['programs']
                            ?? []
                        )
                    ) {
                        throw ValidationException::withMessages([
                            "items.{$index}.programs" => 'Please select at least one program.',
                        ]);
                    }

                    if (
                        empty(
                            $item['sizes']
                            ?? []
                        )
                    ) {
                        throw ValidationException::withMessages([
                            "items.{$index}.sizes" => 'Please select at least one size.',
                        ]);
                    }
                }
            }

            /*
            |--------------------------------------------------------------------------
            | Manual / Non-Inventory Item
            |--------------------------------------------------------------------------
            */

            if (
                $sourceType
                    === 'manual'
                && blank(
                    $item['manual_name']
                    ?? null,
                )
            ) {
                throw ValidationException::withMessages([
                    "items.{$index}.manual_name" => 'Please enter the item name.',
                ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent Duplicate Existing Variants
        |--------------------------------------------------------------------------
        */

        $existingVariantIds =
            collect(
                $validated['items'],
            )
                ->filter(
                    fn (array $item): bool => $item['source_type']
                            === 'existing_catalog',
                )
                ->pluck(
                    'product_variant_id',
                )
                ->filter()
                ->values();

        if (
            $existingVariantIds->count()
            !==
            $existingVariantIds
                ->unique()
                ->count()
        ) {
            throw ValidationException::withMessages([
                'items' => 'The same catalog variant cannot be added to the purchase order more than once.',
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Database Transaction
        |--------------------------------------------------------------------------
        |
        | The PO, new products, generated variants, inventory records, and PO
        | lines either succeed together or roll back together.
        |
        */

        $purchaseOrder =
            DB::transaction(
                function () use (
                    $validated,
                    $user,
                    $purchaseOrderNumberGenerator,
                ): PurchaseOrder {
                    /*
                    |--------------------------------------------------------------------------
                    | Create Purchase Order
                    |--------------------------------------------------------------------------
                    */

                    $purchaseOrder =
                        PurchaseOrder::query()
                            ->create([
                                'po_number' => $purchaseOrderNumberGenerator
                                    ->generate(),

                                'supplier_name' => trim(
                                    $validated[
                                        'supplier_name'
                                    ],
                                ),

                                'supplier_reference_number' => filled(
                                    $validated[
                                        'supplier_reference_number'
                                    ]
                                    ?? null,
                                )
                                        ? trim(
                                            $validated[
                                                'supplier_reference_number'
                                            ],
                                        )
                                        : null,

                                'expected_delivery_date' => $validated[
                                        'expected_delivery_date'
                                    ]
                                    ?? null,

                                'status' => PurchaseOrder::STATUS_ORDERED,

                                'created_by' => $user->id,

                                'ordered_at' => now(),

                                'completed_at' => null,

                                'notes' => filled(
                                    $validated['notes']
                                    ?? null,
                                )
                                        ? trim(
                                            $validated['notes'],
                                        )
                                        : null,
                            ]);

                    /*
                    |--------------------------------------------------------------------------
                    | Create Purchase Order Items
                    |--------------------------------------------------------------------------
                    */

                    foreach (
                        $validated['items'] as $item
                    ) {
                        $sourceType =
                            $item['source_type'];

                        /*
                        |--------------------------------------------------------------------------
                        | Existing Catalog Product
                        |--------------------------------------------------------------------------
                        */

                        if (
                            $sourceType
                            === 'existing_catalog'
                        ) {
                            $purchaseOrder
                                ->items()
                                ->create([
                                    'item_type' => PurchaseOrderItem::TYPE_CATALOG,

                                    'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,

                                    'product_variant_id' => $item[
                                            'product_variant_id'
                                        ],

                                    'manual_name' => null,

                                    'manual_description' => null,

                                    'manual_sku' => null,

                                    'track_inventory' => true,

                                    'quantity_ordered' => $item[
                                            'quantity_ordered'
                                        ],

                                    'quantity_received' => 0,

                                    'unit_cost' => $item['unit_cost']
                                        ?? null,
                                ]);

                            continue;
                        }

                        /*
                        |--------------------------------------------------------------------------
                        | New / Unresolved Inventory Product
                        |--------------------------------------------------------------------------
                        |
                        | A "new_inventory" item represents merchandise that the Admin intends
                        | to purchase but that has NOT yet been confirmed as a PROWARE catalog
                        | product.
                        |
                        | IMPORTANT:
                        | - Do NOT create Product here.
                        | - Do NOT create ProductVariant here.
                        | - Do NOT create Inventory here.
                        | - Do NOT increase stock here.
                        |
                        | The Specialist must resolve this item during receiving by either:
                        | 1. Linking it to an existing PROWARE product variant, or
                        | 2. Registering it as a genuinely new PROWARE product.
                        |
                        */

                        if ($sourceType === 'new_inventory') {
                            $purchaseOrder->items()->create([
                                'item_type' => PurchaseOrderItem::TYPE_MANUAL,

                                'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,

                                // Remains unresolved until the Specialist
                                // links or registers the merchandise.
                                'product_variant_id' => null,

                                // Product information entered by Admin.
                                'manual_name' => trim(
                                    $item['product_name'],
                                ),

                                'manual_description' => filled(
                                    $item['product_description'] ?? null,
                                )
                                    ? trim(
                                        $item['product_description'],
                                    )
                                    : null,

                                'proposed_category_id' => $item['category_id'] ?? null,

                                'proposed_selling_price' => $item['base_price'] ?? null,

                                'manual_sku' => null,

                                // This merchandise is intended to become
                                // inventory after Specialist resolution.
                                'track_inventory' => true,

                                'quantity_ordered' => $item['quantity_ordered'],

                                'quantity_received' => 0,

                                // Purchase cost remains separate from
                                // the product's selling price.
                                'unit_cost' => $item['unit_cost'] ?? null,
                            ]);

                            continue;
                        }
                        /*
                        |--------------------------------------------------------------------------
                        | Manual / Non-Inventory Item
                        |--------------------------------------------------------------------------
                        */

                        $purchaseOrder
                            ->items()
                            ->create([
                                'item_type' => PurchaseOrderItem::TYPE_MANUAL,

                                'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,

                                'product_variant_id' => null,

                                'manual_name' => trim(
                                    $item[
                                        'manual_name'
                                    ],
                                ),

                                'manual_description' => filled(
                                    $item[
                                        'manual_description'
                                    ]
                                    ?? null,
                                )
                                        ? trim(
                                            $item[
                                                'manual_description'
                                            ],
                                        )
                                        : null,

                                'manual_sku' => filled(
                                    $item[
                                        'manual_sku'
                                    ]
                                    ?? null,
                                )
                                        ? trim(
                                            $item[
                                                'manual_sku'
                                            ],
                                        )
                                        : null,

                                /*
                            |--------------------------------------------------------------------------
                            | Manual Means Non-Inventory
                            |--------------------------------------------------------------------------
                            */

                                'track_inventory' => false,

                                'quantity_ordered' => $item[
                                        'quantity_ordered'
                                    ],

                                'quantity_received' => 0,

                                'unit_cost' => $item['unit_cost']
                                    ?? null,
                            ]);
                    }

                    return $purchaseOrder;
                },
            );

        /*
        |--------------------------------------------------------------------------
        | Redirect To Created Purchase Order
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'admin.purchase-orders.show',
                $purchaseOrder,
            )
            ->with(
                'success',
                'Purchase order created successfully.',
            );
    }

    /**
     * Add a new item to an existing purchase order.
     */
    public function storeItem(
        Request $request,
        PurchaseOrder $purchaseOrder,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

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
                'Completed purchase orders cannot accept new items.',
            );
        }

        $validated =
            $request->validate([
                'item_type' => [
                    'required',
                    Rule::in([
                        PurchaseOrderItem::TYPE_CATALOG,
                        PurchaseOrderItem::TYPE_MANUAL,
                    ]),
                ],

                'merchandise_origin' => [
                    Rule::requiredIf(
                        fn (): bool => $request->input(
                            'item_type',
                        )
                            === PurchaseOrderItem::TYPE_MANUAL,
                    ),
                    'nullable',
                    Rule::in([
                        PurchaseOrderItem::ORIGIN_EXISTING,
                        PurchaseOrderItem::ORIGIN_NEW,
                    ]),
                ],

                'product_variant_id' => [
                    'nullable',
                    'integer',
                    'exists:product_variants,id',
                ],

                'manual_name' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'manual_description' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'manual_sku' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'quantity_ordered' => [
                    'required',
                    'integer',
                    'min:1',
                ],

                'unit_cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],
            ]);

        $itemType =
            $validated['item_type'];

        $merchandiseOrigin =
        $itemType
            === PurchaseOrderItem::TYPE_CATALOG
        ? PurchaseOrderItem::ORIGIN_EXISTING
        : $validated['merchandise_origin'];

        /*
        |--------------------------------------------------------------------------
        | Track Inventory
        |--------------------------------------------------------------------------
        |
        | Never trust track_inventory from the client. Derive it the same way
        | store() derives it when a brand-new Purchase Order is created:
        |
        | - Catalog item                  -> always tracked
        | - Manual item, origin = new     -> intended to become inventory later
        | - Manual item, origin = existing -> genuinely non-inventory (PO-only)
        |
        */

        $trackInventory =
            match (true) {
                $itemType
                    === PurchaseOrderItem::TYPE_CATALOG => true,

                $merchandiseOrigin
                    === PurchaseOrderItem::ORIGIN_NEW => true,

                default => false,
            };

        if (
            $itemType
            === PurchaseOrderItem::TYPE_CATALOG
            && empty(
                $validated[
                    'product_variant_id'
                ]
            )
        ) {
            return back()
                ->withErrors([
                    'product_variant_id' => 'Please select a product variant.',
                ]);
        }

        if (
            $itemType
            === PurchaseOrderItem::TYPE_MANUAL
            && blank(
                $validated[
                    'manual_name'
                ]
                ?? null,
            )
        ) {
            return back()
                ->withErrors([
                    'manual_name' => 'Please enter the manual item name.',
                ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent Duplicate Active Catalog Variant
        |--------------------------------------------------------------------------
        */

        if (
            $itemType
            === PurchaseOrderItem::TYPE_CATALOG
        ) {
            $duplicate =
                $purchaseOrder
                    ->items()
                    ->whereNull(
                        'archived_at',
                    )
                    ->where(
                        'product_variant_id',
                        $validated[
                            'product_variant_id'
                        ],
                    )
                    ->exists();

            if (
                $duplicate
            ) {
                return back()->with(
                    'error',
                    'This product variant is already included in the purchase order.',
                );
            }
        }

        $purchaseOrder
            ->items()
            ->create([
                'item_type' => $itemType,

                'merchandise_origin' => $merchandiseOrigin,

                'product_variant_id' => $itemType
                        === PurchaseOrderItem::TYPE_CATALOG
                    ? $validated[
                        'product_variant_id'
                    ]
                    : null,

                'manual_name' => $itemType
                        === PurchaseOrderItem::TYPE_MANUAL
                    ? $validated[
                        'manual_name'
                    ]
                    : null,

                'manual_description' => $itemType
                        === PurchaseOrderItem::TYPE_MANUAL
                    ? (
                        $validated[
                            'manual_description'
                        ]
                        ?? null
                    )
                    : null,

                'manual_sku' => $itemType
                        === PurchaseOrderItem::TYPE_MANUAL
                    ? (
                        $validated[
                            'manual_sku'
                        ]
                        ?? null
                    )
                    : null,

                'track_inventory' => $trackInventory,

                'quantity_ordered' => $validated[
                        'quantity_ordered'
                    ],

                'quantity_received' => 0,

                'unit_cost' => $validated[
                        'unit_cost'
                    ]
                    ?? null,
            ]);

        return back()->with(
            'success',
            'Purchase order item added successfully.',
        );
    }

    /**
     * Update an existing purchase order item.
     */
    public function updateItem(
        Request $request,
        PurchaseOrder $purchaseOrder,
        PurchaseOrderItem $purchaseOrderItem,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Verify Item Belongs To This PO
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $purchaseOrderItem->purchase_order_id
                === $purchaseOrder->id,
            404,
        );

        /*
        |--------------------------------------------------------------------------
        | Purchase Order Safeguards
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

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate([
                'quantity_ordered' => [
                    'required',
                    'integer',
                    'min:1',
                ],

                'unit_cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                ],

                'manual_name' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'manual_description' => [
                    'nullable',
                    'string',
                    'max:5000',
                ],

                'manual_sku' => [
                    'nullable',
                    'string',
                    'max:255',
                ],

                'track_inventory' => [
                    'nullable',
                    'boolean',
                ],
            ]);

        /*
        |--------------------------------------------------------------------------
        | Receiving Safeguard
        |--------------------------------------------------------------------------
        |
        | Example:
        |
        | Ordered  = 20
        | Received = 8
        |
        | Admin may change Ordered to 8, 10, 20, 25, etc.
        | Admin may NOT change Ordered to 7 or anything below 8.
        |
        */

        $quantityOrdered =
            (int) $validated[
                'quantity_ordered'
            ];

        $quantityReceived =
            (int) $purchaseOrderItem
                ->quantity_received;

        if (
            $quantityOrdered
            < $quantityReceived
        ) {
            return back()->withErrors([
                'quantity_ordered' => "Quantity ordered cannot be less than the {$quantityReceived} unit(s) already received.",
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Build Update Data
        |--------------------------------------------------------------------------
        */

        $updateData = [
            'quantity_ordered' => $quantityOrdered,

            'unit_cost' => $validated[
                    'unit_cost'
                ]
                ?? null,
        ];

        /*
        |--------------------------------------------------------------------------
        | Manual Item Fields
        |--------------------------------------------------------------------------
        |
        | Catalog product identity is intentionally not editable here.
        | If the catalog variant itself is wrong, that should be handled through
        | the archive/add workflow rather than rewriting historical identity.
        |
        */

        if (
            $purchaseOrderItem->isManualItem()
        ) {
            if (
                blank(
                    $validated[
                        'manual_name'
                    ]
                    ?? null,
                )
            ) {
                return back()
                    ->withErrors([
                        'manual_name' => 'Please enter the manual item name.',
                    ]);
            }

            $updateData[
                'manual_name'
            ] =
                $validated[
                    'manual_name'
                ];

            $updateData[
                'manual_description'
            ] =
                $validated[
                    'manual_description'
                ]
                ?? null;

            $updateData[
                'manual_sku'
            ] =
                $validated[
                    'manual_sku'
                ]
                ?? null;

            $updateData[
                'track_inventory'
            ] =
                (bool) (
                    $validated[
                        'track_inventory'
                    ]
                    ?? false
                );
        }

        /*
        |--------------------------------------------------------------------------
        | Update Item
        |--------------------------------------------------------------------------
        */

        $purchaseOrderItem->update(
            $updateData,
        );

        return back()->with(
            'success',
            'Purchase order item updated successfully.',
        );
    }

    /**
     * Archive an existing purchase order item.
     */
    public function archiveItem(
        Request $request,
        PurchaseOrder $purchaseOrder,
        PurchaseOrderItem $purchaseOrderItem,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Verify Item Belongs To This PO
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $purchaseOrderItem->purchase_order_id
                === $purchaseOrder->id,
            404,
        );

        /*
        |--------------------------------------------------------------------------
        | Purchase Order Safeguards
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
                'Items from a completed purchase order cannot be archived.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Already Archived
        |--------------------------------------------------------------------------
        */

        if (
            $purchaseOrderItem->isArchived()
        ) {
            return back()->with(
                'error',
                'This purchase order item is already archived.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Receiving Safeguard
        |--------------------------------------------------------------------------
        |
        | Once physical merchandise has been received against this line,
        | the line must remain part of the PO's historical record.
        |
        */

        if (
            (int) $purchaseOrderItem->quantity_received
            > 0
        ) {
            return back()->with(
                'error',
                'This item cannot be archived because merchandise has already been received against it.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Prevent Empty Active PO
        |--------------------------------------------------------------------------
        |
        | A PO should not be left with zero active line items. If the Admin wants
        | to discontinue the entire PO, the whole PO should be archived instead.
        |
        */

        $otherActiveItemsExist =
            $purchaseOrder
                ->items()
                ->where(
                    'id',
                    '!=',
                    $purchaseOrderItem->id,
                )
                ->whereNull(
                    'archived_at',
                )
                ->exists();

        if (
            ! $otherActiveItemsExist
        ) {
            return back()->with(
                'error',
                'The last active item cannot be archived. Archive the entire purchase order instead.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Archive Item
        |--------------------------------------------------------------------------
        */

        $purchaseOrderItem->update([
            'archived_at' => now(),

            'archived_by' => $user->id,
        ]);

        return back()->with(
            'success',
            'Purchase order item archived successfully.',
        );
    }

    /**
     * Restore a previously archived purchase order item.
     */
    public function restoreItem(
        Request $request,
        PurchaseOrder $purchaseOrder,
        PurchaseOrderItem $purchaseOrderItem,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Verify Item Belongs To This PO
        |--------------------------------------------------------------------------
        */

        abort_unless(
            $purchaseOrderItem->purchase_order_id
                === $purchaseOrder->id,
            404,
        );

        /*
        |--------------------------------------------------------------------------
        | Not Archived
        |--------------------------------------------------------------------------
        */

        if (
            ! $purchaseOrderItem->isArchived()
        ) {
            return back()->with(
                'error',
                'This purchase order item is not archived.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Parent Purchase Order Safeguard
        |--------------------------------------------------------------------------
        |
        | An item cannot be restored to active status while its
        | own purchase order is still archived.
        |
        */

        if (
            $purchaseOrder->isArchived()
        ) {
            return back()->with(
                'error',
                'Restore the purchase order before restoring its items.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Restore Item
        |--------------------------------------------------------------------------
        */

        $purchaseOrderItem->update([
            'archived_at' => null,

            'archived_by' => null,
        ]);

        return back()->with(
            'success',
            'Purchase order item restored successfully.',
        );
    }

    /**
     * Display archived purchase orders.
     */
    public function archiveIndex(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        $period =
            (string)
            $request->query(
                'period',
                '',
            );

        $dateFrom =
            (string)
            $request->query(
                'date_from',
                '',
            );

        $dateTo =
            (string)
            $request->query(
                'date_to',
                '',
            );

        /*
        |--------------------------------------------------------------------------
        | Archived Purchase Orders
        |--------------------------------------------------------------------------
        */

        $query =
            PurchaseOrder::query()
                ->whereNotNull(
                    'archived_at',
                )
                ->with([
                    'creator:id,name',
                    'archivedBy:id,name',
                    'items',
                ])
                ->latest(
                    'archived_at',
                );

        /*
        |--------------------------------------------------------------------------
        | Period Filter
        |--------------------------------------------------------------------------
        */

        if (
            $period === 'week'
        ) {
            $query->whereBetween(
                'archived_at',
                [
                    now()
                        ->startOfWeek(),
                    now()
                        ->endOfWeek(),
                ],
            );
        }

        if (
            $period === 'month'
        ) {
            $query->whereBetween(
                'archived_at',
                [
                    now()
                        ->startOfMonth(),
                    now()
                        ->endOfMonth(),
                ],
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Custom Date Range
        |--------------------------------------------------------------------------
        */

        if (
            $dateFrom !== ''
        ) {
            $query->whereDate(
                'archived_at',
                '>=',
                $dateFrom,
            );
        }

        if (
            $dateTo !== ''
        ) {
            $query->whereDate(
                'archived_at',
                '<=',
                $dateTo,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        $purchaseOrders =
            $query
                ->paginate(
                    15,
                )
                ->withQueryString();

        /*
        |--------------------------------------------------------------------------
        | Map Archive Data
        |--------------------------------------------------------------------------
        */

        $purchaseOrders
            ->getCollection()
            ->transform(
                function (
                    PurchaseOrder $purchaseOrder,
                ): array {
                    $items =
                        $purchaseOrder
                            ->items;

                    $totalOrdered =
                        (int)
                        $items->sum(
                            'quantity_ordered',
                        );

                    $totalReceived =
                        (int)
                        $items->sum(
                            'quantity_received',
                        );

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
                                'M d, Y',
                            ),

                        'status' => $purchaseOrder
                            ->status,

                        'total_ordered' => $totalOrdered,

                        'total_received' => $totalReceived,

                        'total_remaining' => max(
                            0,
                            $totalOrdered
                            - $totalReceived,
                        ),

                        'created_by' => $purchaseOrder
                            ->creator
                            ?->name
                            ?? 'Unknown',

                        'archived_by' => $purchaseOrder
                            ->archivedBy
                            ?->name
                            ?? 'Unknown',

                        'created_at' => $purchaseOrder
                            ->created_at
                            ?->format(
                                'M d, Y h:i A',
                            ),

                        'archived_at' => $purchaseOrder
                            ->archived_at
                            ?->format(
                                'M d, Y h:i A',
                            ),
                    ];
                },
            );

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/PurchaseOrders/Archive',
            [
                'purchaseOrders' => $purchaseOrders,

                'filters' => [
                    'period' => $period,

                    'date_from' => $dateFrom,

                    'date_to' => $dateTo,
                ],
            ],
        );
    }

    /**
     * Display individually archived purchase order items.
     */
    public function archivedItemsIndex(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Filters
        |--------------------------------------------------------------------------
        */

        $period =
            (string)
            $request->query(
                'period',
                '',
            );

        $dateFrom =
            (string)
            $request->query(
                'date_from',
                '',
            );

        $dateTo =
            (string)
            $request->query(
                'date_to',
                '',
            );

        /*
        |--------------------------------------------------------------------------
        | Archived Items Query
        |--------------------------------------------------------------------------
        */

        $query =
            PurchaseOrderItem::query()
                ->whereNotNull(
                    'archived_at',
                )
                ->with([
                    'purchaseOrder',
                    'archivedBy:id,name',
                    'productVariant.product',
                ])
                ->latest(
                    'archived_at',
                );

        /*
        |--------------------------------------------------------------------------
        | Period Filter
        |--------------------------------------------------------------------------
        */

        if (
            $period === 'week'
        ) {
            $query->whereBetween(
                'archived_at',
                [
                    now()
                        ->startOfWeek(),
                    now()
                        ->endOfWeek(),
                ],
            );
        }

        if (
            $period === 'month'
        ) {
            $query->whereBetween(
                'archived_at',
                [
                    now()
                        ->startOfMonth(),
                    now()
                        ->endOfMonth(),
                ],
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Custom Date Range
        |--------------------------------------------------------------------------
        */

        if (
            $dateFrom !== ''
        ) {
            $query->whereDate(
                'archived_at',
                '>=',
                $dateFrom,
            );
        }

        if (
            $dateTo !== ''
        ) {
            $query->whereDate(
                'archived_at',
                '<=',
                $dateTo,
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        $archivedItems =
            $query
                ->paginate(
                    15,
                )
                ->withQueryString();

        /*
        |--------------------------------------------------------------------------
        | Map Archived Item Data
        |--------------------------------------------------------------------------
        */

        $archivedItems
            ->getCollection()
            ->transform(
                function (
                    PurchaseOrderItem $item,
                ): array {
                    $variant =
                        $item->productVariant;

                    $product =
                        $variant
                            ?->product;

                    return [
                        'id' => $item->id,

                        'purchase_order_id' => $item
                            ->purchase_order_id,

                        'po_number' => $item
                            ->purchaseOrder
                            ?->po_number
                            ?? 'Unknown',

                        'supplier_name' => $item
                            ->purchaseOrder
                            ?->supplier_name
                            ?? 'Unknown',

                        'item_type' => $item
                            ->item_type,

                        /*
                        |--------------------------------------------------------------------------
                        | Catalog Product
                        |--------------------------------------------------------------------------
                        */

                        'product_name' => $product
                            ?->name,

                        'product_code' => $product
                            ?->code,

                        'image_url' => $product
                            ?->image_url,

                        'sku' => $variant
                            ?->sku,

                        'variant_name' => $variant
                            ?->variant_name,

                        'program' => $variant
                            ?->program,

                        'size' => $variant
                            ?->size,

                        /*
                        |--------------------------------------------------------------------------
                        | Manual Item
                        |--------------------------------------------------------------------------
                        */

                        'manual_name' => $item
                            ->manual_name,

                        'manual_description' => $item
                            ->manual_description,

                        'manual_sku' => $item
                            ->manual_sku,

                        /*
                        |--------------------------------------------------------------------------
                        | Inventory / Quantity
                        |--------------------------------------------------------------------------
                        */

                        'track_inventory' => (bool)
                            $item
                                ->track_inventory,

                        'quantity_ordered' => (int)
                            $item
                                ->quantity_ordered,

                        'quantity_received' => (int)
                            $item
                                ->quantity_received,

                        'unit_cost' => $item
                            ->unit_cost !== null
                                ? (string)
                                    $item
                                        ->unit_cost
                                : null,

                        /*
                        |--------------------------------------------------------------------------
                        | Archive Information
                        |--------------------------------------------------------------------------
                        */

                        'archived_by' => $item
                            ->archivedBy
                            ?->name
                            ?? 'Unknown',

                        'archived_at' => $item
                            ->archived_at
                            ?->format(
                                'M d, Y h:i A',
                            ),
                    ];
                },
            );

        /*
        |--------------------------------------------------------------------------
        | Render
        |--------------------------------------------------------------------------
        */

        return Inertia::render(
            'admin/PurchaseOrders/ArchivedItems',
            [
                'archivedItems' => $archivedItems,

                'filters' => [
                    'period' => $period,

                    'date_from' => $dateFrom,

                    'date_to' => $dateTo,
                ],
            ],
        );
    }

    /**
     * Archive a purchase order.
     *
     * Purchase orders are never permanently deleted.
     */
    public function archive(
        Request $request,
        PurchaseOrder $purchaseOrder,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Already Archived
        |--------------------------------------------------------------------------
        */

        if (
            $purchaseOrder
                ->isArchived()
        ) {
            return back()->with(
                'error',
                'This purchase order is already archived.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Partially Received Safeguard
        |--------------------------------------------------------------------------
        |
        | A partially received PO must remain active because
        | merchandise is still expected.
        |
        */

        if (
            $purchaseOrder
                ->isPartiallyReceived()
        ) {
            return back()->with(
                'error',
                'A partially received purchase order cannot be archived while receiving is still in progress.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Received Merchandise Safeguard
        |--------------------------------------------------------------------------
        |
        | An ordered PO cannot be archived if merchandise
        | has already been received against it.
        |
        */

        if (
            $purchaseOrder
                ->isOrdered()
            && $purchaseOrder
                ->items()
                ->where(
                    'quantity_received',
                    '>',
                    0,
                )
                ->exists()
        ) {
            return back()->with(
                'error',
                'This purchase order already has received merchandise and cannot be archived.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Archive
        |--------------------------------------------------------------------------
        */

        $purchaseOrder->update([
            'archived_at' => now(),

            'archived_by' => $user->id,
        ]);

        return redirect()
            ->route(
                'admin.purchase-orders.index',
            )
            ->with(
                'success',
                'Purchase order archived successfully.',
            );
    }

    /**
     * Restore a previously archived purchase order.
     *
     * Only the purchase order itself is restored — any of its
     * items that were individually archived before the whole PO
     * was archived stay archived and must be restored separately.
     */
    public function restore(
        Request $request,
        PurchaseOrder $purchaseOrder,
    ): RedirectResponse {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Not Archived
        |--------------------------------------------------------------------------
        */

        if (
            ! $purchaseOrder
                ->isArchived()
        ) {
            return back()->with(
                'error',
                'This purchase order is not archived.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Restore
        |--------------------------------------------------------------------------
        */

        $purchaseOrder->update([
            'archived_at' => null,

            'archived_by' => null,
        ]);

        return back()->with(
            'success',
            'Purchase order restored successfully.',
        );
    }
}
