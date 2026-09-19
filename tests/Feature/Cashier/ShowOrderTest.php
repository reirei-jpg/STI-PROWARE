<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function showOrderTestCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function showOrderTestStudent(): User
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

test('the order verification page discloses the fulfillment timeline once it exists', function () {
    $cashier = showOrderTestCashier();
    $studentUser = showOrderTestStudent();

    $readyAt = now()->subHours(2);
    $releasedAt = now()->subHour();

    $order = Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $studentUser->student->id,
        'created_by' => $studentUser->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'subtotal' => '100.00',
        'total' => '100.00',
        'qr_token' => Str::random(64),
        'paid_at' => now()->subHours(3),
        'ready_for_release_at' => $readyAt,
        'released_at' => $releasedAt,
    ]);

    $response = $this->actingAs($cashier)->get("/cashier/orders/{$order->id}");

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Orders/Show')
        ->where('order.ready_for_release_at', $readyAt->timezone('Asia/Manila')->format('M d, Y h:i A'))
        ->where('order.released_at', $releasedAt->timezone('Asia/Manila')->format('M d, Y h:i A'))
        ->where('order.cancelled_at', null),
    );
});
