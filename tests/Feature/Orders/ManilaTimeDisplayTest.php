<?php

use App\Models\Order;
use App\Models\User;

function manilaOrder(): Order
{
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 1);

    // 17:30 UTC on the 18th is 01:30 in the morning of the 19th in Manila.
    $order = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'paid_at' => '2026-09-18 17:30:00',
    ]);

    Order::query()->whereKey($order->id)->update([
        'created_at' => '2026-09-18 17:30:00',
    ]);

    return $order->fresh();
}

test('order pages show stored times in Philippine time for every role', function (string $role, string $path) {
    $order = manilaOrder();

    $user = $role === 'student'
        ? $order->student->user
        : User::factory()->create(['role' => $role, 'is_active' => true]);

    $this->actingAs($user)
        ->get(str_replace('{id}', (string) $order->id, $path))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('order.created_at', 'Sep 19, 2026 01:30 AM')
            ->where('order.paid_at', 'Sep 19, 2026 01:30 AM'),
        );
})->with([
    'cashier' => ['cashier', '/cashier/orders/{id}'],
    'admin' => ['admin', '/admin/orders/{id}'],
    'student' => ['student', '/student/orders/{id}'],
]);

test('the specialist release history shows release time in Philippine time', function () {
    $studentUser = makeStudentAccount();

    makePaidOrderWithItem($studentUser->student, $studentUser, makeVariantWithStock(10, 0), 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => '2026-09-18 17:30:00',
    ]);

    $this->actingAs(makeSpecialist())
        ->get('/specialist/releases')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('orders.data.0.released_at', 'Sep 19, 2026 01:30 AM'),
        );
});
