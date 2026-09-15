<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Freeze the purchasing cost onto each order item at the
     * moment of sale, the same way `unit_price` is already
     * frozen. This keeps historical profit figures accurate
     * even if the running average cost changes later.
     *
     * Nullable: older orders sold before this feature existed
     * have no recorded cost, and orders for merchandise that
     * never had a recorded purchasing price also won't have one.
     */
    public function up(): void
    {
        Schema::table(
            'order_items',
            function (Blueprint $table): void {
                $table->decimal(
                    'unit_cost',
                    12,
                    2,
                )
                    ->nullable()
                    ->after('unit_price');
            },
        );
    }

    /**
     * Remove the frozen cost column.
     */
    public function down(): void
    {
        Schema::table(
            'order_items',
            function (Blueprint $table): void {
                $table->dropColumn(
                    'unit_cost',
                );
            },
        );
    }
};
