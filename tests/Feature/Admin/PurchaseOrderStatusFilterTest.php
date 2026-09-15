<?php

use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Support\Str;

function statusFilterAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function statusFilterPurchaseOrder(User $admin, string $status): PurchaseOrder
{
    return PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => $status,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);
}

test('filtering purchase orders by status only returns matching orders', function () {
    $admin = statusFilterAdmin();

    $draft = statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_DRAFT);
    $ordered = statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_ORDERED);
    $completed = statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_COMPLETED);

    $response = $this->actingAs($admin)->get('/admin/purchase-orders?status=draft');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/PurchaseOrders/Index')
        ->where('filters.status', 'draft')
        ->where('purchaseOrders.data.0.id', $draft->id)
        ->where('purchaseOrders.total', 1),
    );

    expect($ordered->id)->not->toBe($draft->id);
    expect($completed->id)->not->toBe($draft->id);
});

test('the default status filter shows every non-archived purchase order', function () {
    $admin = statusFilterAdmin();

    statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_DRAFT);
    statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_ORDERED);
    statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_COMPLETED);

    $response = $this->actingAs($admin)->get('/admin/purchase-orders');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/PurchaseOrders/Index')
        ->where('filters.status', 'all')
        ->where('purchaseOrders.total', 3),
    );
});

test('an unrecognized status value falls back to showing all purchase orders', function () {
    $admin = statusFilterAdmin();

    statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_DRAFT);
    statusFilterPurchaseOrder($admin, PurchaseOrder::STATUS_COMPLETED);

    $response = $this->actingAs($admin)->get('/admin/purchase-orders?status=not-a-real-status');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/PurchaseOrders/Index')
        ->where('filters.status', 'all')
        ->where('purchaseOrders.total', 2),
    );
});
