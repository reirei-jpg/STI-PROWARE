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
            function (
                Blueprint $table,
            ): void {
                /*
                 * Existing catalog variant
                 * is now optional because
                 * manual PO items may not
                 * exist in Products yet.
                 */
                $table
                    ->unsignedBigInteger(
                        'product_variant_id',
                    )
                    ->nullable()
                    ->change();

                $table
                    ->string(
                        'item_type',
                        20,
                    )
                    ->default(
                        'catalog',
                    )
                    ->after(
                        'purchase_order_id',
                    );

                $table
                    ->string(
                        'manual_name',
                        150,
                    )
                    ->nullable()
                    ->after(
                        'product_variant_id',
                    );

                $table
                    ->text(
                        'manual_description',
                    )
                    ->nullable()
                    ->after(
                        'manual_name',
                    );

                $table
                    ->string(
                        'manual_sku',
                        100,
                    )
                    ->nullable()
                    ->after(
                        'manual_description',
                    );

                $table
                    ->boolean(
                        'track_inventory',
                    )
                    ->default(
                        true,
                    )
                    ->after(
                        'manual_sku',
                    );
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'purchase_order_items',
            function (
                Blueprint $table,
            ): void {
                $table->dropColumn([
                    'item_type',
                    'manual_name',
                    'manual_description',
                    'manual_sku',
                    'track_inventory',
                ]);
            },
        );
    }
};
