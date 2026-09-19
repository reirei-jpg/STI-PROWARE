<?php

use App\Models\AuditLog;
use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Str;

function auditLogTestAdmin(): User
{
    return User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
    ]);
}

function auditLogTestEntry(User $actor, $createdAt): AuditLog
{
    $log = AuditLog::create([
        'user_id' => $actor->id,
        'actor_name' => $actor->name,
        'actor_email' => $actor->email,
        'actor_role' => $actor->role,
        'action' => 'updated',
        'module' => 'users',
        'description' => 'Test audit entry',
    ]);

    // created_at is not mass-assignable, so it must be forced after create.
    $log->forceFill(['created_at' => $createdAt])->save();

    return $log->fresh();
}

function auditLogTestOrder(): Order
{
    $user = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $user->id,
        'student_id' => (string) fake()->unique()->numerify('###########'),
        'course' => 'BSIT',
        'year_level' => '1',
        'status' => 'active',
    ]);

    return Order::query()->create([
        'order_number' => 'ORD-TEST-'.Str::random(10),
        'student_id' => $student->id,
        'created_by' => $user->id,
        'source' => Order::SOURCE_STUDENT_APP,
        'order_type' => Order::TYPE_ORDER,
        'payment_status' => Order::PAYMENT_PAID,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
        'subtotal' => '250.00',
        'total' => '250.00',
        'qr_token' => Str::random(64),
    ]);
}

test('a non-admin cannot view the audit logs page', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'is_active' => true,
    ]);

    $response = $this->actingAs($student)->get('/admin/audit-logs');

    $response->assertForbidden();
});

test('the today and this week summary cards use philippine day and week boundaries', function () {
    $admin = auditLogTestAdmin();
    $otherStaff = auditLogTestAdmin();

    // 2:00 AM Manila time is still "yesterday" in UTC (PH is UTC+8), so a
    // naive UTC whereDate('created_at', now()->toDateString()) would miss it.
    $todayPaidAt = now('Asia/Manila')->startOfDay()->addHours(2)->utc();

    auditLogTestEntry($admin, $todayPaidAt);
    auditLogTestEntry($otherStaff, $todayPaidAt);

    // Outside this week entirely — should not count toward "This Week".
    auditLogTestEntry($admin, now('Asia/Manila')->subWeeks(2)->utc());

    $response = $this->actingAs($admin)->get('/admin/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/AuditLogs/Index')
        ->where('summary.today', 2)
        ->where('summary.this_week', 2)
        ->where('summary.active_staff_today', 2),
    );
});

test('a users-module log links to the account, but ip address and user agent are gone', function () {
    $admin = auditLogTestAdmin();
    $targetUser = auditLogTestAdmin();

    $log = AuditLog::create([
        'user_id' => $admin->id,
        'actor_name' => $admin->name,
        'actor_email' => $admin->email,
        'actor_role' => $admin->role,
        'action' => 'deactivated',
        'module' => 'users',
        'description' => 'Test audit entry',
        'subject_type' => User::class,
        'subject_id' => $targetUser->id,
    ]);

    $response = $this->actingAs($admin)->get('/admin/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/AuditLogs/Index')
        ->where('logs.data.0.related_record_url', "/admin/users/{$targetUser->id}/edit")
        ->where('logs.data.0.subject_summary.name', $targetUser->name)
        ->where('logs.data.0.subject_summary.email', $targetUser->email)
        ->missing('logs.data.0.ip_address')
        ->missing('logs.data.0.user_agent'),
    );

    expect($log->getAttributes())
        ->not->toHaveKey('ip_address')
        ->not->toHaveKey('user_agent');
});

test('an orders-module log carries a quick order preview for the related record popup', function () {
    $admin = auditLogTestAdmin();
    $order = auditLogTestOrder();

    AuditLog::create([
        'user_id' => $admin->id,
        'actor_name' => $admin->name,
        'actor_email' => $admin->email,
        'actor_role' => $admin->role,
        'action' => 'payment_confirmed',
        'module' => 'orders',
        'description' => 'Test audit entry',
        'subject_type' => Order::class,
        'subject_id' => $order->id,
    ]);

    $response = $this->actingAs($admin)->get('/admin/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/AuditLogs/Index')
        ->where('logs.data.0.related_record_url', "/admin/orders/{$order->id}")
        ->where('logs.data.0.subject_summary.order_number', $order->order_number)
        ->where('logs.data.0.subject_summary.total', '250.00'),
    );
});

test('a module without a dedicated admin page gets no related record link', function () {
    $admin = auditLogTestAdmin();

    AuditLog::create([
        'user_id' => $admin->id,
        'actor_name' => $admin->name,
        'actor_email' => $admin->email,
        'actor_role' => $admin->role,
        'action' => 'inventory_adjusted',
        'module' => 'inventory',
        'description' => 'Test audit entry',
        'subject_id' => 1,
    ]);

    $response = $this->actingAs($admin)->get('/admin/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/AuditLogs/Index')
        ->where('logs.data.0.related_record_url', null),
    );
});

test('the card details give a module breakdown and the active staff list for today', function () {
    $admin = auditLogTestAdmin();
    $cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
    ]);

    $todayUtc = now('Asia/Manila')->utc();

    auditLogTestEntry($admin, $todayUtc);

    AuditLog::create([
        'user_id' => $cashier->id,
        'actor_name' => $cashier->name,
        'actor_email' => $cashier->email,
        'actor_role' => $cashier->role,
        'action' => 'payment_confirmed',
        'module' => 'orders',
        'description' => 'Test audit entry',
    ])->forceFill(['created_at' => $todayUtc])->save();

    $response = $this->actingAs($admin)->get('/admin/audit-logs');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('admin/AuditLogs/Index')
        ->has('cardDetails.total.module_breakdown', 2)
        ->has('cardDetails.today.module_breakdown', 2)
        ->has('cardDetails.this_week.daily_breakdown', 7)
        ->has('cardDetails.active_staff_today.staff', 2),
    );
});
