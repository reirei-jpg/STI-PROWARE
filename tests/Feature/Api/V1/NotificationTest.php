<?php

use App\Models\Notification;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

function apiNotificationAs(User $student): void
{
    Sanctum::actingAs($student, ['student']);
}

function apiNotificationFor(User $user, array $overrides = []): Notification
{
    $createdAt = $overrides['created_at'] ?? null;
    unset($overrides['created_at']);

    $notification = Notification::query()->create(array_merge([
        'user_id' => $user->id,
        'type' => Notification::TYPE_PAYMENT_CONFIRMED,
        'title' => 'Payment Confirmed',
        'message' => 'Your payment was confirmed.',
        'link' => '/student/orders/5',
        'read_at' => null,
    ], $overrides));

    if ($createdAt !== null) {
        Notification::query()->whereKey($notification->id)->update(['created_at' => $createdAt]);
    }

    return $notification->fresh();
}

test('the notification endpoints need a signed-in student', function () {
    $this->getJson('/api/v1/notifications')->assertUnauthorized();
    $this->patchJson('/api/v1/notifications/read-all')->assertUnauthorized();
    $this->patchJson('/api/v1/notifications/1/read')->assertUnauthorized();

    Sanctum::actingAs(User::factory()->create(['role' => User::ROLE_CASHIER, 'is_active' => true]), ['student']);

    $this->getJson('/api/v1/notifications')->assertUnauthorized();
});

test('a student with no notifications gets an empty list', function () {
    apiNotificationAs(makeStudentAccount());

    $this->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('data', [])
        ->assertJsonPath('unread_count', 0)
        ->assertJsonPath('meta.total', 0);
});

test('a student sees only their own notifications, newest first, with the unread count', function () {
    $student = makeStudentAccount();
    $older = apiNotificationFor($student, ['title' => 'Older', 'created_at' => now()->subHour()]);
    $newer = apiNotificationFor($student, ['title' => 'Newer', 'read_at' => now()]);
    apiNotificationFor(makeStudentAccount(), ['title' => 'Someone else']);

    apiNotificationAs($student);

    $this->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.0.is_read', true)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.1.is_read', false)
        ->assertJsonPath('data.1.title', 'Older')
        ->assertJsonPath('data.1.message', 'Your payment was confirmed.')
        ->assertJsonPath('unread_count', 1)
        ->assertJsonMissingPath('data.0.link');
});

test('the order a notification points at is sent as an order id', function () {
    $student = makeStudentAccount();
    apiNotificationFor($student, ['link' => '/student/orders/12', 'title' => 'Order']);
    apiNotificationFor($student, ['link' => '/student/orders/34/receipt', 'title' => 'Receipt']);
    apiNotificationFor($student, ['link' => '/staff/inventory', 'title' => 'Other']);
    apiNotificationFor($student, ['link' => null, 'title' => 'None']);

    apiNotificationAs($student);

    $ids = collect($this->getJson('/api/v1/notifications')->assertOk()->json('data'))
        ->pluck('order_id', 'title')
        ->all();

    expect($ids)->toBe([
        'None' => null,
        'Other' => null,
        'Receipt' => 34,
        'Order' => 12,
    ]);
});

test('notification times are shown in Manila time', function () {
    $student = makeStudentAccount();
    apiNotificationFor($student, ['created_at' => '2026-09-01 00:30:00']);
    apiNotificationAs($student);

    $this->getJson('/api/v1/notifications')
        ->assertJsonPath('data.0.created_at_full', 'Sep 01, 2026 08:30 AM');
});

test('notifications come in pages and the unread count covers every page', function () {
    $student = makeStudentAccount();

    foreach (range(1, 20) as $number) {
        apiNotificationFor($student, ['title' => "Notification {$number}"]);
    }

    apiNotificationAs($student);

    $this->getJson('/api/v1/notifications')
        ->assertJsonCount(15, 'data')
        ->assertJsonPath('meta.total', 20)
        ->assertJsonPath('meta.last_page', 2)
        ->assertJsonPath('unread_count', 20);

    $this->getJson('/api/v1/notifications?page=2')
        ->assertJsonCount(5, 'data')
        ->assertJsonPath('meta.current_page', 2);
});

test('opening a notification marks it read and returns the order it points at', function () {
    $student = makeStudentAccount();
    $notification = apiNotificationFor($student, ['link' => '/student/orders/9']);
    apiNotificationFor($student);
    apiNotificationAs($student);

    $this->patchJson("/api/v1/notifications/{$notification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.id', $notification->id)
        ->assertJsonPath('data.is_read', true)
        ->assertJsonPath('data.order_id', 9)
        ->assertJsonPath('unread_count', 1);

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('reading a notification twice keeps the first read time', function () {
    $student = makeStudentAccount();
    $notification = apiNotificationFor($student);
    apiNotificationAs($student);

    $this->patchJson("/api/v1/notifications/{$notification->id}/read")->assertOk();
    $firstRead = $notification->fresh()->read_at;

    $this->travel(5)->minutes();

    $this->patchJson("/api/v1/notifications/{$notification->id}/read")->assertOk();

    expect($notification->fresh()->read_at->equalTo($firstRead))->toBeTrue();
});

test('a student cannot read someone elses notification', function () {
    $owner = makeStudentAccount();
    $notification = apiNotificationFor($owner);

    apiNotificationAs(makeStudentAccount());

    $this->patchJson("/api/v1/notifications/{$notification->id}/read")->assertForbidden();

    expect($notification->fresh()->read_at)->toBeNull();
});

test('mark all read touches only the students own notifications', function () {
    $student = makeStudentAccount();
    $other = makeStudentAccount();
    apiNotificationFor($student);
    apiNotificationFor($student);
    $strangers = apiNotificationFor($other);

    apiNotificationAs($student);

    $this->patchJson('/api/v1/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('unread_count', 0);

    expect($student->prowareNotifications()->whereNull('read_at')->count())->toBe(0)
        ->and($strangers->fresh()->read_at)->toBeNull();
});
