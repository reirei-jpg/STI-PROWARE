<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Create a PostgreSQL sequence used exclusively
     * for PROWARE product-code numbers.
     */
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE SEQUENCE IF NOT EXISTS product_code_sequence
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        SQL);

        /*
         * Find the highest numeric value already used by codes
         * following the PRO-000001 pattern.
         *
         * Codes that do not follow this pattern, such as
         * STI-POLO, are ignored and remain unchanged.
         */
        $maximumExistingNumber = (int) DB::table('products')
            ->whereRaw("code ~ '^PRO-[0-9]+$'")
            ->selectRaw(
                "COALESCE(
                    MAX(
                        CAST(
                            SUBSTRING(code FROM '[0-9]+$')
                            AS BIGINT
                        )
                    ),
                    0
                ) AS maximum_number"
            )
            ->value('maximum_number');

        if ($maximumExistingNumber > 0) {
            DB::statement(
                "SELECT setval(
                    'product_code_sequence',
                    {$maximumExistingNumber},
                    true
                )"
            );

            return;
        }

        /*
         * The false argument means the first nextval() call
         * should return 1 rather than 2.
         */
        DB::statement(
            "SELECT setval(
                'product_code_sequence',
                1,
                false
            )"
        );
    }

    /**
     * Remove the product-code sequence.
     *
     * Existing product codes remain in the products table.
     */
    public function down(): void
    {
        DB::statement(
            'DROP SEQUENCE IF EXISTS product_code_sequence'
        );
    }
};
