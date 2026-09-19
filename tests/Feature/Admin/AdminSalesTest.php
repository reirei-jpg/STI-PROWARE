<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function adminSalesTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function adminSalesTestStudent(): User
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

function adminSalesTestPaidOrder(Student $student, User $creator, float $total, $paidAt): Order
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
    ]);

    // paid_at is not mass-assignable, so it must be forced after create.
    $order->forceFill(['paid_at' => $paidAt])->save();

    return $order->fresh();
}

test('sales today uses philippine day boundaries so it matches the cashier and dashboard figures', function () {
    $admin = adminSalesTestAdmin();
    $studentUser = adminSalesTestStudent();

    // 2:00 AM Manila time is still "yesterday" in UTC (PH is UTC+8), so a
    // naive UTC whereDate('paid_at', now()->toDateString()) would miss it.
    $paidAt = now('Asia/Manila')->startOfDay()->addHours(2)->utc();

    adminSalesTestPaidOrder($studentUser->student, $studentUser, 250.00, $paidAt);

    // Yesterday's sale should not count toward "today".
    adminSalesTestPaidOrder($studentUser->student, $studentUser, 999.00, now('Asia/Manila')->subDay()->utc());

    $response = $this->actingAs($admin)->get('/admin/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Sales/Index')
        ->where('summary.today_sales', '250.00'),
    );
});

test('sales this month uses philippine month boundaries', function () {
    $admin = adminSalesTestAdmin();
    $studentUser = adminSalesTestStudent();

    adminSalesTestPaidOrder($studentUser->student, $studentUser, 500.00, now('Asia/Manila')->utc());

    // Last month's sale should not count toward "this month".
    adminSalesTestPaidOrder($studentUser->student, $studentUser, 777.00, now('Asia/Manila')->subMonth()->utc());

    $response = $this->actingAs($admin)->get('/admin/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Sales/Index')
        ->where('summary.month_sales', '500.00'),
    );
});

test('the sales transactions list is capped to the 5 most recent as a quick-glance shortcut', function () {
    $admin = adminSalesTestAdmin();
    $studentUser = adminSalesTestStudent();

    for ($i = 0; $i < 7; $i++) {
        adminSalesTestPaidOrder($studentUser->student, $studentUser, 100.00, now('Asia/Manila')->utc());
    }

    $response = $this->actingAs($admin)->get('/admin/sales');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Sales/Index')
        ->has('transactions', 5)
        ->where('summary.paid_orders', 7),
    );
});
