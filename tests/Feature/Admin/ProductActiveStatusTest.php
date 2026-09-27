<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;

function activeStatusTestProduct(User $admin): Product
{
    $category = Category::query()->create([
        'name' => 'Status Category '.uniqid(),
        'is_active' => true,
    ]);

    return Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRO-STAT'.random_int(100, 999),
        'name' => 'Status Hoodie',
        'base_price' => 100,
        'variant_mode' => Product::VARIANT_MODE_STANDARD,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'preorder_enabled' => false,
        'is_active' => true,
    ]);
}

function activeStatusTestPayload(Product $product, string $availability, bool $isActive): array
{
    return [
        'category_id' => $product->category_id,
        'name' => $product->name,
        'base_price' => 100,
        'availability_status' => $availability,
        'preorder_enabled' => false,
        'is_active' => $isActive,
    ];
}

test('setting a product to Inactive also marks it inactive even if the old checkbox stayed ticked', function () {
    $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $product = activeStatusTestProduct($admin);

    $this->actingAs($admin)
        ->put("/admin/products/{$product->id}", activeStatusTestPayload($product, Product::AVAILABILITY_INACTIVE, true))
        ->assertSessionDoesntHaveErrors();

    $product->refresh();

    expect($product->availability_status)->toBe(Product::AVAILABILITY_INACTIVE)
        ->and($product->is_active)->toBeFalse()
        ->and($product->isCatalogVisible())->toBeFalse();
});

test('setting an inactive product back to Available makes it active again', function () {
    $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    $product = activeStatusTestProduct($admin);
    $product->update(['availability_status' => Product::AVAILABILITY_INACTIVE, 'is_active' => false]);

    $this->actingAs($admin)
        ->put("/admin/products/{$product->id}", activeStatusTestPayload($product, Product::AVAILABILITY_AVAILABLE, true))
        ->assertSessionDoesntHaveErrors();

    expect($product->refresh()->is_active)->toBeTrue();
});
