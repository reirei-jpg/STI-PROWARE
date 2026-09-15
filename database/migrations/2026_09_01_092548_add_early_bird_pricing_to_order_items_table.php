<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal(
                'original_unit_price',
                12,
                2,
            )->nullable();

            $table->decimal(
                'discount_percent',
                5,
                2,
            )->default(0);

            $table->decimal(
                'discount_amount',
                12,
                2,
            )->default(0);

            $table->boolean(
                'early_bird_applied',
            )->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn([
                'original_unit_price',
                'discount_percent',
                'discount_amount',
                'early_bird_applied',
            ]);
        });
    }
};
