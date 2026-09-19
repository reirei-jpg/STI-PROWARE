<?php

use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function adminDashboardTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function adminDashboardTestStudent(): User
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

function adminDashboardTestPaidOrder(Student $student, User $creator, float $total): Order
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

    $order->forceFill(['paid_at' => now()])->save();

    return $order->fresh();
}

test('the admin dashboard reports a single merged todays sales figure shared with the cashier side', function () {
    $admin = adminDashboardTestAdmin();
    $studentUser = adminDashboardTestStudent();

    adminDashboardTestPaidOrder($studentUser->student, $studentUser, 500.00);
    adminDashboardTestPaidOrder($studentUser->student, $studentUser, 300.00);

    $response = $this->actingAs($admin)->get('/admin/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Dashboard')
        ->where('todaySales.total', '800.00')
        ->where('todaySales.transactions', 2)
        ->missing('overview.today_sales')
        ->missing('overview.low_stock')
        ->missing('overview.out_of_stock')
        ->missing('transactions.paid_today')
        ->missing('transactions.released_today'),
    );
});

test('the stock alerts summary card is gone since Needs Attention already shows the same data in full', function () {
    $admin = adminDashboardTestAdmin();

    $response = $this->actingAs($admin)->get('/admin/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Dashboard')
        ->has('overview', fn ($overview) => $overview
            ->has('orders_today')
            ->has('active_products')
            ->has('total_available_stock')
            ->etc(),
        ),
    );
});

test('a super admin can also view the admin dashboard', function () {
    $superAdmin = User::factory()->create([
        'role' => 'super_admin',
        'is_active' => true,
    ]);

    $response = $this->actingAs($superAdmin)->get('/admin/dashboard');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/Dashboard'),
    );
});
