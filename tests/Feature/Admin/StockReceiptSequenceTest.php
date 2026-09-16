<?php

use App\Models\StockMovement;

/*
|--------------------------------------------------------------------------
| Receipt Number Sequencing
|--------------------------------------------------------------------------
|
| StockReceiptNumberGenerator previously relied on lockForUpdate()
| over existing rows to serialize sequence generation, which has
| nothing to lock on the very first receipt of a new day — a fixed
| pg_advisory_xact_lock now covers that case too. This proves normal,
| repeated receiving still produces correct, distinct, sequential
| receipt numbers.
*/

test('sequential receipts on the same day get distinct sequential receipt numbers', function () {
    $admin = poReceivingCostAdmin();
    $variant = poReceivingCostVariant($admin);
    $poItem = poReceivingCostItem($admin, $variant, 50.00);

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 5,
    ])->assertSessionDoesntHaveErrors();

    $this->actingAs($admin)->post('/staff/stock-receipts', [
        'purchase_order_id' => $poItem->purchase_order_id,
        'purchase_order_item_id' => $poItem->id,
        'quantity' => 5,
    ])->assertSessionDoesntHaveErrors();

    $receiptNumbers = StockMovement::query()
        ->where('movement_type', StockMovement::TYPE_RECEIVE)
        ->where('product_variant_id', $variant->id)
        ->orderBy('id')
        ->pluck('receipt_number')
        ->values();

    $today = now()->format('Ymd');

    expect($receiptNumbers->all())->toBe([
        "SR-{$today}-000001",
        "SR-{$today}-000002",
    ]);
});
