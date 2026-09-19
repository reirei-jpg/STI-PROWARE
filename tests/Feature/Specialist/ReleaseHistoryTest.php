<?php

use App\Models\Order;
use Carbon\CarbonImmutable;

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

test('release history today, week and month boundaries follow the Philippine calendar', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    // Saturday 19 Sep 2026, 18:00 in Manila.
    $this->travelTo(CarbonImmutable::parse('2026-09-19 10:00:00', 'UTC'));

    $release = fn (string $utcTime): Order => makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => CarbonImmutable::parse($utcTime, 'UTC'),
    ]);

    // 19 Sep 01:00 Manila (still 18 Sep in UTC): today, this week, this month.
    $todayOrder = $release('2026-09-18 17:00:00');
    // 18 Sep 23:00 Manila: yesterday, still this week and month.
    $yesterdayOrder = $release('2026-09-18 15:00:00');
    // 14 Sep 01:00 Manila, Monday (still Sunday in UTC): first moment of this week.
    $mondayOrder = $release('2026-09-13 17:00:00');
    // 13 Sep 23:00 Manila, Sunday: last week, this month.
    $lastWeekOrder = $release('2026-09-13 15:00:00');
    // 1 Sep 01:00 Manila (still 31 Aug in UTC): first moment of this month.
    $monthStartOrder = $release('2026-08-31 17:00:00');
    // 31 Aug 23:00 Manila: last month.
    $release('2026-08-31 15:00:00');

    $idsFor = function (string $date) use ($specialist): array {
        $ids = [];

        $this->actingAs($specialist)
            ->get('/specialist/releases?date='.$date)
            ->assertOk()
            ->assertInertia(function ($page) use (&$ids) {
                $ids = collect($page->toArray()['props']['orders']['data'])
                    ->pluck('id')->sort()->values()->all();
            });

        return $ids;
    };

    $sorted = fn (Order ...$orders): array => collect($orders)->pluck('id')->sort()->values()->all();

    expect($idsFor('today'))->toBe($sorted($todayOrder))
        ->and($idsFor('week'))->toBe($sorted($todayOrder, $yesterdayOrder, $mondayOrder))
        ->and($idsFor('month'))->toBe($sorted($todayOrder, $yesterdayOrder, $mondayOrder, $lastWeekOrder, $monthStartOrder));

    $this->actingAs($specialist)
        ->get('/specialist/releases')
        ->assertInertia(fn ($page) => $page
            ->where('summary.total', 6)
            ->where('summary.today', 1)
            ->where('summary.week', 3),
        );
});
