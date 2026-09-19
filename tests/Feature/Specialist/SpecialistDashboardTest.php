<?php

use App\Models\Order;
use App\Models\PurchaseOrder;
use Carbon\CarbonImmutable;

function specialistDashboardMakePurchaseOrder(string $status, ?string $archivedAt = null): PurchaseOrder
{
    static $counter = 0;
    $counter++;

    return PurchaseOrder::query()->create([
        'po_number' => 'PO-SPDASH-'.$counter.'-'.fake()->unique()->numerify('######'),
        'supplier_name' => 'Test Supplier',
        'status' => $status,
        'created_by' => makeSpecialist()->id,
        'archived_at' => $archivedAt,
    ]);
}

test('the specialist dashboard reports the queue, stock and delivery numbers', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();

    // Three units on hand, none reserved, reorder level 5 => low stock.
    makeVariantWithStock(3, 0);
    // Fully reserved => nothing available => out of stock.
    makeVariantWithStock(4, 4);
    // Plenty available => neither.
    $healthyVariant = makeVariantWithStock(50, 0);

    makePaidOrderWithItem($studentUser->student, $studentUser, $healthyVariant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_READY,
    ]);
    makePaidOrderWithItem($studentUser->student, $studentUser, $healthyVariant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_READY,
    ]);
    makePaidOrderWithItem($studentUser->student, $studentUser, $healthyVariant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
    ]);
    makePaidOrderWithItem($studentUser->student, $studentUser, $healthyVariant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => now(),
    ]);
    makePaidOrderWithItem($studentUser->student, $studentUser, $healthyVariant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_CANCELLED,
    ]);
    makePaidOrderWithItem($studentUser->student, $studentUser, $healthyVariant, 1, [
        'payment_status' => Order::PAYMENT_PENDING,
        'fulfillment_status' => Order::FULFILLMENT_PENDING,
    ]);

    specialistDashboardMakePurchaseOrder(PurchaseOrder::STATUS_ORDERED);
    specialistDashboardMakePurchaseOrder(PurchaseOrder::STATUS_PARTIALLY_RECEIVED);
    specialistDashboardMakePurchaseOrder(PurchaseOrder::STATUS_DRAFT);
    specialistDashboardMakePurchaseOrder(PurchaseOrder::STATUS_COMPLETED);
    specialistDashboardMakePurchaseOrder(PurchaseOrder::STATUS_ORDERED, now()->toDateTimeString());

    $this->actingAs($specialist)
        ->get('/specialist/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('specialist/Dashboard')
            ->where('stats.ready_for_release', 2)
            ->where('stats.to_prepare', 1)
            ->where('stats.released_today', 1)
            ->where('stats.low_stock', 1)
            ->where('stats.out_of_stock', 1)
            ->where('stats.deliveries_expected', 2),
        );
});

test('released today follows the Philippine day, not the UTC day', function () {
    $specialist = makeSpecialist();
    $studentUser = makeStudentAccount();
    $variant = makeVariantWithStock(10, 0);

    // 2026-09-19 10:00 UTC is 18:00 in Manila, still 19 September there.
    $this->travelTo(CarbonImmutable::parse('2026-09-19 10:00:00', 'UTC'));

    // 2026-09-18 17:00 UTC is 2026-09-19 01:00 Manila: today for the cashier,
    // even though the UTC calendar date is yesterday.
    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => CarbonImmutable::parse('2026-09-18 17:00:00', 'UTC'),
    ]);

    // 2026-09-18 15:00 UTC is 2026-09-18 23:00 Manila: yesterday.
    makePaidOrderWithItem($studentUser->student, $studentUser, $variant, 1, [
        'fulfillment_status' => Order::FULFILLMENT_RELEASED,
        'released_at' => CarbonImmutable::parse('2026-09-18 15:00:00', 'UTC'),
    ]);

    $this->actingAs($specialist)
        ->get('/specialist/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('stats.released_today', 1));
});

test('a student cannot open the specialist dashboard', function () {
    $studentUser = makeStudentAccount();

    $this->actingAs($studentUser)
        ->get('/specialist/dashboard')
        ->assertForbidden();
});
