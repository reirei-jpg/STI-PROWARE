<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\Notification;
use App\Models\ProductVariant;

class StockAlertService
{
    public function __construct(
        private readonly NotificationService $notificationService,
    ) {}

    /**
     * Check one inventory record and send alerts when needed.
     */
    public function check(
        Inventory $inventory,
    ): void {
        $inventory->loadMissing([
            'productVariant.product',
        ]);

        $variant =
            $inventory->productVariant;

        if (! $variant) {
            return;
        }

        $product =
            $variant->product;

        if (! $product) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Current Inventory Values
        |--------------------------------------------------------------------------
        */

        $quantityOnHand =
            (int)
            $inventory->quantity_on_hand;

        $quantityReserved =
            (int)
            $inventory->quantity_reserved;

        $availableQuantity =
            max(
                0,
                $quantityOnHand
                - $quantityReserved,
            );

        $reorderLevel =
            (int)
            $inventory->reorder_level;

        /*
        |--------------------------------------------------------------------------
        | Product / Variant Labels
        |--------------------------------------------------------------------------
        */

        $productLabel =
            "{$product->code} — {$product->name}";

        $variantLabel =
            $this->variantLabel(
                $variant,
            );

        /*
        |--------------------------------------------------------------------------
        | OUT OF STOCK
        |--------------------------------------------------------------------------
        */

        if (
            $availableQuantity <= 0
        ) {
            $this->sendOutOfStockAlert(
                inventory: $inventory,

                productLabel: $productLabel,

                variantLabel: $variantLabel,

                reorderLevel: $reorderLevel,
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | RESTOCK THRESHOLD
        |--------------------------------------------------------------------------
        |
        | Alert when:
        |
        | available_quantity <= reorder_level
        |
        */

        if (
            $reorderLevel > 0
            &&
            $availableQuantity
            <=
            $reorderLevel
        ) {
            $this->sendThresholdAlert(
                inventory: $inventory,

                productLabel: $productLabel,

                variantLabel: $variantLabel,

                availableQuantity: $availableQuantity,

                reorderLevel: $reorderLevel,
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Inventory Healthy Again
        |--------------------------------------------------------------------------
        |
        | If stock was previously low/out-of-stock and is now above
        | the reorder threshold, remove stale unread stock alerts.
        |
        | This allows a new alert to be generated if stock later
        | crosses the threshold again.
        |
        */

        $this->clearOpenStockAlerts(
            $inventory,
        );
    }

    /**
     * Send restock-threshold alerts.
     */
    private function sendThresholdAlert(
        Inventory $inventory,
        string $productLabel,
        string $variantLabel,
        int $availableQuantity,
        int $reorderLevel,
    ): void {
        /*
        |--------------------------------------------------------------------------
        | Prevent Duplicate Threshold Alerts
        |--------------------------------------------------------------------------
        */

        if (
            $this->hasOpenAlert(
                inventory: $inventory,

                type: Notification::TYPE_LOW_STOCK,
            )
        ) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Remove Old Out-Of-Stock Alerts
        |--------------------------------------------------------------------------
        |
        | If stock was previously zero but has now increased while
        | still remaining under the threshold, the out-of-stock
        | state is no longer current.
        |
        */

        $this->clearAlertType(
            inventory: $inventory,

            type: Notification::TYPE_OUT_OF_STOCK,
        );

        $title =
            'Restock Threshold Reached';

        $message =
            "{$productLabel} ({$variantLabel}) "
            ."has {$availableQuantity} available unit(s) remaining. "
            ."Restock threshold: {$reorderLevel} unit(s).";

        $data = [
            'inventory_id' => $inventory->id,

            'product_variant_id' => $inventory
                ->product_variant_id,

            'available_quantity' => $availableQuantity,

            'reorder_level' => $reorderLevel,

            'quantity_on_hand' => (int)
                $inventory
                    ->quantity_on_hand,

            'quantity_reserved' => (int)
                $inventory
                    ->quantity_reserved,
        ];

        /*
        |--------------------------------------------------------------------------
        | Notify Admin
        |--------------------------------------------------------------------------
        */

        $this
            ->notificationService
            ->admins(
                type: Notification::TYPE_LOW_STOCK,

                title: $title,

                message: $message,

                link: '/staff/inventory',

                data: $data,
            );

        /*
        |--------------------------------------------------------------------------
        | Notify Specialist
        |--------------------------------------------------------------------------
        */

        $this
            ->notificationService
            ->specialists(
                type: Notification::TYPE_LOW_STOCK,

                title: $title,

                message: $message,

                link: '/staff/inventory',

                data: $data,
            );
    }

    /**
     * Send out-of-stock alerts.
     */
    private function sendOutOfStockAlert(
        Inventory $inventory,
        string $productLabel,
        string $variantLabel,
        int $reorderLevel,
    ): void {
        /*
        |--------------------------------------------------------------------------
        | Prevent Duplicate Out-Of-Stock Alerts
        |--------------------------------------------------------------------------
        */

        if (
            $this->hasOpenAlert(
                inventory: $inventory,

                type: Notification::TYPE_OUT_OF_STOCK,
            )
        ) {
            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Remove Previous Low Stock Alert
        |--------------------------------------------------------------------------
        */

        $this->clearAlertType(
            inventory: $inventory,

            type: Notification::TYPE_LOW_STOCK,
        );

        $title =
            'Out of Stock';

        $message =
            "{$productLabel} ({$variantLabel}) "
            .'has no available stock remaining. '
            ."Restock threshold: {$reorderLevel} unit(s).";

        $data = [
            'inventory_id' => $inventory->id,

            'product_variant_id' => $inventory
                ->product_variant_id,

            'available_quantity' => 0,

            'reorder_level' => $reorderLevel,

            'quantity_on_hand' => (int)
                $inventory
                    ->quantity_on_hand,

            'quantity_reserved' => (int)
                $inventory
                    ->quantity_reserved,
        ];

        $this
            ->notificationService
            ->admins(
                type: Notification::TYPE_OUT_OF_STOCK,

                title: $title,

                message: $message,

                link: '/staff/inventory',

                data: $data,
            );

        $this
            ->notificationService
            ->specialists(
                type: Notification::TYPE_OUT_OF_STOCK,

                title: $title,

                message: $message,

                link: '/staff/inventory',

                data: $data,
            );
    }

    /**
     * Determine whether an active unread stock alert already exists
     * for this inventory item.
     */
    private function hasOpenAlert(
        Inventory $inventory,
        string $type,
    ): bool {
        return Notification::query()
            ->where(
                'type',
                $type,
            )
            ->whereNull(
                'read_at',
            )
            ->where(
                'data->inventory_id',
                $inventory->id,
            )
            ->exists();
    }

    /**
     * Mark one type of stock alert as read.
     */
    private function clearAlertType(
        Inventory $inventory,
        string $type,
    ): void {
        Notification::query()
            ->where(
                'type',
                $type,
            )
            ->whereNull(
                'read_at',
            )
            ->where(
                'data->inventory_id',
                $inventory->id,
            )
            ->update([
                'read_at' => now(),
            ]);
    }

    /**
     * Clear stale low-stock and out-of-stock alerts after restocking.
     */
    private function clearOpenStockAlerts(
        Inventory $inventory,
    ): void {
        Notification::query()
            ->whereIn(
                'type',
                [
                    Notification::TYPE_LOW_STOCK,
                    Notification::TYPE_OUT_OF_STOCK,
                ],
            )
            ->whereNull(
                'read_at',
            )
            ->where(
                'data->inventory_id',
                $inventory->id,
            )
            ->update([
                'read_at' => now(),
            ]);
    }

    /**
     * Build readable variant name.
     */
    private function variantLabel(
        ProductVariant $variant,
    ): string {
        if (
            filled(
                $variant->variant_name,
            )
        ) {
            return $variant
                ->variant_name;
        }

        $parts =
            array_filter([
                $variant->program,
                $variant->size,
            ]);

        if (
            $parts !== []
        ) {
            return implode(
                ' / ',
                $parts,
            );
        }

        return $variant->sku
            ?: 'Standard';
    }
}
