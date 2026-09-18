<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Super Admin Access To Receiving + Waiting List
|--------------------------------------------------------------------------
|
| StockMovementController's route is `role:super_admin,admin,specialist`,
| and its controller-level check was fixed once already to match. This
| file proves the same fix reaches every sibling endpoint sharing that
| exact route group: a super_admin must never be bounced by a stricter
| controller-level check than the route middleware that let them in.
*/

function superAdminReceivingActor(): User
{
    return User::factory()->create([
        'role' => 'super_admin',
        'is_active' => true,
    ]);
}

function superAdminReceivingVariant(User $actor)
{
    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $actor->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Product',
        'base_price' => 500,
        'is_active' => true,
    ]);

    $variant = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => Str::random(8),
        'is_active' => true,
    ]);

    $variant->inventory()->create([
        'quantity_on_hand' => 0,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
    ]);

    return $variant->fresh('inventory');
}

function superAdminReceivingPoItem(User $actor, $variant): PurchaseOrderItem
{
    $purchaseOrder = PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $actor->id,
        'ordered_at' => now(),
    ]);

    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_CATALOG,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'product_variant_id' => $variant->id,
        'track_inventory' => true,
        'quantity_ordered' => 100,
        'quantity_received' => 0,
        'unit_cost' => 50.00,
    ]);
}

function superAdminReceivingManualItem(User $actor): PurchaseOrderItem
{
    $purchaseOrder = PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $actor->id,
        'ordered_at' => now(),
    ]);

    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_MANUAL,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_NEW,
        'manual_name' => 'Some Unlisted Item',
        'track_inventory' => false,
        'quantity_ordered' => 50,
        'quantity_received' => 0,
        'unit_cost' => 25.00,
    ]);
}

test('a super admin can view the receive stock form', function () {
    $superAdmin = superAdminReceivingActor();

    $response = $this->actingAs($superAdmin)->get('/staff/stock-receipts/create');

    $response->assertOk();
});

test('a super admin can submit a stock receipt', function () {
    $superAdmin = superAdminReceivingActor();
    $variant = superAdminReceivingVariant($superAdmin);
    $poItem = superAdminReceivingPoItem($superAdmin, $variant);

    $response = $this->actingAs($superAdmin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
    ]);

    $response->assertSessionDoesntHaveErrors();

    $variant->inventory->refresh();
    expect((int) $variant->inventory->quantity_on_hand)->toBe(10);
});

test('a super admin can link a manual purchase order item to an existing variant', function () {
    $superAdmin = superAdminReceivingActor();
    $variant = superAdminReceivingVariant($superAdmin);
    $item = superAdminReceivingManualItem($superAdmin);

    $response = $this->actingAs($superAdmin)
        ->post("/staff/stock-receipts/purchase-order-items/{$item->id}/link-variant", [
            'product_variant_id' => $variant->id,
        ]);

    $response->assertSessionDoesntHaveErrors();

    $item->refresh();
    expect($item->product_variant_id)->toBe($variant->id);
});

test('a super admin can view the waiting list', function () {
    $superAdmin = superAdminReceivingActor();

    $response = $this->actingAs($superAdmin)->get('/staff/waiting-list');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('staff/WaitingList/Index'),
    );
});

test('a super admin can process a ready preorder from the waiting list', function () {
    $superAdmin = superAdminReceivingActor();
    $variant = superAdminReceivingVariant($superAdmin);

    $studentUserModel = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $studentUserModel->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    $order = Order::query()->create([
        'order_number' => 'ORD-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $studentUserModel->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_PREORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => 500,
        'total' => 500,
        'qr_token' => Str::random(24),
        'release_qr_token' => Str::random(24),
    ]);

    $orderItem = $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => OrderItem::PREORDER_STATUS_READY,
        'preorder_reserved_quantity' => 1,
        'quantity' => 1,
        'unit_price' => '500.00',
        'line_total' => '500.00',
    ]);

    $response = $this->actingAs($superAdmin)
        ->patch("/staff/waiting-list/{$orderItem->id}/process");

    $response->assertSessionDoesntHaveErrors();
});
