<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_order_items',
            function (
                Blueprint $table,
            ): void {
                $table->id();

                /*
                 * Parent purchase order.
                 */
                $table
                    ->foreignId(
                        'purchase_order_id',
                    )
                    ->constrained(
                        'purchase_orders',
                    )
                    ->cascadeOnDelete();

                /*
                 * Exact merchandise variant.
                 *
                 * Example:
                 * STI College Uniform
                 * BSIT / Medium
                 */
                $table
                    ->foreignId(
                        'product_variant_id',
                    )
                    ->constrained(
                        'product_variants',
                    )
                    ->restrictOnDelete();

                /*
                 * Quantity Admin ordered.
                 */
                $table
                    ->unsignedInteger(
                        'quantity_ordered',
                    );

                /*
                 * Quantity actually received
                 * so far.
                 */
                $table
                    ->unsignedInteger(
                        'quantity_received',
                    )
                    ->default(
                        0,
                    );

                /*
                 * Optional supplier/unit cost.
                 *
                 * This is PURCHASE COST,
                 * not selling price.
                 */
                $table
                    ->decimal(
                        'unit_cost',
                        12,
                        2,
                    )
                    ->nullable();

                $table->timestamps();

                /*
                 * Prevent the same variant
                 * appearing twice in one PO.
                 */
                $table->unique([
                    'purchase_order_id',
                    'product_variant_id',
                ]);
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_order_items',
        );
    }
};
