<?php

use App\Models\AuditLog;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Support\Str;

function purchaseOrderAuditTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function purchaseOrderAuditTestOrder(User $admin, bool $archived = false): PurchaseOrder
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

test('creating a purchase order writes an audit log entry', function () {
    $admin = purchaseOrderAuditTestAdmin();

    $this->actingAs($admin)->post('/admin/purchase-orders', [
        'supplier_name' => 'Acme Supplies',
        'items' => [
            [
                'source_type' => 'new_inventory',
                'product_name' => 'Packing Tape',
                'quantity_ordered' => 20,
            ],
        ],
    ])->assertSessionDoesntHaveErrors();

    $purchaseOrder = PurchaseOrder::query()->latest('id')->first();

    $log = AuditLog::query()->where('module', 'purchase_orders')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->action)->toBe('created');
    expect($log->subject_id)->toBe($purchaseOrder->id);
    expect($log->new_values['supplier_name'])->toBe('Acme Supplies');
    expect($log->new_values['item_count'])->toBe(1);
});

test('archiving a purchase order writes an audit log entry', function () {
    $admin = purchaseOrderAuditTestAdmin();
    $purchaseOrder = purchaseOrderAuditTestOrder($admin, archived: false);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/archive")
        ->assertSessionHas('success');

    $log = AuditLog::query()->where('module', 'purchase_orders')->where('action', 'archived')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($purchaseOrder->id);
    expect($log->old_values['archived_at'])->toBeNull();
    expect($log->new_values['archived_at'])->not->toBeNull();
});

test('restoring a purchase order writes an audit log entry', function () {
    $admin = purchaseOrderAuditTestAdmin();
    $purchaseOrder = purchaseOrderAuditTestOrder($admin, archived: true);

    $this->actingAs($admin)
        ->patch("/admin/purchase-orders/{$purchaseOrder->id}/restore")
        ->assertSessionHas('success');

    $log = AuditLog::query()->where('module', 'purchase_orders')->where('action', 'restored')->latest('id')->first();

    expect($log)->not->toBeNull();
    expect($log->subject_id)->toBe($purchaseOrder->id);
    expect($log->old_values['archived_at'])->not->toBeNull();
    expect($log->new_values['archived_at'])->toBeNull();
});
