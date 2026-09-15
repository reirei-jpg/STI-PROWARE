<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Support\Str;

function trimmedFormAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function trimmedFormVariant(User $admin)
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

test('creating a new inventory item no longer requires category, selling price, or variant structure', function () {
    $admin = trimmedFormAdmin();

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'new_inventory',
                'product_name' => 'Black Boots',
                'product_description' => 'Waterproof, sizes vary.',
                'quantity_ordered' => 10,
                'unit_cost' => 250,
            ],
        ],
    ]);

    $response->assertSessionDoesntHaveErrors();

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    expect($purchaseOrder)->not->toBeNull();

    $item = $purchaseOrder->items()->first();

    expect($item->item_type)->toBe(PurchaseOrderItem::TYPE_MANUAL);
    expect($item->merchandise_origin)->toBe(PurchaseOrderItem::ORIGIN_NEW);
    expect($item->manual_name)->toBe('Black Boots');
    expect($item->manual_description)->toBe('Waterproof, sizes vary.');
    expect($item->quantity_ordered)->toBe(10);
    expect((float) $item->unit_cost)->toBe(250.00);

    // Category and selling price are resolved later, at receiving.
    expect($item->proposed_category_id)->toBeNull();
    expect($item->proposed_selling_price)->toBeNull();
});

test('a new inventory item still requires a name', function () {
    $admin = trimmedFormAdmin();

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'new_inventory',
                'product_name' => '',
                'quantity_ordered' => 10,
            ],
        ],
    ]);

    $response->assertSessionHasErrors('items.0.product_name');

    expect(PurchaseOrder::query()->count())->toBe(0);
});

test('sending category, selling price, or variant fields for a new inventory item is silently ignored', function () {
    $admin = trimmedFormAdmin();
    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'new_inventory',
                'product_name' => 'Black Boots',
                'quantity_ordered' => 5,

                // A stale or malicious client still sends these —
                // they must not be trusted or stored.
                'category_id' => $category->id,
                'base_price' => 999,
                'variant_mode' => 'standard',
            ],
        ],
    ]);

    $response->assertSessionDoesntHaveErrors();

    $item = PurchaseOrder::query()->latest('id')->first()->items()->first();

    expect($item->proposed_category_id)->toBeNull();
    expect($item->proposed_selling_price)->toBeNull();
});

test('an existing catalog item can still be added to a purchase order', function () {
    $admin = trimmedFormAdmin();
    $variant = trimmedFormVariant($admin);

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'existing_catalog',
                'product_variant_id' => $variant->id,
                'quantity_ordered' => 3,
                'unit_cost' => 100,
            ],
        ],
    ]);

    $response->assertSessionDoesntHaveErrors();

    $item = PurchaseOrder::query()->latest('id')->first()->items()->first();

    expect($item->item_type)->toBe(PurchaseOrderItem::TYPE_CATALOG);
    expect($item->product_variant_id)->toBe($variant->id);
    expect($item->quantity_ordered)->toBe(3);
});

test('the purchase order creation page no longer sends category or product configuration data', function () {
    $admin = trimmedFormAdmin();

    $response = $this->actingAs($admin)->get('/admin/purchase-orders/create');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/PurchaseOrders/Create')
        ->has('variants')
        ->missing('categories')
        ->missing('productConfiguration'),
    );
});
