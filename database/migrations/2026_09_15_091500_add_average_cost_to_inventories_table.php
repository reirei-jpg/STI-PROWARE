<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Track a running weighted-average purchasing cost per
     * variant, updated every time new stock is received.
     *
     * This is separate from the selling price (Product/
     * ProductVariant), and separate from the one-off estimate
     * on `purchase_order_items.unit_cost`, which only reflects
     * what was planned at PO-creation time. This column reflects
     * what has actually been paid across every batch received
     * so far.
     */
    public function up(): void
    {
        Schema::table(
            'inventories',
            function (Blueprint $table): void {
                $table->decimal(
                    'average_cost',
                    12,
                    2,
                )
                    ->nullable()
                    ->after('reorder_level');
            },
        );
    }

    /**
     * Remove the average cost column.
     */
    public function down(): void
    {
        Schema::table(
            'inventories',
            function (Blueprint $table): void {
                $table->dropColumn(
                    'average_cost',
                );
            },
        );
    }
};
