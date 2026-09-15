<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Expand product variants so they can support:
     *
     * - program and size;
     * - size only;
     * - standard products without size.
     */
    public function up(): void
    {
        /*
         * The old constraint allows only one occurrence
         * of each size per product:
         *
         * product_id + size
         *
         * That does not support both:
         *
         * BSIT / Medium
         * BSTM / Medium
         *
         * under the same product.
         */
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique(
                'product_variants_product_id_size_unique',
            );
        });

        /*
         * Add the new variant fields as nullable first.
         *
         * They must remain nullable temporarily because existing
         * rows do not have values for these columns yet.
         */
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('program', 50)
                ->nullable()
                ->after('sku');

            $table->string('variant_name', 150)
                ->nullable()
                ->after('size');

            $table->string('variant_key', 100)
                ->nullable()
                ->after('variant_name');
        });

        /*
         * Non-sized items such as mugs and lanyards need
         * size = null, so the existing size column must
         * become nullable.
         */
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('size')
                ->nullable()
                ->change();
        });

        /*
         * Preserve all existing variant records.
         *
         * Existing records currently contain a size, so we use
         * that size as their first variant name and variant key.
         *
         * Examples:
         *
         * Small  -> variant_name = Small
         *        -> variant_key  = SMALL
         *
         * 2XL    -> variant_name = 2XL
         *        -> variant_key  = 2XL
         */
        DB::table('product_variants')
            ->orderBy('id')
            ->chunkById(100, function ($variants): void {
                foreach ($variants as $variant) {
                    $size = trim(
                        (string) ($variant->size ?? ''),
                    );

                    $variantName = $size !== ''
                        ? $size
                        : 'Standard';

                    $variantKey = $this->normalizeVariantKey(
                        $variantName,
                    );

                    if ($variantKey === '') {
                        $variantKey = 'VAR-'.$variant->id;
                    }

                    /*
                     * Protect against an unexpected normalized-key
                     * collision in old data.
                     */
                    $duplicateExists = DB::table('product_variants')
                        ->where('product_id', $variant->product_id)
                        ->where('id', '!=', $variant->id)
                        ->where('variant_key', $variantKey)
                        ->exists();

                    if ($duplicateExists) {
                        $variantKey .= '-'.$variant->id;
                    }

                    DB::table('product_variants')
                        ->where('id', $variant->id)
                        ->update([
                            'variant_name' => $variantName,
                            'variant_key' => $variantKey,
                        ]);
                }
            });

        /*
         * After every existing row has a value, these columns
         * can safely become required.
         */
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('variant_name', 150)
                ->nullable(false)
                ->change();

            $table->string('variant_key', 100)
                ->nullable(false)
                ->change();
        });

        /*
         * A variant key must be unique inside its product.
         *
         * Examples:
         *
         * Product 1 + BSIT-S
         * Product 1 + BSIT-M
         * Product 1 + BSTM-S
         * Product 2 + S
         * Product 2 + M
         * Product 3 + STD
         */
        Schema::table('product_variants', function (Blueprint $table) {
            $table->unique(
                [
                    'product_id',
                    'variant_key',
                ],
                'product_variants_product_variant_key_unique',
            );

            $table->index(
                [
                    'product_id',
                    'program',
                    'size',
                ],
                'product_variants_lookup_index',
            );
        });
    }

    /**
     * Reverse the variant changes.
     *
     * The rollback uses variant_key as the old size value.
     * This guarantees that every size remains unique per product
     * even if program-specific variants were already created.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique(
                'product_variants_product_variant_key_unique',
            );

            $table->dropIndex(
                'product_variants_lookup_index',
            );
        });

        /*
         * The previous table required a non-null, unique size
         * inside each product. Using variant_key guarantees that
         * rollback can preserve distinguishable values.
         */
        DB::table('product_variants')
            ->orderBy('id')
            ->chunkById(100, function ($variants): void {
                foreach ($variants as $variant) {
                    DB::table('product_variants')
                        ->where('id', $variant->id)
                        ->update([
                            'size' => $variant->variant_key,
                        ]);
                }
            });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('size')
                ->nullable(false)
                ->change();
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn([
                'program',
                'variant_name',
                'variant_key',
            ]);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->unique(
                [
                    'product_id',
                    'size',
                ],
                'product_variants_product_id_size_unique',
            );
        });
    }

    /**
     * Convert a display name into a stable internal key.
     *
     * Examples:
     *
     * "Medium"        -> "MEDIUM"
     * "BSIT / Medium" -> "BSIT-MEDIUM"
     * "2 XL"          -> "2-XL"
     */
    private function normalizeVariantKey(string $value): string
    {
        $value = strtoupper(
            trim($value),
        );

        $value = preg_replace(
            '/[^A-Z0-9]+/',
            '-',
            $value,
        ) ?? '';

        return trim(
            $value,
            '-',
        );
    }
};
