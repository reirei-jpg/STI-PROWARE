import {
    Head,
    router,
} from '@inertiajs/react';
import {
    Award,
    CalendarDays,
    TrendingUp,
} from 'lucide-react';


import { useState } from 'react';

import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import DetailPopup from '@/components/action-feedback/DetailPopup';
import TrendBadge from '@/components/cashier/TrendBadge';
import { DatePicker } from '@/components/ui/date-picker';

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';

interface PreviousPeriod {
    total: string;
    transactions: number;
}

interface SummaryCardData {
    total: string;
    transactions: number;
    trend: number | null;
    previous: PreviousPeriod | null;
}

interface SalesSummary {
    today: SummaryCardData;
    week: SummaryCardData;
    month: SummaryCardData;
    all_time: SummaryCardData;
}

interface BreakdownRow {
    period: string;
    transactions: number;
    total: string;
}

interface BestPeriod {
    period: string;
    total: string;
}

type SalesGroup =
    | 'day'
    | 'week'
    | 'month';

type ActiveCard =
    | 'today'
    | 'week'
    | 'month'
    | 'all_time'
    | null;

interface SalesFilters {
    date_from: string | null;
    date_to: string | null;
}

interface SalesIndexProps {
    summary: SalesSummary;
    breakdown: BreakdownRow[];
    best: BestPeriod | null;
    group: SalesGroup;
    filters: SalesFilters;
}

const CARD_META: Record<
    Exclude<ActiveCard, null>,
    { title: string; compareLabel: string | null }
> = {
    today: {
        title: 'Today',
        compareLabel: 'yesterday',
    },
    week: {
        title: 'This Week',
        compareLabel: 'last week',
    },
    month: {
        title: 'This Month',
        compareLabel: 'last month',
    },
    all_time: {
        title: 'All-Time',
        compareLabel: null,
    },
};

