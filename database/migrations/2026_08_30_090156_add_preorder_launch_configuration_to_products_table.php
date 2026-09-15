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
        Schema::table('products', function (Blueprint $table) {
            /*
            |--------------------------------------------------------------------------
            | Preorder Payment Window
            |--------------------------------------------------------------------------
            |
            | Number of hours a student has to complete payment after
            | their preorder becomes Ready.
            |
            */
            $table
                ->unsignedInteger('preorder_payment_deadline_hours')
                ->nullable()
                ->after('preorder_capacity');

            /*
            |--------------------------------------------------------------------------
            | Early-Bird Configuration
            |--------------------------------------------------------------------------
            |
            | First N eligible preorder slots may receive a discount.
            |
            */
            $table
                ->unsignedInteger('preorder_early_bird_slots')
                ->nullable()
                ->after('preorder_payment_deadline_hours');

            $table
                ->decimal('preorder_early_bird_discount_percent', 5, 2)
                ->nullable()
                ->after('preorder_early_bird_slots');

            /*
            |--------------------------------------------------------------------------
            | NEW / HOT Catalog Label
            |--------------------------------------------------------------------------
            |
            | Number of days the product keeps its temporary NEW/HOT
            | catalog label after the new merchandise is received.
            |
            */
            $table
                ->unsignedInteger('new_badge_duration_days')
                ->nullable()
                ->after('preorder_early_bird_discount_percent');

            $table
                ->timestamp('new_badge_started_at')
                ->nullable()
                ->after('new_badge_duration_days');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'preorder_payment_deadline_hours',
                'preorder_early_bird_slots',
                'preorder_early_bird_discount_percent',
                'new_badge_duration_days',
                'new_badge_started_at',
            ]);
        });
    }
};
