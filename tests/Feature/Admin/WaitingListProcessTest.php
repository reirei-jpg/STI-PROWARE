<?php

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function waitingListAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function waitingListVariant(User $admin, int $quantityOnHand, int $quantityReserved)
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
        'quantity_on_hand' => $quantityOnHand,
        'quantity_reserved' => $quantityReserved,
        'reorder_level' => 5,
    ]);

    return $variant->fresh('inventory');
}

function waitingListPreorderItem($variant, string $preorderStatus, int $quantity = 2): OrderItem
{
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
        'subtotal' => 1000,
        'total' => 1000,
        'qr_token' => Str::random(24),
        'release_qr_token' => Str::random(24),
    ]);

    return $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => $preorderStatus,
        'preorder_reserved_quantity' => $quantity,
        'quantity' => $quantity,
        'unit_price' => '500.00',
        'line_total' => (string) (500 * $quantity),
    ]);
}

test('processing a ready preorder converts it without touching inventory reservation', function () {
    $admin = waitingListAdmin();

    // Stock was already reserved by the automatic allocation engine
    // when this item became "ready".
    $variant = waitingListVariant($admin, quantityOnHand: 10, quantityReserved: 2);
    $item = waitingListPreorderItem($variant, OrderItem::PREORDER_STATUS_READY, quantity: 2);

    $this->actingAs($admin)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertSessionDoesntHaveErrors();

    $item->refresh();
    $inventory = Inventory::query()->where('product_variant_id', $variant->id)->first();

    expect($item->item_type)->toBe(OrderItem::TYPE_ORDER);

    // The reservation must be untouched — not incremented a second time.
    expect((int) $inventory->quantity_reserved)->toBe(2);
});

test('processing a paid preorder converts it without touching inventory reservation', function () {
    $admin = waitingListAdmin();
    $variant = waitingListVariant($admin, quantityOnHand: 10, quantityReserved: 3);
    $item = waitingListPreorderItem($variant, OrderItem::PREORDER_STATUS_PAID, quantity: 3);

    $this->actingAs($admin)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertSessionDoesntHaveErrors();

    $item->refresh();
    $inventory = Inventory::query()->where('product_variant_id', $variant->id)->first();

    expect($item->item_type)->toBe(OrderItem::TYPE_ORDER);
    expect((int) $inventory->quantity_reserved)->toBe(3);
});

test('a waiting preorder cannot be processed', function () {
    $admin = waitingListAdmin();
    $variant = waitingListVariant($admin, quantityOnHand: 10, quantityReserved: 0);
    $item = waitingListPreorderItem($variant, OrderItem::PREORDER_STATUS_WAITING);

    $this->actingAs($admin)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertSessionHasErrors('preorder');

    $item->refresh();
    $inventory = Inventory::query()->where('product_variant_id', $variant->id)->first();

    expect($item->item_type)->toBe(OrderItem::TYPE_PREORDER);
    expect((int) $inventory->quantity_reserved)->toBe(0);
});

test('an expired preorder cannot be processed', function () {
    $admin = waitingListAdmin();
    $variant = waitingListVariant($admin, quantityOnHand: 10, quantityReserved: 0);
    $item = waitingListPreorderItem($variant, OrderItem::PREORDER_STATUS_EXPIRED);

    $this->actingAs($admin)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertSessionHasErrors('preorder');

    $item->refresh();

    expect($item->item_type)->toBe(OrderItem::TYPE_PREORDER);
});

test('an already-processed item cannot be processed again', function () {
    $admin = waitingListAdmin();
    $variant = waitingListVariant($admin, quantityOnHand: 10, quantityReserved: 2);
    $item = waitingListPreorderItem($variant, OrderItem::PREORDER_STATUS_READY, quantity: 2);

    $this->actingAs($admin)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertSessionDoesntHaveErrors();

    $this->actingAs($admin)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertSessionHasErrors('preorder');

    $inventory = Inventory::query()->where('product_variant_id', $variant->id)->first();

    // Still exactly the one original reservation — no double count
    // even across two clicks on an already-converted item.
    expect((int) $inventory->quantity_reserved)->toBe(2);
});

test('a specialist cannot process a preorder', function () {
    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $variant = waitingListVariant($specialist, quantityOnHand: 10, quantityReserved: 2);
    $item = waitingListPreorderItem($variant, OrderItem::PREORDER_STATUS_READY, quantity: 2);

    $this->actingAs($specialist)
        ->patch("/admin/waiting-list/{$item->id}/process")
        ->assertForbidden();
});
