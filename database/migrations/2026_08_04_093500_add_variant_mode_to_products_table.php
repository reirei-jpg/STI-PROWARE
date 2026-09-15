<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the field that tells PROWARE how a product
     * should be divided into variants.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('variant_mode', 30)
                ->default('size_only');

            $table->index(
                'variant_mode',
                'products_variant_mode_index',
            );
        });
    }

    /**
     * Reverse the variant-mode change.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(
                'products_variant_mode_index',
            );

            $table->dropColumn('variant_mode');
        });
    }
};
