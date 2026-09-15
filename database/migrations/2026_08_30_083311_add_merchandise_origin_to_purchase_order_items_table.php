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
                    ->string(
                        'merchandise_origin',
                        20,
                    )
                    ->default(
                        'existing',
                    )
                    ->after(
                        'item_type',
                    );

                $table->index(
                    'merchandise_origin',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'purchase_order_items',
            function (Blueprint $table): void {
                $table->dropIndex([
                    'merchandise_origin',
                ]);

                $table->dropColumn(
                    'merchandise_origin',
                );
            },
        );
    }
};
