<?php

use App\Models\Order;

test('the summary counts reflect total, today, and this-week releases', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    // Released today.
    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);

    // Released earlier this week, but not today.
    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now()->startOfWeek(),
    ]);

    // Released last month — outside this week, but still counted in total.
    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now()->subMonth(),
    ]);

    // Paid but not yet released — must not be counted anywhere.
    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'released_at' => null,
    ]);

    $response = $this->actingAs($specialist)->get('/specialist/releases');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('specialist/Releases/Index')
        ->where('summary.total', 3)
        ->where('summary.today', 1)
        ->where('summary.week', 2),
    );
});

test('filtering release history by today only returns releases from today', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    $todayOrder = makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);

    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now()->subMonth(),
    ]);

    $response = $this->actingAs($specialist)->get('/specialist/releases?date=today');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('orders.total', 1)
        ->where('orders.data.0.id', $todayOrder->id),
    );
});

test('a non-specialist cannot view release history', function () {
    $studentUser = makeStudentAccount();

    $response = $this->actingAs($studentUser)->get('/specialist/releases');

    $response->assertForbidden();
});
