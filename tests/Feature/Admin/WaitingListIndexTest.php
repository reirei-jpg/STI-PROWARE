<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function waitingListIndexAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function waitingListIndexVariant(User $admin)
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
        'quantity_on_hand' => 10,
        'quantity_reserved' => 0,
        'reorder_level' => 5,
    ]);

    return $variant->fresh('inventory');
}

function waitingListIndexPreorderItem($variant, string $preorderStatus): OrderItem
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
        'subtotal' => 500,
        'total' => 500,
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
        'preorder_reserved_quantity' => 1,
        'quantity' => 1,
        'unit_price' => '500.00',
        'line_total' => '500.00',
    ]);
}

test('expired preorders are hidden from the default view', function () {
    $admin = waitingListIndexAdmin();
    $variant = waitingListIndexVariant($admin);

    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_WAITING);
    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_EXPIRED);

    $response = $this->actingAs($admin)->get('/staff/waiting-list');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('staff/WaitingList/Index')
        ->where('waitingItems.total', 1)
        ->where('waitingItems.data.0.waiting_status', 'waiting'),
    );
});

test('expired preorders are shown when explicitly filtered', function () {
    $admin = waitingListIndexAdmin();
    $variant = waitingListIndexVariant($admin);

    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_WAITING);
    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_EXPIRED);

    $response = $this->actingAs($admin)->get('/staff/waiting-list?status=expired');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('staff/WaitingList/Index')
        ->where('waitingItems.total', 1)
        ->where('waitingItems.data.0.waiting_status', 'expired'),
    );
});

test('the displayed status is the real preorder status, not a live recomputation', function () {
    $admin = waitingListIndexAdmin();
    $variant = waitingListIndexVariant($admin);

    // Plenty of stock is available, but this item's own record still
    // says "waiting" — the page must show what the record says, not
    // what a live stock check would independently conclude.
    $item = waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_WAITING);

    $response = $this->actingAs($admin)->get('/staff/waiting-list');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('waitingItems.data.0.id', $item->id)
        ->where('waitingItems.data.0.waiting_status', 'waiting'),
    );
});

test('the summary reflects real status counts across waiting, ready, paid, and expired', function () {
    $admin = waitingListIndexAdmin();
    $variant = waitingListIndexVariant($admin);

    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_WAITING);
    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_READY);
    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_READY);
    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_PAID);
    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_EXPIRED);

    $response = $this->actingAs($admin)->get('/staff/waiting-list');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('summary.waiting', 1)
        ->where('summary.ready', 2)
        ->where('summary.paid', 1)
        ->where('summary.expired', 1)
        ->where('summary.total_entries', 5)
        ->where('summary.total_quantity', 5),
    );
});

test('filtering by paid only returns paid preorders', function () {
    $admin = waitingListIndexAdmin();
    $variant = waitingListIndexVariant($admin);

    waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_READY);
    $paidItem = waitingListIndexPreorderItem($variant, OrderItem::PREORDER_STATUS_PAID);

    $response = $this->actingAs($admin)->get('/staff/waiting-list?status=paid');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('waitingItems.total', 1)
        ->where('waitingItems.data.0.id', $paidItem->id),
    );
});
