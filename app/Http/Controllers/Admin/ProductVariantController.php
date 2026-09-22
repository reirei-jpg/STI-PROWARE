<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProductVariantController extends Controller
{
    /**
     * Display all variants belonging to a product.
     */
    public function index(
        Request $request,
        Product $product,
    ): Response {
        $user = $request->user();

        abort_unless(
            $user
                && $user->isAdminLevel(),
            403,
        );

        $product->load([
            'category:id,name',

            'variants' => fn ($query) => $query
                ->with([
                    'inventory:id,product_variant_id,quantity_on_hand,quantity_reserved,reorder_level',
                ])
                ->orderBy('program')
                ->orderBy('size')
                ->orderBy('variant_name'),
        ]);

        return Inertia::render(
            'admin/Products/Variants/Index',
            [
                'product' => [
                    'id' => $product->id,

                    'code' => $product->code,

                    'name' => $product->name,

                    'variant_mode' => $product->variant_mode,

                    'variant_mode_label' => $this->variantModeLabel(
                        $product->variant_mode,
                    ),

                    'base_price' => (string)
                        $product->base_price,

                    'is_active' => (bool)
                        $product->is_active,

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
                            function (
                                ProductVariant $variant,
                            ): array {
                                return [
                                    'id' => $variant->id,

                                    'sku' => $variant->sku,

                                    'program' => $variant
                                        ->program,

                                    'size' => $variant
                                        ->size,

                                    'variant_name' => $variant
                                        ->variant_name
                                        ?? 'Standard',

                                    'variant_key' => $variant
                                        ->variant_key,

                                    'price_override' => $variant
                                        ->price_override
                                        !== null
                                            ? (string)
                                                $variant
                                                    ->price_override
                                            : null,

                                    'is_active' => (bool)
                                        $variant
                                            ->is_active,

                                    'inventory' => [
                                        'quantity_on_hand' => (int)
                                            (
                                                $variant
                                                    ->inventory
                                                    ?->quantity_on_hand
                                                ?? 0
                                            ),

                                        'quantity_reserved' => (int)
                                            (
                                                $variant
                                                    ->inventory
                                                    ?->quantity_reserved
                                                ?? 0
                                            ),

                                        'available_quantity' => (int)
                                            (
                                                $variant
                                                    ->inventory
                                                    ?->available_quantity
                                                ?? 0
                                            ),

                                        'reorder_level' => (int)
                                            (
                                                $variant
                                                    ->inventory
                                                    ?->reorder_level
                                                ?? 0
                                            ),

                                        'stock_status' => $variant
                                            ->inventory
                                            ?->stock_status
                                            ?? 'out_of_stock',
                                    ],
                                ];
                            },
                        )
                        ->values(),
                ],

                /*
                |--------------------------------------------------------------------------
                | Dropdown Options
                |--------------------------------------------------------------------------
                |
                | Reuse the same configuration used by Add Product so
                | Admin cannot create inconsistent Program or Size values.
                |
                */

                'programOptions' => config(
                    'proware.programs',
                    [],
                ),

                'sizeOptions' => config(
                    'proware.sizes',
                    [],
                ),
            ],
        );
    }

    /**
     * Add a variant to an existing product.
     */
    public function store(
        Request $request,
        Product $product,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user
                && $user->isAdminLevel(),
            403,
        );

        /*
        |--------------------------------------------------------------------------
        | Standard Products
        |--------------------------------------------------------------------------
        */

        if (
            $product->variant_mode ===
            Product::VARIANT_MODE_STANDARD
        ) {
            return back()->with(
                'error',
                'Standard products cannot have additional variants.',
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Validation
        |--------------------------------------------------------------------------
        */

        $validated =
            $request->validate(
                [
                    'program' => [
                        'nullable',
                        'string',
                        'max:100',
                    ],

                    'size' => [
                        'nullable',
                        'string',
                        'max:100',
                    ],

                    'price_override' => [
                        'nullable',
                        'numeric',
                        'min:0',
                        'max:99999999.99',
                    ],

                    'reorder_level' => [
                        'required',
                        'integer',
                        'min:0',
                        'max:999999',
                    ],
                ],
                [
                    'program.max' => 'The selected program is invalid.',

                    'size.max' => 'The selected size is invalid.',

                    'price_override.numeric' => 'The variant price must be a valid number.',

                    'price_override.min' => 'The variant price cannot be negative.',

                    'reorder_level.required' => 'The reorder level is required.',

                    'reorder_level.integer' => 'The reorder level must be a whole number.',

                    'reorder_level.min' => 'The reorder level cannot be negative.',
                ],
            );

        $program =
            $this->normalizeNullableText(
                $validated[
                    'program'
                ]
                ?? null,
            );

        $size =
            $this->normalizeNullableText(
                $validated[
                    'size'
                ]
                ?? null,
            );

        /*
        |--------------------------------------------------------------------------
        | Mode-Specific Validation
        |--------------------------------------------------------------------------
        */

        if (
            $product->variant_mode ===
            Product::VARIANT_MODE_PROGRAM_AND_SIZE
        ) {
            if (! $program) {
                throw ValidationException::withMessages([
                    'program' => 'Please select a program.',
                ]);
            }

            if (! $size) {
                throw ValidationException::withMessages([
                    'size' => 'Please select a size.',
                ]);
            }
        }

        if (
            $product->variant_mode ===
            Product::VARIANT_MODE_SIZE_ONLY
        ) {
            $program = null;

            if (! $size) {
                throw ValidationException::withMessages([
                    'size' => 'Please select a size.',
                ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Verify Selected Dropdown Values
        |--------------------------------------------------------------------------
        |
        | This prevents someone from manually posting an invalid value
        | that is not part of the PROWARE configuration.
        |
        */

        if ($program !== null) {
            $allowedPrograms =
                collect(
                    config(
                        'proware.programs',
                        [],
                    ),
                )
                    ->pluck(
                        'value',
                    )
                    ->map(
                        fn ($value) => (string)
                            $value,
                    );

            if (
                ! $allowedPrograms
                    ->contains(
                        $program,
                    )
            ) {
                throw ValidationException::withMessages([
                    'program' => 'Please select a valid program.',
                ]);
            }
        }

        if ($size !== null) {
            $allowedSizes =
                collect(
                    config(
                        'proware.sizes',
                        [],
                    ),
                )
                    ->pluck(
                        'value',
                    )
                    ->map(
                        fn ($value) => (string)
                            $value,
                    );

            if (
                ! $allowedSizes
                    ->contains(
                        $size,
                    )
            ) {
                throw ValidationException::withMessages([
                    'size' => 'Please select a valid size.',
                ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Duplicate Detection
        |--------------------------------------------------------------------------
        */

        $duplicateQuery =
            ProductVariant::query()
                ->where(
                    'product_id',
                    $product->id,
                );

        if ($program === null) {
            $duplicateQuery
                ->whereNull(
                    'program',
                );
        } else {
            $duplicateQuery
                ->whereRaw(
                    'LOWER(TRIM(program)) = ?',
                    [
                        Str::lower(
                            trim(
                                $program,
                            ),
                        ),
                    ],
                );
        }

        if ($size === null) {
            $duplicateQuery
                ->whereNull(
                    'size',
                );
        } else {
            $duplicateQuery
                ->whereRaw(
                    'LOWER(TRIM(size)) = ?',
                    [
                        Str::lower(
                            trim(
                                $size,
                            ),
                        ),
                    ],
                );
        }

        if (
            $duplicateQuery
                ->exists()
        ) {
            $message =
                $product
                    ->variant_mode ===
                Product::VARIANT_MODE_PROGRAM_AND_SIZE
                    ? 'This program and size combination already exists.'
                    : 'This size already exists for this product.';

            throw ValidationException::withMessages([
                'size' => $message,
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Build Variant Information
        |--------------------------------------------------------------------------
        */

        $variantName =
            $this->buildVariantName(
                $program,
                $size,
            );

        $variantKey =
            $this->buildVariantKey(
                $program,
                $size,
            );

        /*
        |--------------------------------------------------------------------------
        | Create Variant + Inventory
        |--------------------------------------------------------------------------
        */

        $variant =
            DB::transaction(
                function () use (
                    $product,
                    $program,
                    $size,
                    $variantName,
                    $variantKey,
                    $validated,
                ): ProductVariant {
                    $sku =
                        $this->generateSku(
                            $product,
                        );

                    $variant =
                        ProductVariant::create([
                            'product_id' => $product->id,

                            'sku' => $sku,

                            'program' => $program,

                            'size' => $size,

                            'variant_name' => $variantName,

                            'variant_key' => $variantKey,

                            'price_override' => filled(
                                $validated[
                                    'price_override'
                                ]
                                ?? null,
                            )
                                    ? $validated[
                                        'price_override'
                                    ]
                                    : null,

                            'is_active' => true,
                        ]);

                    Inventory::create([
                        'product_variant_id' => $variant->id,

                        'quantity_on_hand' => 0,

                        'quantity_reserved' => 0,

                        'reorder_level' => (int)
                            $validated[
                                'reorder_level'
                            ],
                    ]);

                    return $variant;
                },
                attempts: 3,
            );

        /*
        |--------------------------------------------------------------------------
        | Audit Log
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: 'variant_created',

            module: 'products',

            description: "Added variant {$variant->variant_name} "
                ."to {$product->code} — {$product->name}.",

            subject: $variant,

            newValues: [
                'product_code' => $product->code,

                'product_name' => $product->name,

                'sku' => $variant->sku,

                'program' => $variant->program,

                'size' => $variant->size,

                'variant_name' => $variant
                    ->variant_name,

                'variant_key' => $variant
                    ->variant_key,

                'price_override' => $variant
                    ->price_override,

                'quantity_on_hand' => 0,

                'quantity_reserved' => 0,

                'reorder_level' => (int)
                    $validated[
                        'reorder_level'
                    ],

                'is_active' => true,
            ],
        );

        /*
        |--------------------------------------------------------------------------
        | Redirect
        |--------------------------------------------------------------------------
        */

        return redirect()
            ->route(
                'admin.products.variants.index',
                $product,
            )
            ->with(
                'success',
                "Variant {$variant->variant_name} was added successfully. "
                .'Its inventory record was created with zero stock.',
            );
    }

    /**
     * Activate or deactivate a variant.
     */
    public function toggleStatus(
        Request $request,
        Product $product,
        ProductVariant $variant,
    ): RedirectResponse {
        $user = $request->user();

        abort_unless(
            $user
                && $user->isAdminLevel(),
            403,
        );

        abort_unless(
            $variant->product_id ===
            $product->id,
            404,
        );

        /*
        |--------------------------------------------------------------------------
        | Standard Products
        |--------------------------------------------------------------------------
        */

        if (
            $product->variant_mode ===
            Product::VARIANT_MODE_STANDARD
        ) {
            return back()->with(
                'error',
                'The default variant of a standard product cannot be disabled here.',
            );
        }

        $oldStatus =
            (bool)
            $variant
                ->is_active;

        $variant->update([
            'is_active' => ! $oldStatus,
        ]);

        $variant->refresh();

        /*
        |--------------------------------------------------------------------------
        | Audit
        |--------------------------------------------------------------------------
        */

        AuditLogger::log(
            request: $request,

            action: $variant->is_active
                    ? 'variant_activated'
                    : 'variant_deactivated',

            module: 'products',

            description: (
                $variant->is_active
                    ? 'Activated'
                    : 'Deactivated'
            )
                ." variant {$variant->variant_name} "
                ."for {$product->code} — {$product->name}.",

            subject: $variant,

            oldValues: [
                'is_active' => $oldStatus,
            ],

            newValues: [
                'is_active' => (bool)
                    $variant
                        ->is_active,
            ],
        );

        return back()->with(
            'success',
            $variant->is_active
                ? 'Variant activated successfully.'
                : 'Variant deactivated successfully.',
        );
    }

    /**
     * Generate a unique SKU.
     */
    private function generateSku(
        Product $product,
    ): string {
        do {
            $sku =
                Str::upper(
                    $product->code
                    .'-'
                    .Str::random(
                        6,
                    ),
                );
        } while (
            ProductVariant::query()
                ->where(
                    'sku',
                    $sku,
                )
                ->exists()
        );

        return $sku;
    }

    /**
     * Build readable variant name.
     */
    private function buildVariantName(
        ?string $program,
        ?string $size,
    ): string {
        $parts =
            array_values(
                array_filter([
                    $program,
                    $size,
                ]),
            );

        if ($parts === []) {
            return 'Standard';
        }

        return implode(
            ' / ',
            $parts,
        );
    }

    /**
     * Build internal variant key.
     */
    private function buildVariantKey(
        ?string $program,
        ?string $size,
    ): string {
        $parts =
            array_values(
                array_filter([
                    $program
                        ? Str::upper(
                            Str::slug(
                                $program,
                                '_',
                            ),
                        )
                        : null,

                    $size
                        ? Str::upper(
                            Str::slug(
                                $size,
                                '_',
                            ),
                        )
                        : null,
                ]),
            );

        if ($parts === []) {
            return 'STD';
        }

        return implode(
            '__',
            $parts,
        );
    }

    /**
     * Normalize optional strings.
     */
    private function normalizeNullableText(
        mixed $value,
    ): ?string {
        if (
            ! is_string(
                $value,
            )
        ) {
            return null;
        }

        $value =
            trim(
                $value,
            );

        return $value !== ''
            ? $value
            : null;
    }

    /**
     * Display label for tracking mode.
     */
    private function variantModeLabel(
        string $mode,
    ): string {
        return match ($mode) {
            Product::VARIANT_MODE_PROGRAM_AND_SIZE => 'Program + Size',

            Product::VARIANT_MODE_SIZE_ONLY => 'Size Only',

            Product::VARIANT_MODE_STANDARD => 'Standard',

            default => Str::headline(
                $mode,
            ),
        };
    }
}
