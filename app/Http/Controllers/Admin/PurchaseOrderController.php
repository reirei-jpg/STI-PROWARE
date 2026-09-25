<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Services\AuditLogger;
use App\Services\ProductCodeGenerator;
use App\Services\ProductVariantGenerator;
use App\Services\PurchaseOrderNumberGenerator;
use Illuminate\Http\JsonResponse;
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

                    'items' => fn ($itemQuery) => $itemQuery
                        ->whereNull('archived_at')
                        ->with('productVariant.product:id,name')
                        ->orderBy('id'),
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
                ->withQueryString()
                ->through(function (PurchaseOrder $purchaseOrder): array {
                    return [
                        ...$purchaseOrder->toArray(),
                        'item_summary' => $this->itemSummary($purchaseOrder),
                    ];
                });

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
     * Active catalog variants offered on the purchase-order create/edit
     * form. Physical inventory is shown only for reference — creating
     * or editing a purchase order never changes stock.
     *
     * @return array<int, array<string, mixed>>
     */
    private function catalogVariantsForPurchaseOrderForm(): array
    {
        return ProductVariant::query()
            ->with([
                'product:id,code,name',
                'inventory',
            ])
            ->where('is_active', true)
            ->whereHas(
                'product',
                fn ($query) => $query->where('is_active', true),
            )
            ->orderBy('sku')
            ->get()
            ->map(
                function (ProductVariant $variant): array {
                    $product = $variant->product;

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
                            'quantity_on_hand' => (int) ($variant->inventory?->quantity_on_hand ?? 0),
                            'quantity_reserved' => (int) ($variant->inventory?->quantity_reserved ?? 0),
                            'available_quantity' => (int) ($variant->inventory?->available_quantity ?? 0),
                            'reorder_level' => (int) ($variant->inventory?->reorder_level ?? 0),
                        ],
                    ];
                },
            )
            ->values()
            ->all();
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

        /*
        |--------------------------------------------------------------------------
        | Render Purchase Order Creation Page
        |--------------------------------------------------------------------------
        |
        | Purchase order creation only collects procurement information
        | (item, quantity, unit cost). Category, selling price, and
        | variant structure are catalog/merchandising decisions and are
        | collected later, when the item is actually resolved into a
        | PROWARE product during receiving.
        */

        return Inertia::render(
            'admin/PurchaseOrders/Create',
            [
                'variants' => $this->catalogVariantsForPurchaseOrderForm(),
            ],
        );
    }

    /**
     * Resume editing a saved draft purchase order.
     *
     * Only ever reachable for a purchase order still in DRAFT status —
     * an already-ordered PO has its own show/receiving flow and is
     * never edited through this form.
     */
    public function edit(
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

        abort_unless(
            $purchaseOrder->status
                === PurchaseOrder::STATUS_DRAFT,
            404,
        );

        $purchaseOrder->load(
            'items',
        );

        return Inertia::render(
            'admin/PurchaseOrders/Create',
            [
                'variants' => $this->catalogVariantsForPurchaseOrderForm(),

                'purchaseOrder' => [
                    'id' => $purchaseOrder->id,

                    'po_number' => $purchaseOrder->po_number,

                    'supplier_name' => $purchaseOrder->supplier_name
                        === 'Untitled Draft'
                            ? ''
                            : $purchaseOrder->supplier_name,

                    'supplier_reference_number' => $purchaseOrder
                        ->supplier_reference_number
                        ?? '',

                    'expected_delivery_date' => $purchaseOrder
                        ->expected_delivery_date
                        ?->toDateString() ?? '',

                    'notes' => $purchaseOrder->notes
                        ?? '',

                    'items' => $purchaseOrder->items
                        ->map(
                            fn (PurchaseOrderItem $item): array => [
                                'source_type' => $item->item_type
                                    === PurchaseOrderItem::TYPE_CATALOG
                                        ? 'existing_catalog'
                                        : (
                                            $item->merchandise_origin
                                                === PurchaseOrderItem::ORIGIN_NEW
                                                ? 'new_inventory'
                                                : 'manual'
                                        ),

                                'product_variant_id' => $item->product_variant_id,

                                'product_name' => $item->manual_name,

                                'product_description' => $item->manual_description,

                                'manual_name' => $item->manual_name,

                                'manual_description' => $item->manual_description,

                                'manual_sku' => $item->manual_sku,

                                'quantity_ordered' => $item->quantity_ordered,

                                'unit_cost' => $item->unit_cost !== null
                                    ? (string) $item->unit_cost
                                    : '',
                            ],
                        )
                        ->values(),
                ],
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
                                ?->timezone(config('app.display_timezone'))
                                ->format(
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
                        ?->timezone(config('app.display_timezone'))
                        ->format(
                            'M d, Y h:i A',
                        ),

                    'completed_at' => $purchaseOrder
                        ->completed_at
                        ?->timezone(config('app.display_timezone'))
                        ->format(
                            'M d, Y h:i A',
                        ),

                    /*
            |--------------------------------------------------------------
            | Archive Information
            |--------------------------------------------------------------
            */

                    'archived_at' => $purchaseOrder
                        ->archived_at
                        ?->timezone(config('app.display_timezone'))
                        ->format(
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
                    'after_or_equal:today',
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
                |
                | Category, selling price, and variant structure are
                | catalog/merchandising decisions, not procurement
                | information, so the PO only collects a name and an
                | optional description here. They are resolved into a
                | real PROWARE product later, during receiving.
                */

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
                    'max:10000',
                ],

                'items.*.unit_cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:10000',
                ],
            ], [
                'expected_delivery_date.after_or_equal' => 'The expected delivery date cannot be in the past.',
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
                && blank(
                    $item['product_name']
                    ?? null,
                )
            ) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_name" => 'Please enter the item name.',
                ]);
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

                    $this->createPurchaseOrderItems(
                        $purchaseOrder,
                        $validated['items'],
                    );

                    return $purchaseOrder;
                },
            );

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,
            action: 'created',
            module: 'purchase_orders',
            description: "Created purchase order {$purchaseOrder->po_number} for supplier {$purchaseOrder->supplier_name} (".count($validated['items']).' item(s)).',
            subject: $purchaseOrder,
            newValues: [
                'po_number' => $purchaseOrder->po_number,

                'supplier_name' => $purchaseOrder->supplier_name,

                'status' => $purchaseOrder->status,

                'item_count' => count($validated['items']),
            ],
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
     * Create every line item for a purchase order from fully-validated
     * "store()"-strength data (every required field present).
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function createPurchaseOrderItems(
        PurchaseOrder $purchaseOrder,
        array $items,
    ): void {
        foreach ($items as $item) {
            $sourceType = $item['source_type'];

            if ($sourceType === 'existing_catalog') {
                $purchaseOrder->items()->create([
                    'item_type' => PurchaseOrderItem::TYPE_CATALOG,
                    'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
                    'product_variant_id' => $item['product_variant_id'],
                    'manual_name' => null,
                    'manual_description' => null,
                    'manual_sku' => null,
                    'track_inventory' => true,
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'] ?? null,
                ]);

                continue;
            }

            if ($sourceType === 'new_inventory') {
                $purchaseOrder->items()->create([
                    'item_type' => PurchaseOrderItem::TYPE_MANUAL,
                    'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
                    'product_variant_id' => null,
                    'manual_name' => trim($item['product_name']),
                    'manual_description' => filled($item['product_description'] ?? null)
                        ? trim($item['product_description'])
                        : null,
                    'proposed_category_id' => null,
                    'proposed_selling_price' => null,
                    'manual_sku' => null,
                    'track_inventory' => true,
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'] ?? null,
                ]);

                continue;
            }

            $purchaseOrder->items()->create([
                'item_type' => PurchaseOrderItem::TYPE_MANUAL,
                'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
                'product_variant_id' => null,
                'manual_name' => trim($item['manual_name']),
                'manual_description' => filled($item['manual_description'] ?? null)
                    ? trim($item['manual_description'])
                    : null,
                'manual_sku' => filled($item['manual_sku'] ?? null)
                    ? trim($item['manual_sku'])
                    : null,
                'track_inventory' => false,
                'quantity_ordered' => $item['quantity_ordered'],
                'quantity_received' => 0,
                'unit_cost' => $item['unit_cost'] ?? null,
            ]);
        }
    }

    /**
     * Create every line item for a purchase order DRAFT, where any field
     * may be missing or blank because the admin hasn't finished filling
     * in the form yet. Rows with no identifying content at all are
     * silently skipped rather than saved as empty items.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function saveDraftPurchaseOrderItems(
        PurchaseOrder $purchaseOrder,
        array $items,
    ): void {
        foreach ($items as $item) {
            $sourceType = $item['source_type'] ?? null;

            $hasContent =
                filled($item['product_variant_id'] ?? null)
                || filled($item['product_name'] ?? null)
                || filled($item['manual_name'] ?? null)
                || filled($item['quantity_ordered'] ?? null);

            if (! $hasContent) {
                continue;
            }

            if ($sourceType === 'existing_catalog' && filled($item['product_variant_id'] ?? null)) {
                $purchaseOrder->items()->create([
                    'item_type' => PurchaseOrderItem::TYPE_CATALOG,
                    'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
                    'product_variant_id' => $item['product_variant_id'],
                    'track_inventory' => true,
                    'quantity_ordered' => (int) ($item['quantity_ordered'] ?? 0),
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'] ?? null,
                ]);

                continue;
            }

            if ($sourceType === 'new_inventory') {
                $purchaseOrder->items()->create([
                    'item_type' => PurchaseOrderItem::TYPE_MANUAL,
                    'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
                    'product_variant_id' => null,
                    'manual_name' => trim($item['product_name'] ?? '') ?: 'Untitled item',
                    'manual_description' => filled($item['product_description'] ?? null)
                        ? trim($item['product_description'])
                        : null,
                    'proposed_category_id' => null,
                    'proposed_selling_price' => null,
                    'manual_sku' => null,
                    'track_inventory' => true,
                    'quantity_ordered' => (int) ($item['quantity_ordered'] ?? 0),
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'] ?? null,
                ]);

                continue;
            }

            $purchaseOrder->items()->create([
                'item_type' => PurchaseOrderItem::TYPE_MANUAL,
                'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
                'product_variant_id' => null,
                'manual_name' => trim($item['manual_name'] ?? '') ?: 'Untitled item',
                'manual_description' => filled($item['manual_description'] ?? null)
                    ? trim($item['manual_description'])
                    : null,
                'manual_sku' => filled($item['manual_sku'] ?? null)
                    ? trim($item['manual_sku'])
                    : null,
                'track_inventory' => false,
                'quantity_ordered' => (int) ($item['quantity_ordered'] ?? 0),
                'quantity_received' => 0,
                'unit_cost' => $item['unit_cost'] ?? null,
            ]);
        }
    }

    /**
     * The lenient validation rules used for saving a purchase order as a
     * draft — everything is optional, since the admin may still be in
     * the middle of filling the form in when a draft save happens.
     *
     * @return array<string, mixed>
     */
    private function draftPurchaseOrderRules(): array
    {
        return [
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'supplier_reference_number' => ['nullable', 'string', 'max:255'],
            'expected_delivery_date' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:5000'],

            'items' => ['nullable', 'array'],

            'items.*.source_type' => [
                'nullable',
                'string',
                Rule::in(['existing_catalog', 'new_inventory', 'manual']),
            ],

            'items.*.product_variant_id' => [
                'nullable',
                'integer',
                Rule::exists('product_variants', 'id'),
            ],

            'items.*.product_name' => ['nullable', 'string', 'max:255'],
            'items.*.product_description' => ['nullable', 'string', 'max:5000'],
            'items.*.manual_name' => ['nullable', 'string', 'max:255'],
            'items.*.manual_description' => ['nullable', 'string', 'max:5000'],
            'items.*.manual_sku' => ['nullable', 'string', 'max:255'],
            'items.*.quantity_ordered' => ['nullable', 'integer', 'min:0', 'max:10000'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0', 'max:10000'],
        ];
    }

    /**
     * Save a brand-new purchase order as a draft.
     *
     * Used by the create-page navigation guard when the admin tries to
     * leave with unsaved progress and chooses to save it rather than
     * lose it or discard it. Deliberately lenient: a draft may have no
     * items yet, missing quantities, or no supplier name at all.
     */
    public function storeDraft(
        Request $request,
        PurchaseOrderNumberGenerator $purchaseOrderNumberGenerator,
    ): JsonResponse {
        $user = $request->user();

        abort_unless($user && $user->isAdminLevel(), 403);

        $validated = $request->validate($this->draftPurchaseOrderRules());

        $purchaseOrder = DB::transaction(
            function () use ($validated, $user, $purchaseOrderNumberGenerator): PurchaseOrder {
                $purchaseOrder = PurchaseOrder::query()->create([
                    'po_number' => $purchaseOrderNumberGenerator->generate(),

                    'supplier_name' => filled($validated['supplier_name'] ?? null)
                        ? trim($validated['supplier_name'])
                        : 'Untitled Draft',

                    'supplier_reference_number' => filled($validated['supplier_reference_number'] ?? null)
                        ? trim($validated['supplier_reference_number'])
                        : null,

                    'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,

                    'status' => PurchaseOrder::STATUS_DRAFT,

                    'created_by' => $user->id,

                    'ordered_at' => null,

                    'completed_at' => null,

                    'notes' => filled($validated['notes'] ?? null)
                        ? trim($validated['notes'])
                        : null,
                ]);

                $this->saveDraftPurchaseOrderItems($purchaseOrder, $validated['items'] ?? []);

                return $purchaseOrder;
            },
        );

        AuditLogger::log(
            request: $request,
            action: 'draft_saved',
            module: 'purchase_orders',
            description: "Saved purchase order draft {$purchaseOrder->po_number} for supplier {$purchaseOrder->supplier_name}.",
            subject: $purchaseOrder,
            newValues: [
                'po_number' => $purchaseOrder->po_number,
                'status' => $purchaseOrder->status,
            ],
        );

        return response()->json([
            'po_number' => $purchaseOrder->po_number,
            'id' => $purchaseOrder->id,
            'edit_url' => route('admin.purchase-orders.edit', $purchaseOrder),
        ]);
    }

    /**
     * Save progress on an already-existing draft, without finalizing it.
     *
     * Used by the edit-page navigation guard, the same way storeDraft()
     * is used from the create page.
     */
    public function updateDraft(
        Request $request,
        PurchaseOrder $purchaseOrder,
    ): JsonResponse {
        $user = $request->user();

        abort_unless($user && $user->isAdminLevel(), 403);

        abort_unless($purchaseOrder->status === PurchaseOrder::STATUS_DRAFT, 404);

        $validated = $request->validate($this->draftPurchaseOrderRules());

        DB::transaction(function () use ($validated, $purchaseOrder): void {
            $purchaseOrder->update([
                'supplier_name' => filled($validated['supplier_name'] ?? null)
                    ? trim($validated['supplier_name'])
                    : 'Untitled Draft',

                'supplier_reference_number' => filled($validated['supplier_reference_number'] ?? null)
                    ? trim($validated['supplier_reference_number'])
                    : null,

                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,

                'notes' => filled($validated['notes'] ?? null)
                    ? trim($validated['notes'])
                    : null,
            ]);

            // A draft's items have never been received against, so it's
            // safe to simply replace them wholesale on every save.
            $purchaseOrder->items()->delete();

            $this->saveDraftPurchaseOrderItems($purchaseOrder, $validated['items'] ?? []);
        });

        AuditLogger::log(
            request: $request,
            action: 'draft_saved',
            module: 'purchase_orders',
            description: "Saved purchase order draft {$purchaseOrder->po_number} for supplier {$purchaseOrder->supplier_name}.",
            subject: $purchaseOrder,
            newValues: [
                'po_number' => $purchaseOrder->po_number,
                'status' => $purchaseOrder->status,
            ],
        );

        return response()->json([
            'po_number' => $purchaseOrder->po_number,
            'id' => $purchaseOrder->id,
        ]);
    }

    /**
     * Finalize a draft into a real, ordered purchase order.
     *
     * Runs the same strict validation as store() — a draft can only be
     * finalized once it actually has everything a real purchase order
     * needs.
     */
    public function update(
        Request $request,
        PurchaseOrder $purchaseOrder,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless($user && $user->isAdminLevel(), 403);

        abort_unless($purchaseOrder->status === PurchaseOrder::STATUS_DRAFT, 404);

        $validated = $request->validate([
            'supplier_name' => ['required', 'string', 'max:255'],
            'supplier_reference_number' => ['nullable', 'string', 'max:255'],
            'expected_delivery_date' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.source_type' => [
                'required',
                'string',
                Rule::in(['existing_catalog', 'new_inventory', 'manual']),
            ],
            'items.*.product_variant_id' => [
                'nullable',
                'integer',
                Rule::exists('product_variants', 'id'),
            ],
            'items.*.product_name' => ['nullable', 'string', 'max:255'],
            'items.*.product_description' => ['nullable', 'string', 'max:5000'],
            'items.*.manual_name' => ['nullable', 'string', 'max:255'],
            'items.*.manual_description' => ['nullable', 'string', 'max:5000'],
            'items.*.manual_sku' => ['nullable', 'string', 'max:255'],
            'items.*.quantity_ordered' => ['required', 'integer', 'min:1', 'max:10000'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0', 'max:10000'],
        ], [
            'expected_delivery_date.after_or_equal' => 'The expected delivery date cannot be in the past.',
        ]);

        foreach ($validated['items'] as $index => $item) {
            $sourceType = $item['source_type'];

            if ($sourceType === 'existing_catalog' && empty($item['product_variant_id'])) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_variant_id" => 'Please select an existing product variant.',
                ]);
            }

            if ($sourceType === 'new_inventory' && blank($item['product_name'] ?? null)) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_name" => 'Please enter the item name.',
                ]);
            }

            if ($sourceType === 'manual' && blank($item['manual_name'] ?? null)) {
                throw ValidationException::withMessages([
                    "items.{$index}.manual_name" => 'Please enter the item name.',
                ]);
            }
        }

        DB::transaction(function () use ($validated, $purchaseOrder): void {
            $purchaseOrder->update([
                'supplier_name' => trim($validated['supplier_name']),

                'supplier_reference_number' => filled($validated['supplier_reference_number'] ?? null)
                    ? trim($validated['supplier_reference_number'])
                    : null,

                'expected_delivery_date' => $validated['expected_delivery_date'] ?? null,

                'status' => PurchaseOrder::STATUS_ORDERED,

                'ordered_at' => now(),

                'notes' => filled($validated['notes'] ?? null)
                    ? trim($validated['notes'])
                    : null,
            ]);

            $purchaseOrder->items()->delete();

            $this->createPurchaseOrderItems($purchaseOrder, $validated['items']);
        });

        $purchaseOrder->refresh();

        AuditLogger::log(
            request: $request,
            action: 'created',
            module: 'purchase_orders',
            description: "Finalized purchase order draft into {$purchaseOrder->po_number} for supplier {$purchaseOrder->supplier_name} (".count($validated['items']).' item(s)).',
            subject: $purchaseOrder,
            newValues: [
                'po_number' => $purchaseOrder->po_number,
                'status' => $purchaseOrder->status,
                'item_count' => count($validated['items']),
            ],
        );

        return redirect()
            ->route('admin.purchase-orders.show', $purchaseOrder)
            ->with('success', 'Purchase order created successfully.');
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
                    'max:10000',
                ],

                'unit_cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:10000',
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
        | Validation
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate([
                'quantity_ordered' => [
                    'required',
                    'integer',
                    'min:1',
                    'max:10000',
                ],

                'unit_cost' => [
                    'nullable',
                    'numeric',
                    'min:0',
                    'max:10000',
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
        | Lock + Re-Verify + Update, One Transaction
        |--------------------------------------------------------------------------
        |
        | quantity_received can change concurrently — StockReceiptController
        | locks this same row while receiving stock. Without locking here
        | too, an admin editing this item could read a stale
        | quantity_received, pass the "ordered >= received" check against
        | that stale value, and still write — even though a receipt that
        | landed in between may have pushed the real quantity_received
        | above what this request just validated against. The archived/
        | completed safeguards are re-checked against freshly locked data
        | for the same reason: they could have changed after this request
        | started but before it reaches the write.
        */

        $result =
            DB::transaction(
                function () use (
                    $purchaseOrder,
                    $purchaseOrderItem,
                    $validated,
                ): array {
                    $lockedOrder =
                        PurchaseOrder::query()
                            ->whereKey(
                                $purchaseOrder->id,
                            )
                            ->lockForUpdate()
                            ->first();

                    if (! $lockedOrder) {
                        return [
                            'status' => 'not_found',
                        ];
                    }

                    if ($lockedOrder->isArchived()) {
                        return [
                            'status' => 'order_archived',
                        ];
                    }

                    if ($lockedOrder->isCompleted()) {
                        return [
                            'status' => 'order_completed',
                        ];
                    }

                    $lockedItem =
                        PurchaseOrderItem::query()
                            ->whereKey(
                                $purchaseOrderItem->id,
                            )
                            ->where(
                                'purchase_order_id',
                                $lockedOrder->id,
                            )
                            ->lockForUpdate()
                            ->first();

                    if (! $lockedItem) {
                        return [
                            'status' => 'not_found',
                        ];
                    }

                    if ($lockedItem->isArchived()) {
                        return [
                            'status' => 'item_archived',
                        ];
                    }

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
                        (int) $lockedItem
                            ->quantity_received;

                    if (
                        $quantityOrdered
                        < $quantityReceived
                    ) {
                        return [
                            'status' => 'below_received',

                            'quantity_received' => $quantityReceived,
                        ];
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
                        $lockedItem->isManualItem()
                    ) {
                        if (
                            blank(
                                $validated[
                                    'manual_name'
                                ]
                                ?? null,
                            )
                        ) {
                            return [
                                'status' => 'manual_name_required',
                            ];
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

                    $lockedItem->update(
                        $updateData,
                    );

                    return [
                        'status' => 'updated',
                    ];
                },
            );

        return match ($result['status']) {
            'order_archived' => back()->with(
                'error',
                'Archived purchase orders cannot be modified.',
            ),

            'order_completed' => back()->with(
                'error',
                'Completed purchase orders cannot be modified.',
            ),

            'item_archived' => back()->with(
                'error',
                'Archived purchase order items cannot be modified.',
            ),

            'not_found' => back()->with(
                'error',
                'This purchase order item could not be found.',
            ),

            'below_received' => back()->withErrors([
                'quantity_ordered' => "Quantity ordered cannot be less than the {$result['quantity_received']} unit(s) already received.",
            ]),

            'manual_name_required' => back()->withErrors([
                'manual_name' => 'Please enter the manual item name.',
            ]),

            default => back()->with(
                'success',
                'Purchase order item updated successfully.',
            ),
        };
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
                            ?->timezone(config('app.display_timezone'))
                            ->format(
                                'M d, Y h:i A',
                            ),

                        'archived_at' => $purchaseOrder
                            ->archived_at
                            ?->timezone(config('app.display_timezone'))
                            ->format(
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
                            ?->timezone(config('app.display_timezone'))
                            ->format(
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

        AuditLogger::log(
            request: $request,
            action: 'archived',
            module: 'purchase_orders',
            description: "Archived purchase order {$purchaseOrder->po_number} for supplier {$purchaseOrder->supplier_name}.",
            subject: $purchaseOrder,
            oldValues: [
                'archived_at' => null,
            ],
            newValues: [
                'archived_at' => $purchaseOrder
                    ->archived_at
                    ?->toDateTimeString(),
            ],
        );

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

        $previouslyArchivedAt =
            $purchaseOrder
                ->archived_at
                ?->toDateTimeString();

        $purchaseOrder->update([
            'archived_at' => null,

            'archived_by' => null,
        ]);

        AuditLogger::log(
            request: $request,
            action: 'restored',
            module: 'purchase_orders',
            description: "Restored purchase order {$purchaseOrder->po_number} for supplier {$purchaseOrder->supplier_name}.",
            subject: $purchaseOrder,
            oldValues: [
                'archived_at' => $previouslyArchivedAt,
            ],
            newValues: [
                'archived_at' => null,
            ],
        );

        return back()->with(
            'success',
            'Purchase order restored successfully.',
        );
    }

    /**
     * A short, human-readable summary of what's in a purchase order, so it
     * stays recognizable in a list without opening it, e.g. "Golden Jacket"
     * or "Golden Jacket +4 more" when it has several products.
     */
    private function itemSummary(PurchaseOrder $purchaseOrder): ?string
    {
        $items = $purchaseOrder->items;

        if ($items->isEmpty()) {
            return null;
        }

        $firstName = $items->first()->productVariant?->product?->name
            ?? $items->first()->manual_name
            ?? 'Item';

        if ($items->count() === 1) {
            return $firstName;
        }

        $remaining = $items->count() - 1;

        return "{$firstName} +{$remaining} more";
    }
}
