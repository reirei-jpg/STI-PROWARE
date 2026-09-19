<?php

use App\Models\Order;
use App\Models\User;

function listReadyOrder($studentUser, $variant, int $daysReady, array $overrides = []): Order
{
    return makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 2, array_merge([
        'fulfillment_status' => Order::FULFILLMENT_READY,
        'ready_for_release_at' => now()->subDays($daysReady)->subMinutes(5),
    ], $overrides));
}

function listStaff(string $role): User
{
    return User::factory()->create(['role' => $role, 'is_active' => true]);
}

test('the list shows only paid orders ready for pickup, longest waiting first', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(20, 0);

    $newest = listReadyOrder($studentUser, $variant, 2);
    $oldest = listReadyOrder($studentUser, $variant, 20);
    $middle = listReadyOrder($studentUser, $variant, 9);

    listReadyOrder($studentUser, $variant, 20, ['fulfillment_status' => Order::FULFILLMENT_RELEASED]);
    listReadyOrder($studentUser, $variant, 20, ['fulfillment_status' => Order::FULFILLMENT_CANCELLED]);
    listReadyOrder($studentUser, $variant, 20, ['fulfillment_status' => Order::FULFILLMENT_PREPARING]);
    listReadyOrder($studentUser, $variant, 20, ['payment_status' => Order::PAYMENT_PENDING]);

    $this->actingAs(listStaff('cashier'))
        ->get('/cashier/unclaimed')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('cashier/Orders/Unclaimed')
            ->where('orders.total', 3)
            ->where('orders.data.0.id', $oldest->id)
            ->where('orders.data.1.id', $middle->id)
            ->where('orders.data.2.id', $newest->id)
            ->where('orders.data.0.days_waiting', 20)
            ->where('orders.data.0.total_quantity', 2)
            ->where('orders.data.0.order_url', "/cashier/orders/{$oldest->id}")
            ->where('summary.total', 3),
        );
});

test('specialists get the same list on their own page and links', function () {
    $studentUser = makeStudentAccount();
    $order = listReadyOrder($studentUser, makeVariantWithStock(20, 0), 8);

    $this->actingAs(listStaff('specialist'))
        ->get('/specialist/unclaimed')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('specialist/Orders/Unclaimed')
            ->where('orders.data.0.order_url', "/specialist/orders/{$order->id}")
            ->where('index_url', '/specialist/unclaimed'),
        );
});

test('the summary counts orders past each reminder milestone and the filter narrows the list', function () {
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(20, 0);

    listReadyOrder($studentUser, $variant, 3);
    listReadyOrder($studentUser, $variant, 8);
    listReadyOrder($studentUser, $variant, 15);
    listReadyOrder($studentUser, $variant, 40);

    $cashier = listStaff('cashier');

    $this->actingAs($cashier)->get('/cashier/unclaimed')
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 4)
            ->where('summary.over_7', 3)
            ->where('summary.over_14', 2)
            ->where('summary.over_30', 1));

    $this->actingAs($cashier)->get('/cashier/unclaimed?min_days=14')
        ->assertInertia(fn ($page) => $page
            ->where('orders.total', 2)
            ->where('filters.min_days', 14));

    $this->actingAs($cashier)->get('/cashier/unclaimed?min_days=5')
        ->assertInertia(fn ($page) => $page
            ->where('orders.total', 4)
            ->where('filters.min_days', null));
});

test('the ready time is shown in Philippine time', function () {
    $studentUser = makeStudentAccount();
    listReadyOrder($studentUser, makeVariantWithStock(20, 0), 1, [
        'ready_for_release_at' => now()->subDays(1)->utc()->setTime(2, 0),
    ]);

    $expected = now()->subDays(1)->utc()->setTime(2, 0)->timezone('Asia/Manila')->format('M d, Y h:i A');

    $this->actingAs(listStaff('cashier'))->get('/cashier/unclaimed')
        ->assertInertia(fn ($page) => $page->where('orders.data.0.ready_at', $expected));
});

test('only cashiers and specialists can open the unclaimed list', function (string $role, string $path) {
    $user = $role === 'student' ? makeStudentAccount() : listStaff($role);

    $this->actingAs($user)->get($path)->assertForbidden();
})->with([
    'student on cashier' => ['student', '/cashier/unclaimed'],
    'admin on cashier' => ['admin', '/cashier/unclaimed'],
    'student on specialist' => ['student', '/specialist/unclaimed'],
    'cashier on specialist' => ['cashier', '/specialist/unclaimed'],
    'specialist on cashier' => ['specialist', '/cashier/unclaimed'],
]);
