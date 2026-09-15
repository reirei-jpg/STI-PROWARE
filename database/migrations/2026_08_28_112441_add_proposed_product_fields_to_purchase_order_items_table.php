<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'purchase_order_items',
            function (Blueprint $table): void {
                $table
                    ->foreignId(
                        'proposed_category_id',
                    )
                    ->nullable()
                    ->after(
                        'manual_description',
                    )
                    ->constrained(
                        'categories',
                    )
                    ->nullOnDelete();

                $table
                    ->decimal(
                        'proposed_selling_price',
                        12,
                        2,
                    )
                    ->nullable()
                    ->after(
                        'proposed_category_id',
                    );
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'purchase_order_items',
            function (Blueprint $table): void {
                $table->dropForeign([
                    'proposed_category_id',
                ]);

                $table->dropColumn([
                    'proposed_category_id',
                    'proposed_selling_price',
                ]);
            },
        );
    }
};
