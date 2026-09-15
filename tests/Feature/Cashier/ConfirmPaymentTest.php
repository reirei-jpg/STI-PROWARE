<?php

use App\Models\Notification;
use App\Models\Order;
use App\Models\Student;
use App\Models\User;
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
