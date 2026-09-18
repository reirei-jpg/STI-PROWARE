<?php

use App\Models\Category;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function preorderPaymentTestStudent(): User
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

function preorderPaymentTestVariant(): ProductVariant
{
    $admin = User::factory()->create(['role' => 'admin']);

    $category = Category::query()->create([
        'name' => 'Category '.Str::random(8),
        'is_active' => true,
    ]);

    $product = Product::query()->create([
        'category_id' => $category->id,
        'created_by' => $admin->id,
        'code' => 'PRD-'.Str::random(8),
        'name' => 'Test Preorder Product',
        'base_price' => 500.00,
        'availability_status' => Product::AVAILABILITY_COMING_SOON,
        'preorder_enabled' => true,
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
        'quantity_reserved' => 1,
        'reorder_level' => 2,
    ]);

    return $variant;
}

/**
 * A preorder-only order exactly as CheckoutController::store()
 * creates one: payment_method left null, awaiting readiness.
 */
function readyPreorderOrder(Student $student, User $creator, ProductVariant $variant, array $itemOverrides = []): Order
{
    $order = Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_PREORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '500.00',
        'total' => '500.00',
        'qr_token' => Str::random(64),
        'payment_method' => null,
        'payment_reference' => null,
    ]);

    $order->items()->create(array_merge([
        'product_variant_id' => $variant->id,
        'product_code' => $variant->product->code,
        'product_name' => $variant->product->name,
        'variant_name' => $variant->variant_name,
        'sku' => $variant->sku,
        'item_type' => OrderItem::TYPE_PREORDER,
        'preorder_status' => OrderItem::PREORDER_STATUS_READY,
        'preorder_ready_at' => now(),
        'preorder_reserved_quantity' => 1,
        'quantity' => 1,
        'unit_price' => '500.00',
        'line_total' => '500.00',
    ], $itemOverrides));

    return $order->fresh('items');
}

test('a student can view the payment form for their own ready preorder', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant);

    $response = $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}/pay");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('checkout/Index')
        ->where('cart.id', $order->id)
        ->where('cart.items.0.item_type', 'preorder'),
    );
});

test('the order detail page reports whether a payment method still needs to be submitted', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant);

    $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page
            ->component('student/Orders/Show')
            ->where('order.payment_method', null)
            ->where('order.items.0.preorder_status', 'ready'),
        );

    $order->forceFill(['payment_method' => 'cash'])->save();

    $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}")
        ->assertInertia(fn ($page) => $page
            ->component('student/Orders/Show')
            ->where('order.payment_method', 'cash'),
        );
});

test('a student cannot view the payment form for another students order', function () {
    $studentUser = preorderPaymentTestStudent();
    $otherStudentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant);

    $response = $this->actingAs($otherStudentUser)
        ->get("/student/orders/{$order->id}/pay");

    $response->assertForbidden();
});

test('viewing the payment form redirects away when the order is not actually ready', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant, [
        'preorder_status' => OrderItem::PREORDER_STATUS_WAITING,
    ]);

    $response = $this->actingAs($studentUser)
        ->get("/student/orders/{$order->id}/pay");

    $response->assertRedirect(route('student.orders.show', $order));
    $response->assertSessionHas('error');
});

test('a student can submit cash payment for a ready preorder, which closes the original dead-end', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant);

    $cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);

    $response = $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/pay", [
            'payment_method' => 'cash',
        ]);

    $response->assertRedirect(route('student.orders.show', $order));
    $response->assertSessionHas('success');

    $order->refresh();

    expect($order->payment_method)->toBe('cash');
    expect($order->payment_reference)->toBeNull();
    // Still pending payment — the cashier still has to confirm it.
    expect($order->payment_status)->toBe(Order::PAYMENT_PENDING);

    expect(
        Notification::query()
            ->where('user_id', $cashier->id)
            ->where('type', Notification::TYPE_ORDER_PENDING_PAYMENT)
            ->exists(),
    )->toBeTrue();

    // End-to-end proof: the cashier can now actually confirm payment,
    // which was structurally impossible before this fix because
    // payment_method was never set for a preorder-only order.
    $order->forceFill(['payment_qr_used_at' => now()])->save();

    $confirmResponse = $this->actingAs($cashier)
        ->patch("/cashier/orders/{$order->id}/payment");

    $confirmResponse->assertSessionHas('success');

    $order->refresh();
    expect($order->payment_status)->toBe(Order::PAYMENT_PAID);

    $item = $order->items()->first();
    expect($item->item_type)->toBe(OrderItem::TYPE_ORDER);
    expect($item->preorder_status)->toBe(OrderItem::PREORDER_STATUS_PAID);
});

test('a student can submit gcash payment with a reference number, normalized to uppercase', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant);

    $response = $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/pay", [
            'payment_method' => 'gcash',
            'payment_reference' => 'gc-lowercase-ref',
        ]);

    $response->assertSessionHas('success');

    $order->refresh();
    expect($order->payment_method)->toBe('gcash');
    expect($order->payment_reference)->toBe('GC-LOWERCASE-REF');
});

test('submitting a payment reference that duplicates another order fails regardless of letter case', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant);

    Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $studentUser->student->id,
        'created_by' => $studentUser->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '100.00',
        'total' => '100.00',
        'qr_token' => Str::random(64),
        'payment_method' => 'gcash',
        'payment_reference' => 'ABC123XYZ',
    ]);

    $response = $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/pay", [
            'payment_method' => 'gcash',
            // Differently-cased duplicate of the existing reference above.
            'payment_reference' => 'abc123xyz',
        ]);

    $response->assertSessionHasErrors('payment_reference');

    $order->refresh();
    expect($order->payment_method)->toBeNull();
});

test('a preorder payment cannot be submitted twice for the same order', function () {
    $studentUser = preorderPaymentTestStudent();
    $variant = preorderPaymentTestVariant();
    $order = readyPreorderOrder($studentUser->student, $studentUser, $variant, [
        // Already resolved by a previous submission.
    ]);

    $order->forceFill(['payment_method' => 'cash'])->save();

    $response = $this->actingAs($studentUser)
        ->post("/student/orders/{$order->id}/pay", [
            'payment_method' => 'gcash',
            'payment_reference' => 'SECONDATTEMPT1',
        ]);

    $response->assertRedirect(route('student.orders.show', $order));
    $response->assertSessionHas('error');

    $order->refresh();
    expect($order->payment_method)->toBe('cash');
});
