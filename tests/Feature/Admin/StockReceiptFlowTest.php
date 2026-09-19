<?php

use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Support\Str;

function receiptStoreTestUser(string $role): User
{
    return User::factory()->create([
        'role' => $role,
        'is_active' => true,
    ]);
}

function receiptStoreTestVariant(User $admin, bool $productActive = true, bool $variantActive = true)
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
        'is_active' => $productActive,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => $variantActive,
    ]);

    $variant->inventory()->create([
        'quantity_on_hand' => 0,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
        'average_cost' => null,
    ]);

    return $variant->fresh(['inventory', 'product']);
}

function receiptStoreTestOrder(User $admin, string $status = PurchaseOrder::STATUS_ORDERED, bool $archived = false): PurchaseOrder
{
    return PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => $status,
        'created_by' => $admin->id,
        'ordered_at' => now(),
        'archived_at' => $archived ? now() : null,
        'archived_by' => $archived ? $admin->id : null,
    ]);
}

function receiptStoreTestItem(PurchaseOrder $purchaseOrder, $variant, int $quantityOrdered, int $quantityReceived = 0, bool $archived = false): PurchaseOrderItem
{
    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_CATALOG,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'product_variant_id' => $variant->id,
        'track_inventory' => true,
        'quantity_ordered' => $quantityOrdered,
        'quantity_received' => $quantityReceived,
        'unit_cost' => 100,
        'archived_at' => $archived ? now() : null,
    ]);
}

/*
|--------------------------------------------------------------------------
| Authorization
|--------------------------------------------------------------------------
*/

test('an admin, specialist, and super admin can each receive stock', function (string $role) {
    $admin = receiptStoreTestUser('admin');
    $actor = receiptStoreTestUser($role);
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($actor)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionDoesntHaveErrors();

    expect((int) $variant->inventory->fresh()->quantity_on_hand)->toBe(5);
})->with(['admin', 'specialist', 'super_admin']);

test('a student or cashier cannot receive stock', function (string $role) {
    $admin = receiptStoreTestUser('admin');
    $actor = receiptStoreTestUser($role);
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($actor)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertForbidden();

    expect((int) $variant->inventory->fresh()->quantity_on_hand)->toBe(0);
})->with(['student', 'cashier']);

/*
|--------------------------------------------------------------------------
| Purchase Order Guards
|--------------------------------------------------------------------------
*/

test('an archived purchase order cannot receive merchandise', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin, archived: true);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('purchase_order_id');

    expect((int) $variant->inventory->fresh()->quantity_on_hand)->toBe(0);
});

test('a completed purchase order cannot receive merchandise', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin, status: PurchaseOrder::STATUS_COMPLETED);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10, quantityReceived: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 1,
    ])->assertSessionHasErrors('purchase_order_id');
});

test('a draft purchase order cannot receive merchandise', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin, status: PurchaseOrder::STATUS_DRAFT);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('purchase_order_id');
});

test('an archived purchase order item cannot receive merchandise', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10, archived: true);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('purchase_order_item_id');
});

test('an item that does not belong to the given purchase order is rejected', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrderA = receiptStoreTestOrder($admin);
    $purchaseOrderB = receiptStoreTestOrder($admin);
    $itemOnB = receiptStoreTestItem($purchaseOrderB, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrderA->id,
        'purchase_order_item_id' => $itemOnB->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('purchase_order_item_id');
});

/*
|--------------------------------------------------------------------------
| Quantity Business Rules
|--------------------------------------------------------------------------
*/

test('receiving more than the remaining quantity is rejected', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10, quantityReceived: 4);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        // Only 6 remain.
        'quantity' => 7,
    ])->assertSessionHasErrors('quantity');

    expect((int) $variant->inventory->fresh()->quantity_on_hand)->toBe(0);
    expect($item->fresh()->quantity_received)->toBe(4);
});

test('an item that has already been fully received cannot receive more', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin, status: PurchaseOrder::STATUS_PARTIALLY_RECEIVED);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10, quantityReceived: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 1,
    ])->assertSessionHasErrors('quantity');
});

test('receiving exactly the remaining quantity succeeds', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10, quantityReceived: 4);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 6,
    ])->assertSessionDoesntHaveErrors();

    expect($item->fresh()->quantity_received)->toBe(10);
});

