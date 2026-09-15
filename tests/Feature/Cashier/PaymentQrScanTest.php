<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function createCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function createStudentWithProfile(): User
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

function createOrderForScanning(Student $student, User $creator, array $overrides = []): Order
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
    ], $overrides));
}

test('cashier can scan a valid payment qr and it marks the qr as used', function () {
    $cashier = createCashier();
    $studentUser = createStudentWithProfile();
    $order = createOrderForScanning($studentUser->student, $studentUser);

    expect($order->payment_qr_used_at)->toBeNull();

    $response = $this->actingAs($cashier)
        ->get("/cashier/orders/scan/{$order->qr_token}");

    $response->assertRedirect(route('cashier.orders.show', $order));
    $response->assertSessionHas('success');

    $order->refresh();

    expect($order->payment_qr_used_at)->not->toBeNull();
});

test('scanning an unknown qr token redirects with an error and confirms nothing', function () {
    $cashier = createCashier();

    $response = $this->actingAs($cashier)
        ->get('/cashier/orders/scan/'.Str::random(64));

    $response->assertRedirect(route('cashier.orders.index'));
    $response->assertSessionHas('error');
});

test('scanning a cancelled order qr fails and does not mark it used', function () {
    $cashier = createCashier();
    $studentUser = createStudentWithProfile();
    $order = createOrderForScanning($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_CANCELLED,
        'cancelled_at' => now(),
    ]);

    $response = $this->actingAs($cashier)
        ->get("/cashier/orders/scan/{$order->qr_token}");

    $response->assertRedirect(route('cashier.orders.index'));
    $response->assertSessionHas('error');

    $order->refresh();

    expect($order->payment_qr_used_at)->toBeNull();
});

test('scanning an already paid order qr fails', function () {
    $cashier = createCashier();
    $studentUser = createStudentWithProfile();
    $order = createOrderForScanning($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_PAID,
        'paid_at' => now(),
    ]);

    $response = $this->actingAs($cashier)
        ->get("/cashier/orders/scan/{$order->qr_token}");

    $response->assertRedirect(route('cashier.orders.index'));
    $response->assertSessionHas('error');
});

test('a payment qr can only be scanned once', function () {
    $cashier = createCashier();
    $studentUser = createStudentWithProfile();
    $order = createOrderForScanning($studentUser->student, $studentUser);

    $this->actingAs($cashier)
        ->get("/cashier/orders/scan/{$order->qr_token}")
        ->assertSessionHas('success');

    $order->refresh();
    $firstScanTimestamp = $order->payment_qr_used_at;

    expect($firstScanTimestamp)->not->toBeNull();

    $response = $this->actingAs($cashier)
        ->get("/cashier/orders/scan/{$order->qr_token}");

    $response->assertRedirect(route('cashier.orders.index'));
    $response->assertSessionHas('error');

    $order->refresh();

    expect(
        $order->payment_qr_used_at->equalTo($firstScanTimestamp),
    )->toBeTrue();
});

test('a non-cashier cannot scan a payment qr', function () {
    $studentUser = createStudentWithProfile();
    $order = createOrderForScanning($studentUser->student, $studentUser);

    $response = $this->actingAs($studentUser)
        ->get("/cashier/orders/scan/{$order->qr_token}");

    $response->assertForbidden();

    $order->refresh();

    expect($order->payment_qr_used_at)->toBeNull();
});
