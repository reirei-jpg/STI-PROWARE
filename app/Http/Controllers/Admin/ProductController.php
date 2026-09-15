<?php

namespace App\Http\Controllers\Admin;

use App\Filters\ProductFilters;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Services\ProductCodeGenerator;
use App\Services\ProductVariantGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProductController extends Controller
{
    /**
     * Display all products.
     */
    /**
     * Display all products.
     */
    public function index(
        ProductFilters $productFilters,
    ): Response {
        $products = $productFilters
            ->apply(
                Product::query()
                    ->with([
                        'category:id,name',
                        'creator:id,name',
                    ])
                    ->withCount('variants'),
            )
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(
                fn (Product $product) => [
                    'id' => $product->id,
                    'code' => $product->code,
                    'name' => $product->name,
                    'description' => $product->description,
                    'base_price' => $product->base_price,

                    'variant_mode' => $product->variant_mode,

                    'variant_mode_label' => $this->variantModeLabel(
                        $product->variant_mode,
                    ),

                    'availability_status' => $product->availability_status,

                    'availability_label' => $product->availabilityLabel(),

                    'preorder_enabled' => $product->preorder_enabled,

                    'expected_release_date' => $product->expected_release_date
                            ? $product
                                ->expected_release_date
                                ->format('M d, Y')
                            : null,

                    'variants_count' => $product->variants_count,

                    'image_url' => $product->image_path
                            ? asset(
                                'storage/'
                                .$product->image_path,
                            )
                            : null,

                    'is_active' => $product->is_active,

                    'category' => [
                    'id' => $product->category->id,

                    'name' => $product->category->name,
                ],

                    'creator' => [
                    'id' => $product->creator->id,

                    'name' => $product->creator->name,
                ],

                    'created_at' => $product
                        ->created_at
                        ->format('M d, Y'),
                ],
            );

        return Inertia::render(
            'admin/Products/Index',
            [
                'products' => $products,

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
                    [
                        'value' => Product::AVAILABILITY_INACTIVE,
                        'label' => 'Inactive',
                    ],
                ],
            ],
        );
    }

    /**
     * Display the Add Product form.
     */
    public function create(): Response
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get([
                'id',
                'name',
            ])
            ->map(
                fn (Category $category) => [
                    'id' => $category->id,
                    'name' => $category->name,

                    'recommended_variant_mode' => $this->recommendedVariantMode(
                        $category->name,
                    ),
                ],
            )
            ->values();

        return Inertia::render(
            'admin/Products/Create',
            [
                'categories' => $categories,

                'productCodePattern' => 'PRO-000000',

                'variantModes' => [
                    [
                        'value' => Product::VARIANT_MODE_PROGRAM_AND_SIZE,

                        'label' => 'Program and Size',

                        'description' => 'For College Uniform products that differ by academic program and size.',
                    ],
                    [
                        'value' => Product::VARIANT_MODE_SIZE_ONLY,

                        'label' => 'Size Only',

                        'description' => 'For Senior High uniforms, STI shirts, jackets, pants, and other sized merchandise.',
                    ],
                    [
                        'value' => Product::VARIANT_MODE_STANDARD,

                        'label' => 'Standard / No Size',

                        'description' => 'For mugs, lanyards, pins, notebooks, and products without sizes.',
                    ],
                ],

                /*
                 * Product lifecycle choices shown in the
                 * Add Product form.
                 */
                'availabilityStatuses' => [
                    [
                        'value' => Product::AVAILABILITY_AVAILABLE,

                        'label' => 'Available',

                        'description' => 'Released merchandise that students may order when the selected variant has available stock.',
                    ],
                    [
                        'value' => Product::AVAILABILITY_COMING_SOON,

                        'label' => 'Coming Soon',

                        'description' => 'Announced merchandise that may optionally accept preorders before release.',
                    ],
                    [
                        'value' => Product::AVAILABILITY_OUT_OF_STOCK,

                        'label' => 'Out of Stock',

                        'description' => 'Released merchandise that is temporarily unavailable for normal ordering.',
                    ],
                    [
                        'value' => Product::AVAILABILITY_INACTIVE,

                        'label' => 'Inactive',

                        'description' => 'Hidden merchandise retained only for records and transaction history.',
                    ],
                ],

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
     * Create the product, its variants, and its zero-stock
     * inventory records as one transaction.
     */
    public function store(
        StoreProductRequest $request,
        ProductCodeGenerator $productCodeGenerator,
        ProductVariantGenerator $productVariantGenerator,
    ): RedirectResponse {
        $validated = $request->validated();

        $imagePath = null;

        if ($request->hasFile('image')) {
            $image = $request->file('image');

            if (! $image->isValid()) {
                return back()
                    ->withErrors([
                        'image' => 'The image upload was not completed successfully.',
                    ])
                    ->withInput();
            }

            $imagePath = $image->store(
                'products',
                'public',
            );
        }

        try {
            $product = DB::transaction(
                function () use (
                    $request,
                    $validated,
                    $imagePath,
                    $productCodeGenerator,
                    $productVariantGenerator,
                ): Product {
                    $preorderEnabled =
                        (bool) $validated[
                            'preorder_enabled'
                        ];

                    $product = Product::create([
                        'category_id' => $validated['category_id'],

                        'created_by' => $request->user()->id,

                        'code' => $productCodeGenerator
                            ->generate(),

                        'name' => $validated['name'],

                        'description' => $validated['description']
                            ?? null,

                        'base_price' => $validated['base_price'],

                        'image_path' => $imagePath,

                        'variant_mode' => $validated['variant_mode'],

                        'availability_status' => $validated[
                                'availability_status'
                            ],

                        'preorder_enabled' => $preorderEnabled,

                        /*
                         * These values are retained only when
                         * they apply to preorder configuration.
                         */
                        'expected_release_date' => $validated[
                                'expected_release_date'
                            ]
                            ?? null,

                        'preorder_starts_at' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_starts_at'
                                    ]
                                    ?? null
                                )
                                : null,

                        'preorder_ends_at' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_ends_at'
                                    ]
                                    ?? null
                                )
                                : null,

                        'preorder_limit_per_student' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_limit_per_student'
                                    ]
                                    ?? null
                                )
                                : null,

                        'preorder_capacity' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_capacity'
                                    ]
                                    ?? null
                                )
                                : null,

                        'is_active' => $validated['is_active'],
                    ]);

                    $productVariantGenerator->generate(
                        product: $product,

                        programs: $validated['programs']
                            ?? [],

                        sizes: $validated['sizes']
                            ?? [],
                    );

                    return $product;
                },
                attempts: 3,
            );
        } catch (Throwable $exception) {
            /*
             * Database rollback does not automatically remove
             * a file already written to storage.
             */
            if ($imagePath) {
                Storage::disk('public')
                    ->delete($imagePath);
            }

            throw $exception;
        }

        $variantCount = $product
            ->variants()
            ->count();

        return redirect()
            ->route(
                'admin.products.edit',
                $product,
            );
    }

    /**
     * Display the Edit Product form.
     */
    public function edit(
        Product $product,
    ): Response {
        $product->load([
            'category:id,name',
        ]);

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

                        'recommended_variant_mode' => $this
                            ->recommendedVariantMode(
                                $category->name,
                            ),
                    ],
                )
                ->values();

        return Inertia::render(
            'admin/Products/Edit',
            [
                /*
                |--------------------------------------------------------------------------
                | Product
                |--------------------------------------------------------------------------
                */

                'product' => [
                    'id' => $product->id,

                    'code' => $product->code,

                    'category_id' => $product->category_id,

                    'name' => $product->name,

                    'description' => $product->description,

                    'base_price' => (string)
                        $product->base_price,

                    /*
                     * Variant configuration is shown as read-only
                     * on the edit page.
                     */

                    'variant_mode' => $product->variant_mode,

                    'variant_mode_label' => $this->variantModeLabel(
                        $product
                            ->variant_mode,
                    ),

                    'availability_status' => $product
                        ->availability_status,

                    'preorder_enabled' => (bool)
                        $product
                            ->preorder_enabled,

                    'expected_release_date' => $product
                        ->expected_release_date
                        ?->format(
                            'Y-m-d',
                        ),

                    'preorder_starts_at' => $product
                        ->preorder_starts_at
                        ?->format(
                            'Y-m-d\TH:i',
                        ),

                    'preorder_ends_at' => $product
                        ->preorder_ends_at
                        ?->format(
                            'Y-m-d\TH:i',
                        ),

                    'preorder_limit_per_student' => $product
                        ->preorder_limit_per_student,

                    'preorder_capacity' => $product
                        ->preorder_capacity,

                    'image_url' => $product->image_path
                            ? asset(
                                'storage/'
                                .$product
                                    ->image_path,
                            )
                            : null,

                    'is_active' => (bool)
                        $product->is_active,
                ],

                /*
            |--------------------------------------------------------------------------
            | Categories
            |--------------------------------------------------------------------------
            */

                'categories' => $categories,

                /*
            |--------------------------------------------------------------------------
            | Availability Options
            |--------------------------------------------------------------------------
            */

                'availabilityStatuses' => [
                [
                    'value' => Product::AVAILABILITY_AVAILABLE,

                    'label' => 'Available',

                    'description' => 'Released merchandise that students may order when stock is available.',
                ],

                [
                    'value' => Product::AVAILABILITY_COMING_SOON,

                    'label' => 'Coming Soon',

                    'description' => 'Announced merchandise that may accept student preorders.',
                ],

                [
                    'value' => Product::AVAILABILITY_OUT_OF_STOCK,

                    'label' => 'Out of Stock',

                    'description' => 'Released merchandise that is temporarily unavailable for normal ordering.',
                ],

                [
                    'value' => Product::AVAILABILITY_INACTIVE,

                    'label' => 'Inactive',

                    'description' => 'Hide the merchandise from normal catalog use.',
                ],
            ],
            ],
        );
    }

    /**
     * Update an existing product.
     */
    public function update(
        UpdateProductRequest $request,
        Product $product,
    ): RedirectResponse {
        $validated =
            $request->validated();

        /*
        |--------------------------------------------------------------------------
        | Existing Image
        |--------------------------------------------------------------------------
        */

        $oldImagePath =
            $product->image_path;

        $newImagePath =
            null;

        /*
        |--------------------------------------------------------------------------
        | Upload Replacement Image
        |--------------------------------------------------------------------------
        */

        if (
            $request->hasFile(
                'image',
            )
        ) {
            $image =
                $request->file(
                    'image',
                );

            if (
                ! $image->isValid()
            ) {
                return back()
                    ->withErrors([
                        'image' => 'The image upload was not completed successfully.',
                    ])
                    ->withInput();
            }

            $newImagePath =
                $image->store(
                    'products',
                    'public',
                );
        }

        try {
            DB::transaction(
                function () use (
                    $request,
                    $validated,
                    $product,
                    $newImagePath,
                ): void {
                    $preorderEnabled =
                        (
                            $validated[
                                'availability_status'
                            ]
                            ===
                            Product::AVAILABILITY_COMING_SOON
                        )
                        &&
                        (
                            (bool)
                            $validated[
                                'preorder_enabled'
                            ]
                        );

                    /*
                    |--------------------------------------------------------------------------
                    | Determine Image
                    |--------------------------------------------------------------------------
                    */

                    $imagePath =
                        $product->image_path;

                    if (
                        $request->boolean(
                            'remove_image',
                        )
                    ) {
                        $imagePath =
                            null;
                    }

                    if (
                        $newImagePath
                    ) {
                        $imagePath =
                            $newImagePath;
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Update Product
                    |--------------------------------------------------------------------------
                    */

                    $product->update([
                        'category_id' => $validated[
                                'category_id'
                            ],

                        'name' => $validated[
                                'name'
                            ],

                        'description' => $validated[
                                'description'
                            ]
                            ?? null,

                        'base_price' => $validated[
                                'base_price'
                            ],

                        'availability_status' => $validated[
                                'availability_status'
                            ],

                        'preorder_enabled' => $preorderEnabled,

                        /*
                        |--------------------------------------------------------------------------
                        | Coming Soon
                        |--------------------------------------------------------------------------
                        */

                        'expected_release_date' => $validated[
                                'availability_status'
                            ]
                            ===
                            Product::AVAILABILITY_COMING_SOON
                                ? (
                                    $validated[
                                        'expected_release_date'
                                    ]
                                    ?? null
                                )
                                : null,

                        /*
                    |--------------------------------------------------------------------------
                    | Preorder Configuration
                    |--------------------------------------------------------------------------
                    */

                        'preorder_starts_at' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_starts_at'
                                    ]
                                    ?? null
                                )
                                : null,

                        'preorder_ends_at' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_ends_at'
                                    ]
                                    ?? null
                                )
                                : null,

                        'preorder_limit_per_student' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_limit_per_student'
                                    ]
                                    ?? null
                                )
                                : null,

                        'preorder_capacity' => $preorderEnabled
                                ? (
                                    $validated[
                                        'preorder_capacity'
                                    ]
                                    ?? null
                                )
                                : null,

                        'image_path' => $imagePath,

                        'is_active' => $validated[
                                'is_active'
                            ],
                    ]);
                },
                attempts: 3,
            );
        } catch (
            Throwable $exception
        ) {
            /*
            |--------------------------------------------------------------------------
            | Delete Newly Uploaded File If DB Update Failed
            |--------------------------------------------------------------------------
            */

            if (
                $newImagePath
            ) {
                Storage::disk(
                    'public',
                )->delete(
                    $newImagePath,
                );
            }

            throw $exception;
        }

        /*
        |--------------------------------------------------------------------------
        | Remove Old Image
        |--------------------------------------------------------------------------
        */

        if (
            $oldImagePath
            &&
            (
                $newImagePath
                ||
                $request->boolean(
                    'remove_image',
                )
            )
            &&
            $oldImagePath
            !==
            $product->image_path
        ) {
            Storage::disk(
                'public',
            )->delete(
                $oldImagePath,
            );
        }

        return redirect()
            ->route(
                'admin.products.edit',
                $product,
            );
    }

    private function recommendedVariantMode(
        string $categoryName,
    ): ?string {
        $normalizedName = strtolower(
            trim($categoryName),
        );

        if (
            str_contains(
                $normalizedName,
                'college',
            )
            && str_contains(
                $normalizedName,
                'uniform',
            )
        ) {
            return Product::VARIANT_MODE_PROGRAM_AND_SIZE;
        }

        if (
            str_contains(
                $normalizedName,
                'senior high',
            )
            || str_contains(
                $normalizedName,
                'shs',
            )
        ) {
            return Product::VARIANT_MODE_SIZE_ONLY;
        }

        return null;
    }

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
}
