<?php

use App\Http\Controllers\Cashier\CashierOrderController;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Student;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

function cashierUser(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function studentUserWithProfile(): User
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

function orderAwaitingConfirmation(Student $student, User $creator, array $overrides = []): Order
{
    return Order::query()->create(array_merge([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '100.00',
        'total' => '100.00',
        'qr_token' => Str::random(64),
        'payment_method' => 'cash',
        'payment_reference' => null,
        'payment_qr_used_at' => now(),
    ], $overrides));
}

test('cashier cannot confirm payment before the payment qr is scanned', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_qr_used_at' => null,
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_PENDING);
    expect($order->paid_at)->toBeNull();
});

test('cashier can confirm a cash payment after the qr was scanned', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_method' => 'cash',
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertRedirect(route('cashier.orders.receipt', $order));
    $response->assertSessionHas('success');

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_PAID);
    expect($order->paid_at)->not->toBeNull();
    expect($order->payment_confirmed_by)->toBe($cashier->id);
    expect($order->transaction_number)->not->toBeNull();
    expect($order->transaction_number)->toStartWith('TXN-');
    expect($order->release_qr_token)->not->toBeNull();
});

test('confirming payment for a cancelled order fails and leaves it cancelled', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_CANCELLED,
        'cancelled_at' => now(),
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_CANCELLED);
    expect($order->paid_at)->toBeNull();
});

test('confirming an already paid order redirects to the receipt without changing it', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $paidAt = now()->subDay();

    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_PAID,
        'paid_at' => $paidAt,
        'transaction_number' => 'TXN-EXISTING-000001',
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertRedirect(route('cashier.orders.receipt', $order));
    $response->assertSessionHas('success');

    $order->refresh();

    expect($order->transaction_number)->toBe('TXN-EXISTING-000001');
});

test('confirming payment fails when the order has no valid payment method', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_method' => null,
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_PENDING);
});

test('confirming an online payment without a reference number fails', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_method' => 'gcash',
        'payment_reference' => null,
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_PENDING);
});

test('confirming an online payment with a reference number succeeds', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'payment_method' => 'gcash',
        'payment_reference' => 'GCASH-REF-000123',
    ]);

    $response = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertRedirect(route('cashier.orders.receipt', $order));

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_PAID);
    expect($order->payment_reference)->toBe('GCASH-REF-000123');
});

function preorderVariantForOrder(User $admin)
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

    return $product->variants()->create([
        'sku' => 'SKU-'.Str::random(8),
        'size' => 'STD',
        'variant_name' => 'Standard',
        'variant_key' => 'STD',
        'is_active' => true,
    ]);
}

test('confirming payment promotes a ready preorder item to a normal order item', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $variant = preorderVariantForOrder($cashier);

    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'order_type' => Order::TYPE_PREORDER,
    ]);

    $item = $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => OrderItem::PREORDER_STATUS_READY,
        'preorder_reserved_quantity' => 2,
        'quantity' => 2,
        'unit_price' => '500.00',
        'line_total' => '1000.00',
    ]);

    $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment")
        ->assertSessionHas('success');

    $item->refresh();

    expect($item->item_type)->toBe(OrderItem::TYPE_ORDER);
    expect($item->preorder_status)->toBe(OrderItem::PREORDER_STATUS_PAID);
    expect($item->preorder_paid_at)->not->toBeNull();
});

test('confirming payment does not touch a preorder item that is still waiting', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();
    $variant = preorderVariantForOrder($cashier);

    $order = orderAwaitingConfirmation($studentUser->student, $studentUser, [
        'order_type' => Order::TYPE_PREORDER,
    ]);

    $item = $order->items()->create([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => OrderItem::PREORDER_STATUS_WAITING,
        'preorder_reserved_quantity' => 2,
        'quantity' => 2,
        'unit_price' => '500.00',
        'line_total' => '1000.00',
    ]);

    $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $item->refresh();

    expect($item->item_type)->toBe(OrderItem::TYPE_PREORDER);
    expect($item->preorder_status)->toBe(OrderItem::PREORDER_STATUS_WAITING);
});

