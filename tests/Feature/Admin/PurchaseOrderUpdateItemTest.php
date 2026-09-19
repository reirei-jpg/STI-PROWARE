<?php

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;

function updateItemTestAdmin(): User
{
    return User::factory()->create([
        'role' => User::ROLE_ADMIN,
    ]);
}

function updateItemTestOrder(User $admin, string $status = PurchaseOrder::STATUS_ORDERED): PurchaseOrder
{
    return PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.uniqid(),
        'supplier_name' => 'Test Supplier',
        'status' => $status,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);
}

function updateItemTestManualItem(PurchaseOrder $purchaseOrder, int $quantityOrdered, int $quantityReceived = 0, bool $archived = false): PurchaseOrderItem
{
    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_MANUAL,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'manual_name' => 'Original Name',
        'track_inventory' => false,
        'quantity_ordered' => $quantityOrdered,
        'quantity_received' => $quantityReceived,
        'archived_at' => $archived ? now() : null,
    ]);
}

test('an admin can update a purchase order item', function () {
    $admin = updateItemTestAdmin();
    $purchaseOrder = updateItemTestOrder($admin);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 10);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 15,
            'unit_cost' => 25.50,
            'manual_name' => 'Updated Name',
        ])
        ->assertSessionHas('success');

    $item->refresh();

    expect($item->quantity_ordered)->toBe(15);
    expect((float) $item->unit_cost)->toBe(25.50);
    expect($item->manual_name)->toBe('Updated Name');
});

test('quantity ordered cannot drop below the quantity already received', function () {
    $admin = updateItemTestAdmin();
    $purchaseOrder = updateItemTestOrder($admin);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 20, quantityReceived: 8);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 5,
            'manual_name' => 'Original Name',
        ])
        ->assertSessionHasErrors('quantity_ordered');

    expect($item->fresh()->quantity_ordered)->toBe(20);
});

test('an archived purchase order cannot have its items updated', function () {
    $admin = updateItemTestAdmin();
    $purchaseOrder = updateItemTestOrder($admin);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 10);

    $purchaseOrder->update([
        'archived_at' => now(),
        'archived_by' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 15,
            'manual_name' => 'Original Name',
        ])
        ->assertSessionHas('error');

    expect($item->fresh()->quantity_ordered)->toBe(10);
});

test('a completed purchase order cannot have its items updated', function () {
    $admin = updateItemTestAdmin();
    $purchaseOrder = updateItemTestOrder($admin, status: PurchaseOrder::STATUS_COMPLETED);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 10);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 15,
            'manual_name' => 'Original Name',
        ])
        ->assertSessionHas('error');

    expect($item->fresh()->quantity_ordered)->toBe(10);
});

test('an archived purchase order item cannot be updated', function () {
    $admin = updateItemTestAdmin();
    $purchaseOrder = updateItemTestOrder($admin);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 10, archived: true);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 15,
            'manual_name' => 'Original Name',
        ])
        ->assertSessionHas('error');

    expect($item->fresh()->quantity_ordered)->toBe(10);
});

test('a manual item requires a name when updated', function () {
    $admin = updateItemTestAdmin();
    $purchaseOrder = updateItemTestOrder($admin);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 10);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 15,
            'manual_name' => '',
        ])
        ->assertSessionHasErrors('manual_name');

    expect($item->fresh()->quantity_ordered)->toBe(10);
});

test('a specialist cannot update a purchase order item', function () {
    $admin = updateItemTestAdmin();
    $specialist = User::factory()->create(['role' => 'specialist']);
    $purchaseOrder = updateItemTestOrder($admin);
    $item = updateItemTestManualItem($purchaseOrder, quantityOrdered: 10);

    $this->actingAs($specialist)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}", [
            'quantity_ordered' => 15,
            'manual_name' => 'Original Name',
        ])
        ->assertForbidden();
});
