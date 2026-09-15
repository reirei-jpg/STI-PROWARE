<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

final class ProductCodeGenerator
{
    private const PREFIX = 'PRO';

    private const NUMBER_LENGTH = 6;

    /**
     * Generate the next permanent PROWARE product code.
     *
     * Examples:
     * PRO-000001
     * PRO-000002
     * PRO-000003
     */
    public function generate(): string
    {
        $result = DB::selectOne(
            "SELECT nextval('product_code_sequence') AS sequence_number"
        );

        if (
            ! $result
            || ! isset($result->sequence_number)
        ) {
            throw new RuntimeException(
                'The system could not generate a product code.'
            );
        }

        $number = (int) $result->sequence_number;

        if ($number < 1) {
            throw new RuntimeException(
                'The generated product-code number is invalid.'
            );
        }

        return self::PREFIX
            .'-'
            .str_pad(
                (string) $number,
                self::NUMBER_LENGTH,
                '0',
                STR_PAD_LEFT,
            );
    }
}
