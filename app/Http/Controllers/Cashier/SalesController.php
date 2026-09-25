<?php

namespace App\Http\Controllers\Cashier;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\CashierSalesSummaryService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SalesController extends Controller
{
    private const DISPLAY_TIMEZONE =
        'Asia/Manila';

    public function __construct(
        private readonly CashierSalesSummaryService $salesSummary,
    ) {}

    /**
     * Display aggregate sales totals for the cashier.
     *
     * This is intentionally separate from Payment History:
     * Payment History answers "did this specific student pay?"
     * with a searchable per-transaction list. This page answers
     * "how much did we make?" with totals only — no student
     * names, no individual orders, no cost/profit figures (those
     * belong to the Admin Sales report).
     */
    public function index(
        Request $request,
    ): Response {
        $user =
            $request->user();

        abort_unless(
            $user
            && $user->role === 'cashier',
            403,
        );

        $group =
            $request->query(
                'group',
                'day',
            );

        if (
            ! in_array(
                $group,
                [
                    'day',
                    'week',
                    'month',
                ],
                true,
            )
        ) {
            $group = 'day';
        }

        $dateFrom =
            $this->parseFilterDate(
                $request->query('date_from'),
            );

        $dateTo =
            $this->parseFilterDate(
                $request->query('date_to'),
            );

        /*
         * A reversed range (e.g. tampered URL) can't be turned
         * into a sensible bucket list — fall back to no filter
         * rather than querying a backwards or empty window.
         */
        if (
            $dateFrom
            && $dateTo
            && $dateFrom->gt($dateTo)
        ) {
            $dateFrom = null;
            $dateTo = null;
        }

        $now =
            now(
                self::DISPLAY_TIMEZONE,
            );

        /*
        |--------------------------------------------------------------------------
        | Summary Cards
        |--------------------------------------------------------------------------
        |
        | Each card is compared against its equivalent prior
        | period (today vs yesterday, etc.) so the numbers show
        | a trend, not just a snapshot. "Today" is delegated to
        | the shared service so this page and the dashboard's
        | "Today's Sales" popup always agree.
        |
        */

        $todaySummary =
            $this->salesSummary->today();

        $thisWeek =
            $this->salesSummary->periodTotal(
                $now->clone()
                    ->startOfWeek()
                    ->utc(),
                $now->clone()
                    ->endOfWeek()
                    ->utc(),
            );

        $lastWeek =
            $this->salesSummary->periodTotal(
                $now->clone()
                    ->subWeek()
                    ->startOfWeek()
                    ->utc(),
                $now->clone()
                    ->subWeek()
                    ->endOfWeek()
                    ->utc(),
            );

        $thisMonth =
            $this->salesSummary->periodTotal(
                $now->clone()
                    ->startOfMonth()
                    ->utc(),
                $now->clone()
                    ->endOfMonth()
                    ->utc(),
            );

        $lastMonth =
            $this->salesSummary->periodTotal(
                $now->clone()
                    ->subMonth()
                    ->startOfMonth()
                    ->utc(),
                $now->clone()
                    ->subMonth()
                    ->endOfMonth()
                    ->utc(),
            );

        $allTime =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereNotNull(
                    'paid_at',
                )
                ->selectRaw(
                    'COUNT(*) AS transactions, COALESCE(SUM(total), 0) AS total',
                )
                ->first();

        /*
        |--------------------------------------------------------------------------
        | Breakdown Table + Chart + Best Period
        |--------------------------------------------------------------------------
        */

        $breakdown =
            $this->breakdown(
                $group,
                $now,
                $dateFrom,
                $dateTo,
            );

        return Inertia::render(
            'cashier/Sales/Index',
            [
                'summary' => [
                    'today' => $todaySummary,

                    'week' => $this->salesSummary->formatSummary(
                        $thisWeek,
                        $lastWeek,
                    ),

                    'month' => $this->salesSummary->formatSummary(
                        $thisMonth,
                        $lastMonth,
                    ),

                    'all_time' => [
                        'total' => number_format(
                            (float) $allTime->total,
                            2,
                            '.',
                            '',
                        ),

                        'transactions' => (int) $allTime->transactions,

                        'trend' => null,

                        'previous' => null,
                    ],
                ],

                'breakdown' => $breakdown['items'],

                'best' => $breakdown['best'],

                'group' => $group,

                'filters' => [
                    'date_from' => $dateFrom?->format('Y-m-d'),
                    'date_to' => $dateTo?->format('Y-m-d'),
                ],
            ],
        );
    }

    /**
     * Parse a "Y-m-d" query string into a Manila-local start-of-day
     * instant, ignoring anything malformed rather than erroring —
     * this is a display filter, not a validated form submission.
     */
    private function parseFilterDate(
        ?string $value,
    ): ?CarbonImmutable {
        if (
            ! $value
            || ! preg_match(
                '/^\d{4}-\d{2}-\d{2}$/',
                $value,
            )
        ) {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat(
                'Y-m-d',
                $value,
                self::DISPLAY_TIMEZONE,
            )->startOfDay();
        } catch (\Exception) {
            return null;
        }
    }