test('a non-cashier cannot confirm payment', function () {
    $studentUser = studentUserWithProfile();
    $order = orderAwaitingConfirmation($studentUser->student, $studentUser);

    $response = $this->actingAs($studentUser)
        ->patch("/cashier/orders/{$order->id}/payment");

    $response->assertForbidden();

    $order->refresh();

    expect($order->payment_status)->toBe(Order::PAYMENT_PENDING);
});

test('confirming payment notifies the student and every active specialist', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();

    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $inactiveSpecialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => false,
    ]);

    $order = orderAwaitingConfirmation($studentUser->student, $studentUser);

    $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_PAYMENT_CONFIRMED)
            ->exists(),
    )->toBeTrue();

    expect(
        Notification::query()
            ->where('user_id', $specialist->id)
            ->where('type', Notification::TYPE_ORDER_READY_FOR_FULFILLMENT)
            ->exists(),
    )->toBeTrue();

    expect(
        Notification::query()
            ->where('user_id', $inactiveSpecialist->id)
            ->exists(),
    )->toBeFalse();
});

test('confirming payment twice for the same order never produces duplicate audit logs or notifications', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();

    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $order = orderAwaitingConfirmation($studentUser->student, $studentUser);

    $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment")
        ->assertSessionHas('success');

    // A second confirmation attempt on the same order — the exact
    // shape of a double-click, a duplicate network retry, or two
    // cashier tabs racing to confirm the same order.
    $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment")
        ->assertSessionHas('success');

    expect(
        AuditLog::query()
            ->where('action', 'payment_confirmed')
            ->count(),
    )->toBe(1);

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_PAYMENT_CONFIRMED)
            ->count(),
    )->toBe(1);

    expect(
        Notification::query()
            ->where('user_id', $specialist->id)
            ->where('type', Notification::TYPE_ORDER_READY_FOR_FULFILLMENT)
            ->count(),
    )->toBe(1);
});

test('two requests racing to confirm the same order only confirm it once', function () {
    $cashier = cashierUser();
    $studentUser = studentUserWithProfile();

    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $order = orderAwaitingConfirmation($studentUser->student, $studentUser);

    // Two independently-fetched copies of the same order simulate
    // two requests that both read it as "not yet paid" before either
    // had a chance to write — exactly the window a missing row lock
    // leaves open. Calling the controller directly (rather than over
    // HTTP) lets both "requests" hold their own stale copy at once,
    // since a real HTTP round trip would re-fetch fresh state for the
    // second call and hide the race entirely.
    $orderForRequestA = Order::find($order->id);
    $orderForRequestB = Order::find($order->id);

    $request = Request::create(
        "/cashier/orders/{$order->id}/payment",
        'PATCH',
    );

    $request->setUserResolver(
        fn () => $cashier,
    );

    $controller = app(CashierOrderController::class);
    $notificationService = app(NotificationService::class);

    $controller->confirmPayment($request, $orderForRequestA, $notificationService);
    $controller->confirmPayment($request, $orderForRequestB, $notificationService);

    expect(
        AuditLog::query()
            ->where('action', 'payment_confirmed')
            ->count(),
    )->toBe(1);

    expect(
        Notification::query()
            ->where('user_id', $studentUser->id)
            ->where('type', Notification::TYPE_PAYMENT_CONFIRMED)
            ->count(),
    )->toBe(1);

    expect(
        Notification::query()
            ->where('user_id', $specialist->id)
            ->where('type', Notification::TYPE_ORDER_READY_FOR_FULFILLMENT)
            ->count(),
    )->toBe(1);

    $order->refresh();
    expect($order->payment_status)->toBe(Order::PAYMENT_PAID);
});
