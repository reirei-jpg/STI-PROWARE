<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Str;

function reportsMergeAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function reportsMergeStudent(): Student
{
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    return Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);
}

function reportsMergePaidOrder(Student $student, User $creator, Carbon $paidAtUtc, float $total): Order
{
    return Order::query()->create([
        'order_number' => 'ORD-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $creator->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => $total,
        'total' => $total,
        'qr_token' => Str::random(24),
        'release_qr_token' => Str::random(24),
        'paid_at' => $paidAtUtc,
    ]);
}

afterEach(function () {
    Carbon::setTestNow();
});

test('the merged reports page renders both former Reports and Analytics data', function () {
    $admin = reportsMergeAdmin();

    $response = $this->actingAs($admin)->get('/admin/reports');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Reports/Index')
        ->has('summary.total_sales')
        ->has('summary.average_order_value')
        ->has('summary.fulfillment_rate')
        ->has('summary.units_sold')
        ->has('summary.total_stock_received')
        ->has('inventoryHealth.in_stock')
        ->has('salesTrend')
        ->has('topSellingProducts')
        ->has('salesByVariant')
        ->has('recentOrders')
        ->has('recentReceipts'),
    );
});

test('the default period is Overall, not the current month, so old sales are still visible', function () {
    $admin = reportsMergeAdmin();
    $student = reportsMergeStudent();

    // "Now" is October 2026. This order is from months earlier and
    // would be excluded if the default period were still "This Month".
    Carbon::setTestNow(
        Carbon::parse('2026-10-05 04:00:00', 'UTC'),
    );

    reportsMergePaidOrder(
        $student,
        $admin,
        Carbon::parse('2026-08-30 15:23:47', 'UTC'),
        1200.00,
    );

    // No ?period query string at all — the page's own default.
    $response = $this->actingAs($admin)->get('/admin/reports');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Reports/Index')
        ->where('filters.period', 'overall')
        ->where('periodLabel', 'All Time')
        ->where('summary.paid_orders', 1)
        ->where('summary.total_sales', 1200)
        ->where('salesTrend.0.sales', 1200),
    );
});

test('visiting the old analytics url redirects to the merged reports page', function () {
    $admin = reportsMergeAdmin();

    $response = $this->actingAs($admin)->get('/admin/analytics');

    $response->assertRedirect('/admin/reports');
});

test('a non-admin cannot view the reports page', function () {
    $specialist = User::factory()->create([
        'role' => 'specialist',
        'is_active' => true,
    ]);

    $this->actingAs($specialist)->get('/admin/reports')->assertForbidden();
});

test('"today" is resolved using the Philippine calendar day, not the raw UTC date', function () {
    $admin = reportsMergeAdmin();
    $student = reportsMergeStudent();

    // "Now" is 2026-01-15, 10:00 AM in Manila (UTC+8) = 2026-01-15 02:00 UTC.
    Carbon::setTestNow(
        Carbon::parse('2026-01-15 02:00:00', 'UTC'),
    );

    // This order was paid at 2026-01-14 17:00 UTC, which is
    // 2026-01-15 01:00 AM in Manila — "today" in Manila terms,
    // even though its raw UTC date is still "yesterday".
    // A bare now()->startOfDay() (UTC) would have excluded this
    // order from "today"; the Manila-aware resolver must include it.
    $order = reportsMergePaidOrder(
        $student,
        $admin,
        Carbon::parse('2026-01-14 17:00:00', 'UTC'),
        750.00,
    );

    $response = $this->actingAs($admin)->get('/admin/reports?period=today');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Reports/Index')
        ->where('summary.paid_orders', 1)
        ->where('summary.total_sales', 750),
    );

    expect($order->payment_status)->toBe(Order::PAYMENT_PAID);
});

test('an order paid earlier the same UTC calendar day but a different Manila day is excluded from today', function () {
    $admin = reportsMergeAdmin();
    $student = reportsMergeStudent();

    // "Now" is 2026-01-15, 10:00 AM in Manila = 2026-01-15 02:00 UTC.
    Carbon::setTestNow(
        Carbon::parse('2026-01-15 02:00:00', 'UTC'),
    );

    // Paid at 2026-01-14 10:00 UTC = 2026-01-14 06:00 PM Manila —
    // genuinely "yesterday" in Manila terms, so it must NOT be
    // counted in "today"'s totals.
    reportsMergePaidOrder(
        $student,
        $admin,
        Carbon::parse('2026-01-14 10:00:00', 'UTC'),
        500.00,
    );

    $response = $this->actingAs($admin)->get('/admin/reports?period=today');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Reports/Index')
        ->where('summary.paid_orders', 0)
        ->where('summary.total_sales', 0),
    );
});