    /**
     * Build the period-breakdown table (and its matching chart
     * data) by fetching paid orders once for the visible range
     * and bucketing them in PHP by Manila-local day/week/month,
     * rather than relying on database-specific date-truncation
     * SQL.
     *
     * @return array{items: array<int, array{period: string, transactions: int, total: string}>, best: array{period: string, total: string}|null}
     */
    private function breakdown(
        string $group,
        CarbonImmutable $now,
        ?CarbonImmutable $dateFrom = null,
        ?CarbonImmutable $dateTo = null,
    ): array {
        $rangeEnd =
            $dateTo?->endOfDay() ?? $now;

        if ($dateFrom || $dateTo) {
            /*
             * A custom range was picked from the calendar — the
             * number of buckets follows the span the admin chose
             * instead of a fixed rolling window. Capped so an
             * accidental multi-year range can't blow up the query.
             */
            $rangeStart =
                match ($group) {
                    'week' => ($dateFrom ?? $rangeEnd->subWeeks(11))
                        ->startOfWeek(),

                    'month' => ($dateFrom ?? $rangeEnd->subMonths(11))
                        ->startOfMonth(),

                    default => ($dateFrom ?? $rangeEnd->subDays(29))
                        ->startOfDay(),
                };

            $bucketCount =
                min(
                    366,
                    max(
                        1,
                        match ($group) {
                            'week' => (int) $rangeStart->diffInWeeks($rangeEnd->endOfWeek()) + 1,
                            'month' => (int) $rangeStart->diffInMonths($rangeEnd->endOfMonth()) + 1,
                            default => (int) $rangeStart->diffInDays($rangeEnd) + 1,
                        },
                    ),
                );
        } else {
            $bucketCount =
                match ($group) {
                    'week' => 12,
                    'month' => 12,
                    default => 30,
                };

            $rangeStart =
                match ($group) {
                    'week' => $now->clone()
                        ->subWeeks($bucketCount - 1)
                        ->startOfWeek(),

                    'month' => $now->clone()
                        ->subMonths($bucketCount - 1)
                        ->startOfMonth(),

                    default => $now->clone()
                        ->subDays($bucketCount - 1)
                        ->startOfDay(),
                };
        }

        $orders =
            Order::query()
                ->where(
                    'payment_status',
                    Order::PAYMENT_PAID,
                )
                ->whereNotNull(
                    'paid_at',
                )
                ->where(
                    'paid_at',
                    '>=',
                    $rangeStart->clone()->utc(),
                )
                ->where(
                    'paid_at',
                    '<=',
                    $rangeEnd->clone()->utc(),
                )
                ->get([
                    'paid_at',
                    'total',
                ]);

        $buckets = [];

        /*
         * Seed every bucket up front (even ones with zero
         * sales), so the table and chart never have gaps.
         */
        for ($i = 0; $i < $bucketCount; $i++) {
            $bucketStart =
                match ($group) {
                    'week' => $rangeStart->clone()->addWeeks($i),
                    'month' => $rangeStart->clone()->addMonths($i),
                    default => $rangeStart->clone()->addDays($i),
                };

            $key =
                $bucketStart->format(
                    'Y-m-d',
                );

            $buckets[$key] = [
                'period' => $this->bucketLabel(
                    $group,
                    $bucketStart,
                ),

                'transactions' => 0,

                'total' => 0.0,
            ];
        }

        foreach ($orders as $order) {
            $localPaidAt =
                $order->paid_at
                    ->clone()
                    ->timezone(
                        self::DISPLAY_TIMEZONE,
                    );

            $bucketStart =
                match ($group) {
                    'week' => $localPaidAt->clone()->startOfWeek(),
                    'month' => $localPaidAt->clone()->startOfMonth(),
                    default => $localPaidAt->clone()->startOfDay(),
                };

            $key =
                $bucketStart->format(
                    'Y-m-d',
                );

            if (! isset($buckets[$key])) {
                continue;
            }

            $buckets[$key]['transactions']++;

            $buckets[$key]['total'] +=
                (float) $order->total;
        }

        $best = null;

        foreach ($buckets as $bucket) {
            if (
                $best === null
                || $bucket['total'] > $best['total']
            ) {
                $best = $bucket;
            }
        }

        /*
         * Most recent period first, matching Payment
         * History's convention.
         */
        $ordered =
            array_reverse(
                array_values(
                    $buckets,
                ),
            );

        return [
            'items' => array_map(
                fn (array $bucket): array => [
                    'period' => $bucket['period'],

                    'transactions' => $bucket['transactions'],

                    'total' => number_format(
                        $bucket['total'],
                        2,
                        '.',
                        '',
                    ),
                ],
                $ordered,
            ),

            'best' => $best && $best['total'] > 0
                ? [
                    'period' => $best['period'],

                    'total' => number_format(
                        $best['total'],
                        2,
                        '.',
                        '',
                    ),
                ]
                : null,
        ];
    }

    private function bucketLabel(
        string $group,
        CarbonImmutable $bucketStart,
    ): string {
        return match ($group) {
            'week' => 'Week of '.$bucketStart->format('M d, Y'),
            'month' => $bucketStart->format('F Y'),
            default => $bucketStart->format('M d, Y'),
        };
    }
}
