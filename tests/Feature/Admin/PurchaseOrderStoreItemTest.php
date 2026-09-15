<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;

function createAdminUser(): User
{
    return User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
}

function createOrderedPurchaseOrder(User $admin): PurchaseOrder
{
    return PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.uniqid(),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);
}

test('adding a manual item without merchandise_origin is rejected', function () {
    $admin = createAdminUser();
    $purchaseOrder = createOrderedPurchaseOrder($admin);

    $response = $this
        ->actingAs($admin)
        ->from("/admin/purchase-orders/{$purchaseOrder->id}")
        ->post("/admin/purchase-orders/{$purchaseOrder->id}/items", [
            'item_type' => PurchaseOrderItem::TYPE_MANUAL,
            'manual_name' => 'Untitled Manual Item',
            'quantity_ordered' => 5,
        ]);

    $response->assertSessionHasErrors('merchandise_origin');

    $this->assertDatabaseMissing('purchase_order_items', [
        'purchase_order_id' => $purchaseOrder->id,
        'manual_name' => 'Untitled Manual Item',
    ]);
});

test('a manual item with origin new is always saved as tracked inventory', function () {
    $admin = createAdminUser();
    $purchaseOrder = createOrderedPurchaseOrder($admin);

    $this
        ->actingAs($admin)
        ->post("/admin/purchase-orders/{$purchaseOrder->id}/items", [
            'item_type' => PurchaseOrderItem::TYPE_MANUAL,
            'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
            'manual_name' => 'New Black Jacket',
            'quantity_ordered' => 10,
            // A malicious or stale client tries to force this to false.
            'track_inventory' => false,
        ]);

    $this->assertDatabaseHas('purchase_order_items', [
        'purchase_order_id' => $purchaseOrder->id,
        'manual_name' => 'New Black Jacket',
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
        'track_inventory' => true,
    ]);
});

test('a manual item with origin existing is always saved as non-inventory', function () {
    $admin = createAdminUser();
    $purchaseOrder = createOrderedPurchaseOrder($admin);

    $this
        ->actingAs($admin)
        ->post("/admin/purchase-orders/{$purchaseOrder->id}/items", [
            'item_type' => PurchaseOrderItem::TYPE_MANUAL,
            'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
            'manual_name' => 'Packing Tape',
            'quantity_ordered' => 3,
            // A malicious or stale client tries to force this to true.
            'track_inventory' => true,
        ]);

    $this->assertDatabaseHas('purchase_order_items', [
        'purchase_order_id' => $purchaseOrder->id,
        'manual_name' => 'Packing Tape',
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'track_inventory' => false,
    ]);
});

test('a catalog item always saves as existing and tracked regardless of client input', function () {
    $admin = createAdminUser();
    $purchaseOrder = createOrderedPurchaseOrder($admin);

    $category = Category::query()->create([
        'name' => 'Test Category '.uniqid(),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'TST-'.uniqid(),
        'name' => 'Test Product',
        'base_price' => 100,
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'TST-SKU-'.uniqid(),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);

    $this
        ->actingAs($admin)
        ->post("/admin/purchase-orders/{$purchaseOrder->id}/items", [
            'item_type' => PurchaseOrderItem::TYPE_CATALOG,
            'product_variant_id' => $variant->id,
            'quantity_ordered' => 7,
            // A malicious or stale client tries to override provenance.
            'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
            'track_inventory' => false,
        ]);

    $this->assertDatabaseHas('purchase_order_items', [
        'purchase_order_id' => $purchaseOrder->id,
        'product_variant_id' => $variant->id,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'track_inventory' => true,
    ]);
});
