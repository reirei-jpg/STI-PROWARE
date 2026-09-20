<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

function productPageProduct(array $overrides = []): Product
{
    $admin = User::factory()->create(['role' => 'admin']);

    $category = Category::query()->firstOrCreate(
        ['name' => 'Page Category'],
        ['is_active' => true],
    );

    $product = Product::query()->create(array_merge([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Page Product '.Str::random(6),
        'description' => 'A very nice thing.',
        'base_price' => 300,
        'variant_mode' => Product::VARIANT_MODE_PROGRAM_AND_SIZE,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'is_active' => true,
    ], $overrides));

    $inStock = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'program' => 'BSIT',
        'size' => 'M',
        'variant_name' => 'BSIT - M',
        'variant_key' => 'BSIT|M',
        'price_override' => 350,
        'is_active' => true,
    ]);
    $inStock->inventory()->create(['quantity_on_hand' => 8, 'quantity_reserved' => 3, 'reorder_level' => 2]);

    $soldOut = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'program' => 'BSIT',
        'size' => 'L',
        'variant_name' => 'BSIT - L',
        'variant_key' => 'BSIT|L',
        'is_active' => true,
    ]);
    $soldOut->inventory()->create(['quantity_on_hand' => 2, 'quantity_reserved' => 2, 'reorder_level' => 2]);

    $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'program' => 'BSIT',
        'size' => 'XL',
        'variant_name' => 'BSIT - XL',
        'variant_key' => 'BSIT|XL',
        'is_active' => false,
    ]);

    return $product;
}

test('the website product page shows the product, its category and only its active variants', function () {
    $product = productPageProduct();
    $student = makeStudentAccount();

    $this->actingAs($student)
        ->get("/catalog/{$product->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('catalog/Show')
            ->where('product.id', $product->id)
            ->where('product.code', $product->code)
            ->where('product.name', $product->name)
            ->where('product.description', 'A very nice thing.')
            ->where('product.base_price', fn ($price) => (float) $price === 300.0)
            ->where('product.variant_mode', 'program_and_size')
            ->where('product.variant_mode_label', 'Program and Size')
            ->where('product.availability_status', 'available')
            ->where('product.availability_label', 'Available')
            ->where('product.availability_summary', 'Available')
            ->where('product.accepts_preorders', false)
            ->where('product.expected_release_date', null)
            ->where('product.category.name', 'Page Category')
            ->has('product.variants', 2)
            ->where('product.variants.0.program', 'BSIT')
            ->where('product.variants.0.size', 'L')
            ->where('product.variants.0.is_available', false)
            ->where('product.variants.0.stock_status', 'Unavailable')
            ->where('product.variants.1.size', 'M')
            ->where('product.variants.1.is_available', true)
            ->where('product.variants.1.stock_status', 'Available')
            ->where('product.variants.1.selling_price', fn ($price) => (float) $price === 350.0),
        );
});

test('the website product page hides inactive products', function () {
    $product = productPageProduct(['is_active' => false]);

    $this->actingAs(makeStudentAccount())
        ->get("/catalog/{$product->id}")
        ->assertNotFound();
});

test('a coming soon product that accepts preorders says so', function () {
    $product = productPageProduct([
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
        'expected_release_date' => '2026-12-01',
    ]);

    $this->actingAs(makeStudentAccount())
        ->get("/catalog/{$product->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('product.availability_status', 'coming_soon')
            ->where('product.availability_summary', 'Preorder Available')
            ->where('product.accepts_preorders', true)
            ->where('product.expected_release_date', 'Dec 01, 2026'),
        );
});
