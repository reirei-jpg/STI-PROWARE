<?php

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;

function makeProductWithVariant(?string $priceOverride = null): array
{
    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $category = Category::query()->create([
        'name' => 'Test Category '.uniqid(),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'TST-'.uniqid(),
        'name' => 'Test Priced Product '.uniqid(),
        'base_price' => 500,
        'availability_status' => Product::AVAILABILITY_AVAILABLE,
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'TST-SKU-'.uniqid(),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'price_override' => $priceOverride,
        'is_active' => true,
    ]);

    return [$product, $variant];
}

test('an admin can set a variant price and it is audited', function () {
    [$product, $variant] = makeProductWithVariant();

    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this
        ->actingAs($admin)
        ->from("/admin/products/{$product->id}/variants")
        ->patch("/admin/products/{$product->id}/variants/{$variant->id}/price", [
            'price_override' => 550,
        ])
        ->assertSessionHasNoErrors();

    expect($variant->fresh()->price_override)->toBe('550.00');

    $log = AuditLog::query()
        ->where('module', 'products')
        ->where('action', 'variant_price_updated')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull()
        ->and($log->user_id)->toBe($admin->id)
        ->and($log->new_values['price_override'])->toBe('550.00');
});

test('a specialist can also set a variant price, unlike before', function () {
    [$product, $variant] = makeProductWithVariant();

    $specialist = User::factory()->create(['role' => User::ROLE_SPECIALIST]);

    $this
        ->actingAs($specialist)
        ->patch("/admin/products/{$product->id}/variants/{$variant->id}/price", [
            'price_override' => 475,
        ])
        ->assertSessionHasNoErrors();

    expect($variant->fresh()->price_override)->toBe('475.00');
});

test('a cashier cannot set a variant price', function () {
    [$product, $variant] = makeProductWithVariant();

    $cashier = User::factory()->create(['role' => User::ROLE_CASHIER]);

    $this
        ->actingAs($cashier)
        ->patch("/admin/products/{$product->id}/variants/{$variant->id}/price", [
            'price_override' => 475,
        ])
        ->assertForbidden();
});

test('clearing the price returns the variant to the product price', function () {
    [$product, $variant] = makeProductWithVariant(priceOverride: '550.00');

    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this
        ->actingAs($admin)
        ->patch("/admin/products/{$product->id}/variants/{$variant->id}/price", [
            'price_override' => null,
        ])
        ->assertSessionHasNoErrors();

    expect($variant->fresh()->price_override)->toBeNull()
        ->and($variant->fresh()->selling_price)->toBe($product->base_price);
});

test('a variant price of zero is refused', function () {
    [$product, $variant] = makeProductWithVariant();

    $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);

    $this
        ->actingAs($admin)
        ->patch("/admin/products/{$product->id}/variants/{$variant->id}/price", [
            'price_override' => 0,
        ])
        ->assertSessionHasErrors('price_override');
});
