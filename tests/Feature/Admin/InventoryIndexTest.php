<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

function inventoryIndexAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

/**
 * @param  array<string, array{0: int, 1?: int, 2?: int}>  $variants  name => [on hand, reserved, reorder level]
 */
function inventoryIndexProductWithVariants(User $admin, string $productName, array $variants): Product
{
    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => $productName,
        'base_price' => 500,
        'is_active' => true,
    ]);

    foreach ($variants as $variantName => $stock) {
        $variant = $product->variants()->create([
            'sku' => 'SKU-'.Str::random(8),
            'size' => $variantName,
            'variant_name' => $variantName,
            'variant_key' => Str::random(8),
            'is_active' => true,
        ]);

        $variant->inventory()->create([
            'quantity_on_hand' => $stock[0],
            'quantity_reserved' => $stock[1] ?? 0,
            'reorder_level' => $stock[2] ?? 5,
        ]);
    }

    return $product;
}

test('the inventory page lists products by name, each with its own variants', function () {
    $admin = inventoryIndexAdmin();

    inventoryIndexProductWithVariants($admin, 'Zeta Merch', ['Small' => [10], 'Large' => [10]]);
    inventoryIndexProductWithVariants($admin, 'Alpha Merch', ['Small' => [10], 'Large' => [10]]);

    $this->actingAs($admin)->get('/staff/inventory')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('staff/Inventory/Index')
            ->where('products.total', 2)
            ->where('products.data.0.product.name', 'Alpha Merch')
            ->where('products.data.0.variant_count', 2)
            ->where('products.data.0.variants.0.variant.variant_name', 'Large')
            ->where('products.data.0.variants.1.variant.variant_name', 'Small')
            ->where('products.data.1.product.name', 'Zeta Merch')
            ->has('products.data.1.variants', 2),
        );
});

test('a product row totals all of its variants and counts the low and out of stock ones', function () {
    $admin = inventoryIndexAdmin();

    // Small: 20 available (in stock). Medium: 3 available, threshold 5 (low).
    // Large: 4 on hand, all 4 reserved, so 0 available (out of stock).
    inventoryIndexProductWithVariants($admin, 'Golden Jacket', [
        'Small' => [20],
        'Medium' => [3],
        'Large' => [4, 4],
    ]);

    $this->actingAs($admin)->get('/staff/inventory')
        ->assertInertia(fn ($page) => $page
            ->where('products.data.0.product.name', 'Golden Jacket')
            ->where('products.data.0.variant_count', 3)
            ->where('products.data.0.total_on_hand', 27)
            ->where('products.data.0.total_reserved', 4)
            ->where('products.data.0.total_available', 23)
            ->where('products.data.0.low_stock_count', 1)
            ->where('products.data.0.out_of_stock_count', 1)
            ->where('products.data.0.variants.0.stock_status', 'out_of_stock')
            ->where('products.data.0.variants.1.stock_status', 'low_stock')
            ->where('products.data.0.variants.2.stock_status', 'in_stock'),
        );
});

test('the low stock filter lists only products with a low size, showing just those sizes, while totals stay whole', function () {
    $admin = inventoryIndexAdmin();

    inventoryIndexProductWithVariants($admin, 'Golden Jacket', ['Small' => [20], 'Medium' => [3]]);
    inventoryIndexProductWithVariants($admin, 'Plain Lanyard', ['Standard' => [50]]);

    $this->actingAs($admin)->get('/staff/inventory?status=low_stock')
        ->assertInertia(fn ($page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.product.name', 'Golden Jacket')
            ->has('products.data.0.variants', 1)
            ->where('products.data.0.variants.0.variant.variant_name', 'Medium')
            ->where('products.data.0.variant_count', 2)
            ->where('products.data.0.total_on_hand', 23)
            ->where('filters.status', 'low_stock'),
        );
});

test('searching for a size lists the products that have it', function () {
    $admin = inventoryIndexAdmin();

    inventoryIndexProductWithVariants($admin, 'Golden Jacket', ['Small' => [20], '2XL' => [5]]);
    inventoryIndexProductWithVariants($admin, 'Plain Lanyard', ['Standard' => [50]]);

    $this->actingAs($admin)->get('/staff/inventory?search=2XL')
        ->assertInertia(fn ($page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.product.name', 'Golden Jacket')
            ->has('products.data.0.variants', 1)
            ->where('products.data.0.variants.0.variant.variant_name', '2XL'),
        );
});

test('products are paged twenty at a time, never splitting a product across pages', function () {
    $admin = inventoryIndexAdmin();

    foreach (range(1, 21) as $number) {
        inventoryIndexProductWithVariants($admin, sprintf('Product %02d', $number), ['Small' => [10], 'Large' => [10]]);
    }

    $this->actingAs($admin)->get('/staff/inventory')
        ->assertInertia(fn ($page) => $page
            ->where('products.total', 21)
            ->has('products.data', 20)
            ->has('products.data.19.variants', 2),
        );

    $this->actingAs($admin)->get('/staff/inventory?page=2')
        ->assertInertia(fn ($page) => $page
            ->has('products.data', 1)
            ->where('products.data.0.product.name', 'Product 21')
            ->has('products.data.0.variants', 2),
        );
});

test('the PROWARE Specialist sees the same product view, and students cannot open it', function () {
    $admin = inventoryIndexAdmin();

    inventoryIndexProductWithVariants($admin, 'Golden Jacket', ['Small' => [20]]);

    $specialist = User::factory()->create(['role' => User::ROLE_SPECIALIST, 'is_active' => true]);

    $this->actingAs($specialist)->get('/staff/inventory')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('products.data.0.product.name', 'Golden Jacket'));

    $student = User::factory()->create(['role' => User::ROLE_STUDENT, 'is_active' => true]);

    $this->actingAs($student)->get('/staff/inventory')->assertForbidden();
});
