<?php

namespace App\Http\Controllers\Staff;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdjustInventoryRequest;
use App\Models\Inventory;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Services\AuditLogger;
use App\Services\StockAlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryAdjustmentController extends Controller
{
    /**
     * Record a manual inventory adjustment.
     *
     * This is the only way to change quantity_on_hand outside of
     * a purchase-order receipt, a sale, or a release. It is
     * deliberately Admin-only and requires a written reason,
     * since — unlike a purchase-order receipt — it has no
     * supplier document behind it.
     */
    public function store(
        AdjustInventoryRequest $request,
        StockAlertService $stockAlertService,
    ): RedirectResponse {
        $validated = $request->validated();

        $signedChange =
            $validated['direction'] === 'increase'
                ? (int) $validated['quantity']
                : -(int) $validated['quantity'];

        $result = DB::transaction(function () use ($request, $validated, $signedChange): array {
            $variant = ProductVariant::query()
                ->with(['product:id,code,name'])
                ->whereKey($validated['product_variant_id'])
                ->first();

            if (! $variant) {
                throw ValidationException::withMessages([
                    'product_variant_id' => 'The selected product variant is unavailable.',
                ]);
            }

            $inventory = Inventory::query()
                ->where('product_variant_id', $variant->id)
                ->lockForUpdate()
                ->first();

            if (! $inventory) {
                throw ValidationException::withMessages([
                    'product_variant_id' => 'The selected product variant has no inventory record.',
                ]);
            }

            $quantityBefore = (int) $inventory->quantity_on_hand;
            $quantityAfter = $quantityBefore + $signedChange;

            if ($quantityAfter < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Only {$quantityBefore} unit(s) are on hand. This adjustment would take the quantity below zero.",
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Update Inventory
            |--------------------------------------------------------------------------
            |
            | An adjustment corrects a count — it is not a purchase,
            | so it never touches the weighted-average cost.
            */

            $inventory->update([
                'quantity_on_hand' => $quantityAfter,
            ]);

            $stockMovement = StockMovement::create([
                'receipt_number' => null,
                'inventory_id' => $inventory->id,
                'product_variant_id' => $variant->id,
                'performed_by' => $request->user()->id,
                'movement_type' => StockMovement::TYPE_ADJUSTMENT,
                'quantity_change' => $signedChange,
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'supplier_reference_number' => null,
                'notes' => $validated['reason'],
            ]);

            return [
                'stock_movement_id' => $stockMovement->id,
                'inventory_id' => $inventory->id,
                'product_code' => $variant->product->code,
                'product_name' => $variant->product->name,
                'quantity_before' => $quantityBefore,
                'quantity_after' => $quantityAfter,
                'signed_change' => $signedChange,
            ];
        }, attempts: 3);

        $stockMovement = StockMovement::query()->findOrFail($result['stock_movement_id']);

        AuditLogger::log(
            request: $request,
            action: 'inventory_adjusted',
            module: 'inventory',
            description: "Adjusted {$result['product_code']} — {$result['product_name']} by "
                .($result['signed_change'] > 0 ? '+' : '')
                ."{$result['signed_change']} unit(s). Reason: {$validated['reason']}",
            subject: $stockMovement,
            oldValues: ['quantity_on_hand' => $result['quantity_before']],
            newValues: [
                'quantity_on_hand' => $result['quantity_after'],
                'reason' => $validated['reason'],
            ],
        );

        $updatedInventory = Inventory::query()
            ->with(['productVariant.product'])
            ->findOrFail($result['inventory_id']);

        $stockAlertService->check($updatedInventory);

        return back()->with(
            'success',
            "Inventory adjusted for {$result['product_code']} — {$result['product_name']}. "
            ."New quantity on hand: {$result['quantity_after']}.",
        );
    }
}
