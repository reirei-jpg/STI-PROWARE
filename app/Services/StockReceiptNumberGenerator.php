<?php

namespace App\Services;

use App\Models\StockMovement;
use RuntimeException;

class StockReceiptNumberGenerator
{
    /**
     * Generate the next stock receipt number.
     *
     * Format:
     *
     * SR-YYYYMMDD-000001
     */
    public function generate(): string
    {
        $datePart = now()->format('Ymd');

        $prefix = "SR-{$datePart}-";

        /*
         * Lock matching stock receipt rows while determining
         * the next sequence number.
         *
         * This method should be called from inside the same
         * database transaction that creates the stock movement.
         */
        $latestReceiptNumber = StockMovement::query()
            ->where('movement_type', StockMovement::TYPE_RECEIVE)
            ->where('receipt_number', 'like', "{$prefix}%")
            ->whereNotNull('receipt_number')
            ->lockForUpdate()
            ->orderByDesc('receipt_number')
            ->value('receipt_number');

        $nextSequence = 1;

        if ($latestReceiptNumber) {
            $sequencePart = substr(
                $latestReceiptNumber,
                strlen($prefix),
            );

            if (
                $sequencePart === false
                || ! ctype_digit($sequencePart)
            ) {
                throw new RuntimeException(
                    'The latest stock receipt number has an invalid format.',
                );
            }

            $nextSequence =
                (int) $sequencePart + 1;
        }

        if ($nextSequence > 999999) {
            throw new RuntimeException(
                'The daily stock receipt sequence limit has been reached.',
            );
        }

        return $prefix
            .str_pad(
                (string) $nextSequence,
                6,
                '0',
                STR_PAD_LEFT,
            );
    }
}
