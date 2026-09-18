<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function salesTestCashier(): User
{
    return User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);
}

function salesTestStudent(): User
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

function salesTestPaidOrder(Student $student, User $creator, float $total, $paidAt): Order
{
    $order = Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => number_format($total, 2, '.', ''),
        'total' => number_format($total, 2, '.', ''),
        'qr_token' => Str::random(64),
        'paid_at' => $paidAt,
    ]);

    // paid_at is not mass-assignable, so it must be forced after create.
    $order->forceFill(['paid_at' => $paidAt])->save();

    return $order->fresh();
}

test('a non-cashier cannot view the sales page', function () {
    $studentUser = salesTestStudent();

    $response = $this->actingAs($studentUser)->get('/cashier/sales');

    $response->assertForbidden();
});

test('the sales summary totals only include paid orders within each period', function () {
    $cashier = salesTestCashier();
    $studentUser = salesTestStudent();

    salesTestPaidOrder($studentUser->student, $studentUser, 500.00, now());
    salesTestPaidOrder($studentUser->student, $studentUser, 300.00, now());

    // Yesterday's sale should not count toward "today".
    salesTestPaidOrder($studentUser->student, $studentUser, 999.00, now()->subDay());

    $response = $this->actingAs($cashier)->get('/cashier/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Sales/Index')
        ->where('summary.today.total', '800.00')
        ->where('summary.today.transactions', 2),
    );
});

test('the sales trend shows a positive percentage when today beats yesterday', function () {
    $cashier = salesTestCashier();
    $studentUser = salesTestStudent();

    salesTestPaidOrder($studentUser->student, $studentUser, 1000.00, now());
    salesTestPaidOrder($studentUser->student, $studentUser, 500.00, now()->subDay());

    $response = $this->actingAs($cashier)->get('/cashier/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        // A whole-number trend serializes as an int over JSON.
        ->where('summary.today.trend', 100),
    );
});

test('a period with no prior sales to compare against reports no trend rather than a misleading percentage', function () {
    $cashier = salesTestCashier();
    $studentUser = salesTestStudent();

    salesTestPaidOrder($studentUser->student, $studentUser, 1000.00, now());

    $response = $this->actingAs($cashier)->get('/cashier/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('summary.today.trend', null),
    );
});

test('the daily breakdown groups sales by calendar day and reports the best day', function () {
    $cashier = salesTestCashier();
    $studentUser = salesTestStudent();

    salesTestPaidOrder($studentUser->student, $studentUser, 200.00, now());
    salesTestPaidOrder($studentUser->student, $studentUser, 300.00, now());
    salesTestPaidOrder($studentUser->student, $studentUser, 100.00, now()->subDay());

    $response = $this->actingAs($cashier)->get('/cashier/sales?group=day');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('cashier/Sales/Index')
        ->where('group', 'day')
        // Most recent day first.
        ->where('breakdown.0.transactions', 2)
        ->where('breakdown.0.total', '500.00')
        ->where('breakdown.1.transactions', 1)
        ->where('breakdown.1.total', '100.00')
        ->where('best.total', '500.00'),
    );
});

test('an invalid group parameter falls back to daily grouping instead of erroring', function () {
    $cashier = salesTestCashier();

    $response = $this->actingAs($cashier)->get('/cashier/sales?group=year');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('group', 'day'),
    );
});
