<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function receiptBackUrlTestCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function receiptBackUrlTestPaidOrder(): Order
{
    $studentUser = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $studentUser->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    return Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $studentUser->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '100.00',
        'total' => '100.00',
        'qr_token' => Str::random(64),
        'paid_at' => now(),
        'payment_method' => 'cash',
    ]);
}

test('the receipt sends the cashier back to the order verification page by default', function () {
    $cashier = receiptBackUrlTestCashier();
    $order = receiptBackUrlTestPaidOrder();

    $response = $this->actingAs($cashier)->get("/cashier/orders/{$order->id}/receipt");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('receipts/Show')
        ->where('backUrl', route('cashier.orders.show', $order)),
    );
});

test('the receipt sends the cashier back to payment history when it came from there', function () {
    $cashier = receiptBackUrlTestCashier();
    $order = receiptBackUrlTestPaidOrder();

    $response = $this->actingAs($cashier)->get("/cashier/orders/{$order->id}/receipt?from=payments");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('receipts/Show')
        ->where('backUrl', route('cashier.payments.index')),
    );
});
