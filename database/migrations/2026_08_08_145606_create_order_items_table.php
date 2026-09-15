<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'order_items',
            function (Blueprint $table): void {
                $table->id();

                $table->foreignId(
                    'order_id',
                )
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->cascadeOnDelete();

                /*
                 * Keep the exact variant reference whenever
                 * the variant still exists.
                 */
                $table->foreignId(
                    'product_variant_id',
                )
                    ->constrained()
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                /*
                 * Snapshot values preserve what the student
                 * actually ordered, even if product data is
                 * changed later.
                 */
                $table->string(
                    'product_code',
                    50,
                );

                $table->string(
                    'product_name',
                );

                $table->string(
                    'variant_name',
                );

                $table->string(
                    'sku',
                    100,
                );

                $table->string(
                    'program',
                )->nullable();

                $table->string(
                    'size',
                )->nullable();

                /*
                 * order
                 * preorder
                 */
                $table->string(
                    'item_type',
                    30,
                );

                $table->unsignedInteger(
                    'quantity',
                );

                $table->decimal(
                    'unit_price',
                    12,
                    2,
                );

                $table->decimal(
                    'line_total',
                    12,
                    2,
                );

                $table->timestamps();

                $table->index(
                    [
                        'order_id',
                        'item_type',
                    ],
                    'order_items_order_type_index',
                );

                $table->index(
                    'product_variant_id',
                    'order_items_variant_index',
                );
            },
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'order_items',
        );
    }
};
