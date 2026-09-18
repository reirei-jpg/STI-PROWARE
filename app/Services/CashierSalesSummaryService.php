<?php

namespace App\Services;

use App\Models\Order;
use Carbon\CarbonImmutable;

class CashierSalesSummaryService
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    /**
     * Today's confirmed-payment total vs. yesterday's, with a
     * trend percentage. Shared by the cashier dashboard's
     * "Today's Sales" card and the Sales report's "Today"
     * summary card, so the two never disagree.
     *
     * @return array{total: string, transactions: int, trend: float|null}
     */
    public function today(): array
    {
        $now =
            now(
                self::DISPLAY_TIMEZONE,
            );

        $today =
            $this->periodTotal(
                $now->clone()
                    ->startOfDay()
                    ->utc(),
                $now->clone()
                    ->endOfDay()
                    ->utc(),
            );

        $yesterday =
            $this->periodTotal(
                $now->clone()
                    ->subDay()
                    ->startOfDay()
                    ->utc(),
                $now->clone()
                    ->subDay()
                    ->endOfDay()
                    ->utc(),
            );

        return $this->formatSummary(
            $today,
            $yesterday,
        );
    }

    /**
     * @return array{total: float, transactions: int}
     */
    public function periodTotal(
        CarbonImmutable $startUtc,
        CarbonImmutable $endUtc,
    ): array {
        $result =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereBetween(
                    'paid_at',
                    [
                        $startUtc,
                        $endUtc,
                    ],
                )
                ->selectRaw(
                    'COUNT(*) AS transactions, COALESCE(SUM(total), 0) AS total',
                )
                ->first();

        return [
            'total' => (float) $result->total,

            'transactions' => (int) $result->transactions,
        ];
    }

    /**
     * @param  array{total: float, transactions: int}  $current
     * @param  array{total: float, transactions: int}  $previous
     * @return array{total: string, transactions: int, trend: float|null, previous: array{total: string, transactions: int}}
     */
    public function formatSummary(
        array $current,
        array $previous,
    ): array {
        $trend = 0.0;

        if ($previous['total'] > 0) {
            $trend =
                round(
                    (
                        ($current['total'] - $previous['total'])
                        / $previous['total']
                    ) * 100,
                    1,
                );
        } elseif ($current['total'] > 0) {
            /*
             * No prior period to compare against
             * (e.g. the very first sale ever) — a
             * percentage here would be misleading.
             */
            $trend = null;
        }

        return [
            'total' => number_format(
                $current['total'],
                2,
                '.',
                '',
            ),

            'transactions' => $current['transactions'],

            'trend' => $trend,

            /*
             * Raw prior-period numbers, so a UI can show
             * a real side-by-side comparison rather than
             * just the derived percentage.
             */
            'previous' => [
                'total' => number_format(
                    $previous['total'],
                    2,
                    '.',
                    '',
                ),

                'transactions' => $previous['transactions'],
            ],
        ];
    }
}