export default function Index({
    summary,
    breakdown,
    best,
    group,
    filters,
}: SalesIndexProps) {
    const [activeCard, setActiveCard] =
        useState<ActiveCard>(null);

    const [dateFrom, setDateFrom] =
        useState(filters.date_from ?? '');

    const [dateTo, setDateTo] =
        useState(filters.date_to ?? '');

    const hasDateFilter = Boolean(
        filters.date_from || filters.date_to,
    );

    const dateRangeInvalid = Boolean(
        dateFrom && dateTo && dateFrom > dateTo,
    );

    /*
     * The table shows most-recent-first (matching Payment
     * History's convention), but a trend chart reads more
     * naturally left-to-right in chronological order.
     */
    const chartData = [...breakdown]
        .reverse()
        .map((row) => ({
            period: row.period,
            total: Number(row.total),
        }));

    /*
     * Zero-sales periods are kept in the chart above (so the
     * trend line's time spacing stays accurate), but they add
     * nothing to a table meant for scanning actual numbers.
     */
    const activeRows = breakdown.filter(
        (row) => row.transactions > 0,
    );

    const quietPeriods =
        breakdown.length - activeRows.length;

    const setGroup = (
        nextGroup: SalesGroup,
    ) => {
        router.get(
            cashier.sales.index.url(),
            {
                group: nextGroup,
                date_from: filters.date_from ?? undefined,
                date_to: filters.date_to ?? undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const applyDateFilter = () => {
        if (dateRangeInvalid) {
            return;
        }

        router.get(
            cashier.sales.index.url(),
            {
                group,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const clearDateFilter = () => {
        setDateFrom('');
        setDateTo('');

        router.get(
            cashier.sales.index.url(),
            {
                group,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const activeCardData =
        activeCard ? summary[activeCard] : null;

    const activeCardMeta =
        activeCard ? CARD_META[activeCard] : null;

    return (
        <CashierLayout>
            <Head title="Sales" />

            <div className="space-y-7">
                {/* Header */}
                <header>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Sales
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        How much PROWARE has made, in totals only.
                        Looking for a specific student&apos;s payment
                        instead? Use Payment History.
                    </p>
                </header>

                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Today"
                        data={summary.today}
                        compareLabel="yesterday"
                        onClick={() =>
                            setActiveCard('today')
                        }
                    />

                    <SummaryCard
                        title="This Week"
                        data={summary.week}
                        compareLabel="last week"
                        onClick={() =>
                            setActiveCard('week')
                        }
                    />

                    <SummaryCard
                        title="This Month"
                        data={summary.month}
                        compareLabel="last month"
                        onClick={() =>
                            setActiveCard('month')
                        }
                    />

                    <SummaryCard
                        title="All-Time"
                        data={summary.all_time}
                        compareLabel={null}
                        onClick={() =>
                            setActiveCard('all_time')
                        }
                    />
                </div>

                {/* Best Period Callout */}
                {best && (
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                        <Award
                            size={22}
                            className="shrink-0 text-amber-600"
                        />

                        <p className="text-sm font-bold text-amber-900">
                            Best {group}: {best.period} — {formatCurrency(best.total)}
                        </p>
                    </div>
                )}

                {/* Trend + Breakdown */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">
                                Sales Trend
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Total sales grouped by {group}.
                            </p>
                        </div>

                        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <GroupButton
                                active={group === 'day'}
                                onClick={() => setGroup('day')}
                            >
                                Day
                            </GroupButton>

                            <GroupButton
                                active={group === 'week'}
                                onClick={() => setGroup('week')}
                            >
                                Week
                            </GroupButton>

                            <GroupButton
                                active={group === 'month'}
                                onClick={() => setGroup('month')}
                            >
                                Month
                            </GroupButton>
                        </div>
                    </div>

                    {/* Date Range Filter */}
                    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-end sm:flex-wrap">
                        <div className="w-full sm:w-48">
                            <p className="mb-1.5 text-xs font-bold text-slate-500">
                                From
                            </p>

                            <DatePicker
                                value={dateFrom}
                                onChange={setDateFrom}
                                placeholder="Any start date"
                                disablePast={false}
                            />
                        </div>

                        <div className="w-full sm:w-48">
                            <p className="mb-1.5 text-xs font-bold text-slate-500">
                                To
                            </p>

                            <DatePicker
                                value={dateTo}
                                onChange={setDateTo}
                                placeholder="Any end date"
                                disablePast={false}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={applyDateFilter}
                                disabled={dateRangeInvalid}
                                className="rounded-xl bg-[#0D6EFD] px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Apply
                            </button>

                            {(hasDateFilter || dateFrom || dateTo) && (
                                <button
                                    type="button"
                                    onClick={clearDateFilter}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {dateRangeInvalid ? (
                        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                            The start date cannot be later than the end date.
                        </div>
                    ) : hasDateFilter ? (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700">
                            <CalendarDays size={15} />

                            <span>
                                Showing sales
                                {filters.date_from
                                    ? ` from ${formatDisplayDate(filters.date_from)}`
                                    : ''}
                                {filters.date_to
                                    ? ` to ${formatDisplayDate(filters.date_to)}`
                                    : ''}
                            </span>
                        </div>
                    ) : null}

                    {breakdown.length > 0 ? (
                        <>
                            <div className="mt-6 h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#eef1f6"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="period"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                            tickLine={false}
                                            minTickGap={24}
                                        />

                                        <YAxis
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={false}
                                            tickLine={false}
                                            width={56}
                                            tickFormatter={(value: number) =>
                                                value >= 1000
                                                    ? `₱${Math.round(value / 1000)}k`
                                                    : `₱${value}`
                                            }
                                        />

                                        <Tooltip
                                            formatter={(value) => [
                                                formatCurrency(String(value)),
                                                'Sales',
                                            ]}
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: '1px solid #e2e8f0',
                                                fontSize: 12,
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#2563eb"
                                            strokeWidth={2.5}
                                            dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            {activeRows.length > 0 ? (
                                <div className="mt-6 overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                <th className="py-3">
                                                    Period
                                                </th>

                                                <th className="py-3 text-right">
                                                    Transactions
                                                </th>

                                                <th className="py-3 text-right">
                                                    Total Sales
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {activeRows.map((row) => (
                                                <tr key={row.period}>
                                                    <td className="py-3 font-bold text-slate-800">
                                                        {row.period}
                                                    </td>

                                                    <td className="py-3 text-right text-slate-600">
                                                        {row.transactions}
                                                    </td>

                                                    <td className="py-3 text-right font-black text-slate-900">
                                                        {formatCurrency(row.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {quietPeriods > 0 && (
                                        <p className="mt-4 text-xs text-slate-400">
                                            {quietPeriods}{' '}
                                            {quietPeriods === 1
                                                ? 'period'
                                                : 'periods'}{' '}
                                            with no sales in this range are hidden from the table above (still included in the chart).
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-6 py-14 text-center text-sm text-slate-500">
                                    No sales recorded in this range yet.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="mt-6 py-14 text-center text-sm text-slate-500">
                            No sales recorded in this range yet.
                        </div>
                    )}
                </section>
            </div>

            <DetailPopup
                open={activeCard !== null}
                title={
                    activeCardMeta?.title
                        ?? 'Sales Detail'
                }
                icon={TrendingUp}
                onClose={() =>
                    setActiveCard(null)
                }
            >
                {activeCardData && (
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-blue-50 p-5 text-center">
                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                Total Sales
                            </p>

                            <p className="mt-1 text-3xl font-black text-slate-900">
                                {formatCurrency(
                                    activeCardData.total,
                                )}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                {activeCardData.transactions}{' '}
                                transaction
                                {activeCardData.transactions === 1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>

                        {activeCardMeta?.compareLabel
                            && activeCardData.previous && (
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                    Compared to{' '}
                                    {
                                        activeCardMeta.compareLabel
                                    }
                                </p>

                                <div className="mt-2 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                                        <p className="text-xs font-bold text-blue-600">
                                            This Period
                                        </p>

                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            {formatCurrency(
                                                activeCardData.total,
                                            )}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {
                                                activeCardData.transactions
                                            }{' '}
                                            txns
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs font-bold capitalize text-slate-500">
                                            {
                                                activeCardMeta.compareLabel
                                            }
                                        </p>

                                        <p className="mt-1 text-lg font-black text-slate-900">
                                            {formatCurrency(
                                                activeCardData
                                                    .previous
                                                    .total,
                                            )}
                                        </p>

                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {
                                                activeCardData
                                                    .previous
                                                    .transactions
                                            }{' '}
                                            txns
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <TrendBadge
                                        trend={
                                            activeCardData.trend
                                        }
                                        compareLabel={
                                            activeCardMeta.compareLabel
                                        }
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DetailPopup>
        </CashierLayout>
    );
}

function SummaryCard({
    title,
    data,
    compareLabel,
    onClick,
}: {
    title: string;
    data: SummaryCardData;
    compareLabel: string | null;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="
                block w-full rounded-2xl border
                border-slate-200 bg-white p-5
                text-left shadow-sm transition
                hover:-translate-y-0.5 hover:border-blue-200
                hover:shadow-md
            "
        >
            <p className="text-sm font-bold text-slate-700">
                {title}
            </p>

            <p className="mt-2 text-2xl font-black text-slate-900">
                {formatCurrency(data.total)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
                {data.transactions} transaction{data.transactions === 1 ? '' : 's'}
            </p>

            {compareLabel && (
                <div className="mt-3">
                    <TrendBadge
                        trend={data.trend}
                        compareLabel={compareLabel}
                    />
                </div>
            )}
        </button>
    );
}

function GroupButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                rounded-lg px-4 py-2 text-sm font-bold transition
                ${
                    active
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                }
            `}
        >
            {children}
        </button>
    );
}

function formatDisplayDate(
    date: string,
): string {
    const [year, month, day] = date.split('-');

    return new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(
        new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
        ),
    );
}

function formatCurrency(
    amount: string,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',
        },
    ).format(
        Number(amount),
    );
}
