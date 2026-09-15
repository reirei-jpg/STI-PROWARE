<?php

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Support\Str;

function restoreTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function restoreTestPurchaseOrder(User $admin, bool $archived = false): PurchaseOrder
{
    return PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $admin->id,
        'ordered_at' => now(),
        'archived_at' => $archived ? now() : null,
        'archived_by' => $archived ? $admin->id : null,
    ]);
}

function restoreTestItem(PurchaseOrder $purchaseOrder, User $admin, bool $archived = true): PurchaseOrderItem
{
    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_MANUAL,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'manual_name' => 'Test Item',
        'track_inventory' => false,
        'quantity_ordered' => 5,
        'quantity_received' => 0,
        'archived_at' => $archived ? now() : null,
        'archived_by' => $archived ? $admin->id : null,
    ]);
}

test('admin can restore an archived purchase order', function () {
    $admin = restoreTestAdmin();
    $purchaseOrder = restoreTestPurchaseOrder($admin, archived: true);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/restore")
        ->assertSessionHas('success');

    $purchaseOrder->refresh();

    expect($purchaseOrder->archived_at)->toBeNull();
    expect($purchaseOrder->archived_by)->toBeNull();
});

test('a purchase order that is not archived cannot be restored', function () {
    $admin = restoreTestAdmin();
    $purchaseOrder = restoreTestPurchaseOrder($admin, archived: false);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/restore")
        ->assertSessionHas('error');
});

test('admin can restore an archived purchase order item', function () {
    $admin = restoreTestAdmin();
    $purchaseOrder = restoreTestPurchaseOrder($admin, archived: false);
    $item = restoreTestItem($purchaseOrder, $admin, archived: true);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}/restore")
        ->assertSessionHas('success');

    $item->refresh();

    expect($item->archived_at)->toBeNull();
    expect($item->archived_by)->toBeNull();
});

test('an item cannot be restored while its parent purchase order is still archived', function () {
    $admin = restoreTestAdmin();
    $purchaseOrder = restoreTestPurchaseOrder($admin, archived: true);
    $item = restoreTestItem($purchaseOrder, $admin, archived: true);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}/restore")
        ->assertSessionHas('error');

    $item->refresh();

    expect($item->archived_at)->not->toBeNull();
});

test('an item that is not archived cannot be restored', function () {
    $admin = restoreTestAdmin();
    $purchaseOrder = restoreTestPurchaseOrder($admin, archived: false);
    $item = restoreTestItem($purchaseOrder, $admin, archived: false);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}/restore")
        ->assertSessionHas('error');
});

test('a specialist cannot restore a purchase order or its items', function () {
    $admin = restoreTestAdmin();
    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $purchaseOrder = restoreTestPurchaseOrder($admin, archived: true);
    $item = restoreTestItem($purchaseOrder, $admin, archived: true);

    $this->actingAs($specialist)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/restore")
        ->assertForbidden();

    $this->actingAs($specialist)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/items/{$item->id}/restore")
        ->assertForbidden();
});
