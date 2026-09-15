<?php

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;

function manualItemAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

test('a non-inventory item can be added directly at purchase order creation', function () {
    $admin = manualItemAdmin();

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'manual',
                'manual_name' => 'Packing Tape',
                'manual_description' => 'For sealing delivery boxes.',
                'manual_sku' => 'SUP-001',
                'quantity_ordered' => 20,
                'unit_cost' => 15,
            ],
        ],
    ]);

    $response->assertSessionDoesntHaveErrors();

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();
    $item = $purchaseOrder->items()->first();

    expect($item->item_type)->toBe(PurchaseOrderItem::TYPE_MANUAL);
    expect($item->merchandise_origin)->toBe(PurchaseOrderItem::ORIGIN_EXISTING);
    expect($item->manual_name)->toBe('Packing Tape');
    expect($item->manual_description)->toBe('For sealing delivery boxes.');
    expect($item->manual_sku)->toBe('SUP-001');
    expect($item->quantity_ordered)->toBe(20);
    expect((float) $item->unit_cost)->toBe(15.00);

    // A non-inventory item is never intended to become PROWARE stock.
    expect($item->track_inventory)->toBeFalse();
});

test('a non-inventory item still requires a name', function () {
    $admin = manualItemAdmin();

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'manual',
                'manual_name' => '',
                'quantity_ordered' => 5,
            ],
        ],
    ]);

    $response->assertSessionHasErrors('items.0.manual_name');

    expect(PurchaseOrder::query()->count())->toBe(0);
});

test('a purchase order can mix existing catalog, new inventory, and non-inventory items', function () {
    $admin = manualItemAdmin();

    $response = $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Test Supplier',
        'items' => [
            [
                'source_type' => 'new_inventory',
                'product_name' => 'Black Boots',
                'quantity_ordered' => 10,
            ],
            [
                'source_type' => 'manual',
                'manual_name' => 'Packing Tape',
                'quantity_ordered' => 20,
            ],
        ],
    ]);

    $response->assertSessionDoesntHaveErrors();

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    expect($purchaseOrder->items()->count())->toBe(2);

    $newInventoryItem = $purchaseOrder->items()
        ->where('merchandise_origin', PurchaseOrderItem::ORIGIN_NEW)
        ->first();

    $nonInventoryItem = $purchaseOrder->items()
        ->where('merchandise_origin', PurchaseOrderItem::ORIGIN_EXISTING)
        ->first();

    expect($newInventoryItem->manual_name)->toBe('Black Boots');
    expect($newInventoryItem->track_inventory)->toBeTrue();

    expect($nonInventoryItem->manual_name)->toBe('Packing Tape');
    expect($nonInventoryItem->track_inventory)->toBeFalse();
});
