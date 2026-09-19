<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function dashboardTestCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function dashboardTestStudent(): User
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

function dashboardTestOrder(Student $student, User $creator, array $overrides = []): Order
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
    ], $overrides));
}

test('the waiting for payment list only shows pending orders, even when recent paid orders crowd them out', function () {
    $cashier = dashboardTestCashier();
    $studentUser = dashboardTestStudent();

    // Five recently-paid orders — under the old "5 most recent
    // overall, then filter client-side" query, these alone would
    // fill the entire list and hide the pending order below.
    for ($i = 0; $i < 5; $i++) {
        dashboardTestOrder($studentUser->student, $studentUser, [
            'payment_status' => Order::PAYMENT_PAID,
            'paid_at' => now(),
        ]);
    }

    $pendingOrder = dashboardTestOrder($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_PENDING,
    ]);

    $response = $this->actingAs($cashier)->get('/cashier/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Dashboard')
        ->where('pendingPayments', 1)
        ->where('pendingOrders.0.id', $pendingOrder->id)
        ->has('pendingOrders', 1),
    );
});

test('the waiting for payment list surfaces the longest-waiting order first', function () {
    $cashier = dashboardTestCashier();
    $studentUser = dashboardTestStudent();

    // created_at is not mass-assignable on Order, so it must be
    // set after creation for this ordering test to mean anything.
    $newerOrder = dashboardTestOrder($studentUser->student, $studentUser);
    $newerOrder->forceFill(['created_at' => now()->subMinutes(5)])->save();

    $olderOrder = dashboardTestOrder($studentUser->student, $studentUser);
    $olderOrder->forceFill(['created_at' => now()->subDays(3)])->save();

    $response = $this->actingAs($cashier)->get('/cashier/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Dashboard')
        ->where('pendingOrders.0.id', $olderOrder->id)
        ->where('pendingOrders.1.id', $newerOrder->id),
    );
});

test('the dashboard reports todays sales and the most recently confirmed payments', function () {
    // Midday in Manila, so "two hours ago" is still today whenever the suite runs.
    $this->travelTo(now('Asia/Manila')->startOfDay()->addHours(12)->utc());

    $cashier = dashboardTestCashier();
    $studentUser = dashboardTestStudent();

    $olderConfirmed = dashboardTestOrder($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_PAID,
    ]);
    $olderConfirmed->forceFill(['paid_at' => now()->subHours(2)])->save();

    $newerConfirmed = dashboardTestOrder($studentUser->student, $studentUser, [
        'payment_status' => Order::PAYMENT_PAID,
    ]);
    $newerConfirmed->forceFill(['paid_at' => now()])->save();

    $response = $this->actingAs($cashier)->get('/cashier/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Dashboard')
        ->where('todaySales.total', '200.00')
        ->where('todaySales.transactions', 2)
        ->where('recentlyConfirmed.0.id', $newerConfirmed->id)
        ->where('recentlyConfirmed.1.id', $olderConfirmed->id),
    );
});
