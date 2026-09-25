<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Support\Str;

function deliveryDateAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function deliveryDateVariant(User $admin)
{
    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Product',
        'base_price' => 500,
        'is_active' => true,
    ]);

    return $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);
}

function orderedPurchaseOrder(User $admin)
{
    $variant = deliveryDateVariant($admin);

    $response = test()->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            ['source_type' => 'existing_catalog', 'product_variant_id' => $variant->id, 'quantity_ordered' => 1],
        ],
    ]);

    $response->assertSessionDoesntHaveErrors();

    return PurchaseOrder::query()->latest('id')->first();
}

test('the expected delivery date can be corrected on an already-ordered purchase order', function () {
    $admin = deliveryDateAdmin();
    $purchaseOrder = orderedPurchaseOrder($admin);

    $newDate = now()->addWeek()->toDateString();

    $response = $this->actingAs($admin)->patch(
        "/admin/purchase-orders/{$purchaseOrder->id}/expected-delivery-date",
        ['expected_delivery_date' => $newDate],
    );

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();

    expect($purchaseOrder->fresh()->expected_delivery_date->toDateString())->toBe($newDate);
});

test('the corrected expected delivery date still cannot be in the past', function () {
    $admin = deliveryDateAdmin();
    $purchaseOrder = orderedPurchaseOrder($admin);

    $response = $this->actingAs($admin)->patch(
        "/admin/purchase-orders/{$purchaseOrder->id}/expected-delivery-date",
        ['expected_delivery_date' => now()->subDay()->toDateString()],
    );

    $response->assertSessionHasErrors([
        'expected_delivery_date' => 'The expected delivery date cannot be in the past.',
    ]);
});

test('the expected delivery date can be cleared entirely', function () {
    $admin = deliveryDateAdmin();
    $purchaseOrder = orderedPurchaseOrder($admin);

    $this->actingAs($admin)->patch(
        "/admin/purchase-orders/{$purchaseOrder->id}/expected-delivery-date",
        ['expected_delivery_date' => null],
    )->assertSessionHasNoErrors();

    expect($purchaseOrder->fresh()->expected_delivery_date)->toBeNull();
});

test('the expected delivery date cannot be edited on a completed purchase order', function () {
    $admin = deliveryDateAdmin();
    $purchaseOrder = orderedPurchaseOrder($admin);

    $purchaseOrder->update(['status' => PurchaseOrder::STATUS_COMPLETED]);

    $this->actingAs($admin)->patch(
        "/admin/purchase-orders/{$purchaseOrder->id}/expected-delivery-date",
        ['expected_delivery_date' => now()->addWeek()->toDateString()],
    )->assertNotFound();
});

test('the expected delivery date cannot be edited on an archived purchase order', function () {
    $admin = deliveryDateAdmin();
    $purchaseOrder = orderedPurchaseOrder($admin);

    $purchaseOrder->update(['archived_at' => now(), 'archived_by' => $admin->id]);

    $this->actingAs($admin)->patch(
        "/admin/purchase-orders/{$purchaseOrder->id}/expected-delivery-date",
        ['expected_delivery_date' => now()->addWeek()->toDateString()],
    )->assertNotFound();
});

test('a non-admin cannot edit the expected delivery date', function () {
    $admin = deliveryDateAdmin();
    $purchaseOrder = orderedPurchaseOrder($admin);

    $cashier = User::factory()->create(['role' => 'cashier', 'is_active' => true]);

    $this->actingAs($cashier)->patch(
        "/admin/purchase-orders/{$purchaseOrder->id}/expected-delivery-date",
        ['expected_delivery_date' => now()->addWeek()->toDateString()],
    )->assertForbidden();
});
