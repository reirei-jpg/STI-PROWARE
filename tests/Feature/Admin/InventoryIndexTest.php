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

function inventoryIndexProductWithVariants(User $admin, string $productName, array $variantNames): void
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

    foreach ($variantNames as $variantName) {
        $variant = $product->variants()->create([
            'sku' => 'SKU-'.Str::random(8),
            'size' => 'STD',
            'variant_name' => $variantName,
            'variant_key' => Str::random(8),
            'is_active' => true,
        ]);

        $variant->inventory()->create([
            'quantity_on_hand' => 10,
            'quantity_reserved' => 0,
            'reorder_level' => 5,
        ]);
    }
}

test('inventory rows are grouped by product, not scattered by variant id', function () {
    $admin = inventoryIndexAdmin();

    // Created first, so its variants get the lower IDs — under the
    // old (buggy) product_variant_id sort, these would appear before
    // "Alpha Merch" despite "Z" sorting after "A" by product name.
    inventoryIndexProductWithVariants($admin, 'Zeta Merch', ['Variant One', 'Variant Two']);

    inventoryIndexProductWithVariants($admin, 'Alpha Merch', ['Variant One', 'Variant Two']);

    $response = $this->actingAs($admin)->get('/staff/inventory');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('staff/Inventory/Index')
        // Alpha Merch's two variants are adjacent and come first...
        ->where('inventories.data.0.product.name', 'Alpha Merch')
        ->where('inventories.data.1.product.name', 'Alpha Merch')
        // ...followed by Zeta Merch's two variants, also adjacent.
        ->where('inventories.data.2.product.name', 'Zeta Merch')
        ->where('inventories.data.3.product.name', 'Zeta Merch'),
    );
});
