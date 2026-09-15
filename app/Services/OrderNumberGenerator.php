<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;

class OrderNumberGenerator
{
    /**
     * Generate the next unique PROWARE order number.
     *
     * Format:
     * ORD-YYYYMMDD-000001
     */
    public function generate(): string
    {
        return DB::transaction(
            function (): string {
                $date =
                    now()->format('Ymd');

                $prefix =
                    "ORD-{$date}-";

                $latestOrder = Order::query()
                    ->where(
                        'order_number',
                        'like',
                        "{$prefix}%",
                    )
                    ->lockForUpdate()
                    ->orderByDesc('order_number')
                    ->first();

                $nextSequence = 1;

                if ($latestOrder) {
                    $lastSequence =
                        (int) substr(
                            $latestOrder->order_number,
                            -6,
                        );

                    $nextSequence =
                        $lastSequence + 1;
                }

                return $prefix
                    .str_pad(
                        (string) $nextSequence,
                        6,
                        '0',
                        STR_PAD_LEFT,
                    );
            },
            attempts: 3,
        );
    }
}
