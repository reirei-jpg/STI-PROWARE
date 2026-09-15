<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Student;
use App\Models\User;
use App\Services\CheckoutService;
use Illuminate\Support\Str;

function purchasingCostAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function purchasingCostStudent(): User
{
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    return $user->fresh('student');
}

function purchasingCostBareVariant(User $admin)
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

    $variant = $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);

    $variant->inventory()->create([
        'quantity_on_hand' => 0,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
        'average_cost' => null,
    ]);

    return $variant->fresh('inventory');
}

/**
 * Every stock receipt must be tied to a purchase order item.
 * This creates one large enough to receive against multiple
 * times within a single test.
 */
function purchasingCostPurchaseOrderItem(User $admin, $variant): PurchaseOrderItem
{
    $purchaseOrder = PurchaseOrder::query()->create([
        'po_number' => 'PO-TEST-'.Str::random(8),
        'supplier_name' => 'Test Supplier',
        'status' => PurchaseOrder::STATUS_ORDERED,
        'created_by' => $admin->id,
        'ordered_at' => now(),
    ]);

    return $purchaseOrder->items()->create([
        'item_type' => PurchaseOrderItem::TYPE_CATALOG,
        'merchandise_origin' => PurchaseOrderItem::ORIGIN_EXISTING,
        'product_variant_id' => $variant->id,
        'track_inventory' => true,
        'quantity_ordered' => 1000,
        'quantity_received' => 0,
    ]);
}

test('receiving stock records the purchasing price as the average cost', function () {
    $admin = purchasingCostAdmin();
    $variant = purchasingCostBareVariant($admin);
    $poItem = purchasingCostPurchaseOrderItem($admin, $variant);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 100,
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((float) $inventory->average_cost)->toBe(100.00);
    expect((int) $inventory->quantity_on_hand)->toBe(10);
});

test('receiving stock twice at different costs computes a weighted average', function () {
    $admin = purchasingCostAdmin();
    $variant = purchasingCostBareVariant($admin);
    $poItem = purchasingCostPurchaseOrderItem($admin, $variant);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 100,
    ])->assertSessionDoesntHaveErrors();

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 120,
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    // (10*100 + 10*120) / 20 = 110
    expect((float) $inventory->average_cost)->toBe(110.00);
    expect((int) $inventory->quantity_on_hand)->toBe(20);
});

test('receiving stock without a cost leaves the average cost unchanged', function () {
    $admin = purchasingCostAdmin();
    $variant = purchasingCostBareVariant($admin);
    $poItem = purchasingCostPurchaseOrderItem($admin, $variant);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 100,
    ])->assertSessionDoesntHaveErrors();

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 5,
        // no unit_cost this time
    ])->assertSessionDoesntHaveErrors();

    $inventory = Inventory::query()
        ->where('product_variant_id', $variant->id)
        ->first();

    expect((float) $inventory->average_cost)->toBe(100.00);
    expect((int) $inventory->quantity_on_hand)->toBe(15);
});

test('checkout freezes the current average cost onto the order item', function () {
    $admin = purchasingCostAdmin();
    $variant = purchasingCostBareVariant($admin);
    $poItem = purchasingCostPurchaseOrderItem($admin, $variant);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 150,
    ])->assertSessionDoesntHaveErrors();

    $studentUser = purchasingCostStudent();

    $cart = Cart::query()->create([
        'student_id' => $studentUser->student->id,
        'created_by' => $studentUser->id,
        'source' => Cart::SOURCE_STUDENT_APP,
        'status' => Cart::STATUS_ACTIVE,
    ]);

    $cartItem = CartItem::query()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'item_type' => CartItem::TYPE_ORDER,
        'quantity' => 2,
        'unit_price' => '500.00',
    ]);

    $order = app(CheckoutService::class)->checkoutForStudent(
        $studentUser,
        [$cartItem->id],
    );

    $orderItem = $order->items()->first();

    expect((float) $orderItem->unit_cost)->toBe(150.00);

    // 500 selling price - 150 cost = 350 profit per unit
    expect((float) $orderItem->lineProfit())->toBe(700.00);
});

test('the sales report shows cost and profit for a completed sale', function () {
    $admin = purchasingCostAdmin();
    $variant = purchasingCostBareVariant($admin);
    $poItem = purchasingCostPurchaseOrderItem($admin, $variant);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 10,
        'unit_cost' => 150,
    ])->assertSessionDoesntHaveErrors();

    $studentUser = purchasingCostStudent();

    $cart = Cart::query()->create([
        'student_id' => $studentUser->student->id,
        'created_by' => $studentUser->id,
        'source' => Cart::SOURCE_STUDENT_APP,
        'status' => Cart::STATUS_ACTIVE,
    ]);

    $cartItem = CartItem::query()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
        'item_type' => CartItem::TYPE_ORDER,
        'quantity' => 2,
        'unit_price' => '500.00',
    ]);

    $order = app(CheckoutService::class)->checkoutForStudent(
        $studentUser,
        [$cartItem->id],
    );

    $order->forceFill([
        'payment_status' => Order::PAYMENT_PAID,
        'paid_at' => now(),
        'payment_method' => 'cash',
    ])->save();

    $response = $this->actingAs($admin)->get('/admin/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Sales/Index')
        ->where('summary.filtered_sales', '1000.00')
        ->where('summary.filtered_cost', '300.00')
        ->where('summary.filtered_profit', '700.00')
        ->where('topProducts.0.total_sales', '1000.00')
        ->where('topProducts.0.total_cost', '300.00')
        ->where('topProducts.0.total_profit', '700.00')
        ->where('topProducts.0.has_complete_cost', true),
    );
});