/*
|--------------------------------------------------------------------------
| Variant Substitution Guard
|--------------------------------------------------------------------------
*/

test('a submitted product_variant_id that does not match the linked variant is rejected', function () {
    $admin = receiptStoreTestUser('admin');
    $linkedVariant = receiptStoreTestVariant($admin);
    $otherVariant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $linkedVariant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        // Manipulated request tries to receive into a different variant.
        'product_variant_id' => $otherVariant->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('product_variant_id');

    expect((int) $linkedVariant->inventory->fresh()->quantity_on_hand)->toBe(0);
    expect((int) $otherVariant->inventory->fresh()->quantity_on_hand)->toBe(0);
});

test('submitting the correct matching product_variant_id succeeds', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'product_variant_id' => $variant->id,
        'quantity' => 5,
    ])->assertSessionDoesntHaveErrors();
});

/*
|--------------------------------------------------------------------------
| Inactive / Missing Records
|--------------------------------------------------------------------------
*/

test('receiving against an inactive product is rejected', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin, productActive: false);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('product_variant_id');
});

test('receiving against an inactive variant is rejected', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin, variantActive: false);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionHasErrors('product_variant_id');
});

/*
|--------------------------------------------------------------------------
| Purchase Order Status Transitions
|--------------------------------------------------------------------------
*/

test('a purchase order moves to partially received after a partial receipt', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 4,
    ])->assertSessionDoesntHaveErrors();

    $purchaseOrder->refresh();

    expect($purchaseOrder->status)->toBe(PurchaseOrder::STATUS_PARTIALLY_RECEIVED);
    expect($purchaseOrder->completed_at)->toBeNull();
});

test('a purchase order moves to completed once every item is fully received', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin, status: PurchaseOrder::STATUS_PARTIALLY_RECEIVED);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10, quantityReceived: 4);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 6,
    ])->assertSessionDoesntHaveErrors();

    $purchaseOrder->refresh();

    expect($purchaseOrder->status)->toBe(PurchaseOrder::STATUS_COMPLETED);
    expect($purchaseOrder->completed_at)->not->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Stock Movement + Audit Log
|--------------------------------------------------------------------------
*/

test('a successful receipt creates a correct stock movement record', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 6,
        'supplier_reference_number' => 'SUP-REF-123',
    ])->assertSessionDoesntHaveErrors();

    $movement = StockMovement::query()->latest('id')->first();

    expect($movement)->not->toBeNull();
    expect($movement->movement_type)->toBe(StockMovement::TYPE_RECEIVE);
    expect($movement->quantity_change)->toBe(6);
    expect($movement->quantity_before)->toBe(0);
    expect($movement->quantity_after)->toBe(6);
    expect($movement->performed_by)->toBe($admin->id);
    expect($movement->supplier_reference_number)->toBe('SUP-REF-123');
    expect($movement->receipt_number)->not->toBeNull();
});

test('a successful receipt writes an audit log entry', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 6,
    ])->assertSessionDoesntHaveErrors();

    $log = AuditLog::query()
        ->where('module', 'inventory')
        ->where('action', 'stock_received')
        ->latest('id')
        ->first();

    expect($log)->not->toBeNull();
    expect($log->user_id)->toBe($admin->id);
    expect($log->new_values['quantity_received'])->toBe(6);
    expect($log->new_values['purchase_order_id'])->toBe($purchaseOrder->id);
    expect($log->old_values['quantity_on_hand'])->toBe(0);
});

test('receiving against an existing catalog item marks the product as recently restocked', function () {
    $admin = receiptStoreTestUser('admin');
    $variant = receiptStoreTestVariant($admin);
    $purchaseOrder = receiptStoreTestOrder($admin);
    $item = receiptStoreTestItem($purchaseOrder, $variant, quantityOrdered: 10);

    expect($variant->product->restocked_badge_started_at)->toBeNull();

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $purchaseOrder->id,
        'purchase_order_item_id' => $item->id,
        'quantity' => 5,
    ])->assertSessionDoesntHaveErrors();

    expect($variant->product->fresh()->restocked_badge_started_at)->not->toBeNull();
});
