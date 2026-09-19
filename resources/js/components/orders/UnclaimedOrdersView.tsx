import { Head, Link } from '@inertiajs/react';
import { Hourglass } from 'lucide-react';

export interface UnclaimedOrder {
    id: number;
    order_number: string;
    student_name: string;
    student_id: string;
    total: string;
    total_quantity: number;
    ready_at: string;
    days_waiting: number;
    last_reminder_days: number | null;
    order_url: string;
}

export interface UnclaimedOrdersProps {
    orders: {
        data: UnclaimedOrder[];
        total: number;
        prev_page_url: string | null;
        next_page_url: string | null;
    };
    summary: {
        total: number;
        over_7: number;
        over_14: number;
        over_30: number;
    };
    filters: {
        min_days: number | null;
    };
    index_url: string;
}

const FILTER_CARDS = [
    { key: 'total', label: 'All waiting', minDays: null },
    { key: 'over_7', label: '7+ days', minDays: 7 },
    { key: 'over_14', label: '14+ days', minDays: 14 },
    { key: 'over_30', label: '30+ days', minDays: 30 },
] as const;

function formatCurrency(amount: string): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(Number(amount));
}

function waitingTone(days: number): string {
    if (days >= 30) {
        return 'bg-red-100 text-red-700';
    }

    if (days >= 14) {
        return 'bg-amber-100 text-amber-700';
    }

    return 'bg-slate-100 text-slate-700';
}

export default function UnclaimedOrdersView({
    orders,
    summary,
    filters,
    index_url,
}: UnclaimedOrdersProps) {
    return (
        <>
            <Head title="Waiting to Be Claimed" />

            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Waiting to Be Claimed
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Paid orders that are ready for pickup but the student
                        has not collected. Students are reminded automatically
                        at 7, 14 and 30 days.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FILTER_CARDS.map((card) => {
                        const active = filters.min_days === card.minDays;

                        return (
                            <Link
                                key={card.key}
                                href={
                                    card.minDays === null
                                        ? index_url
                                        : `${index_url}?min_days=${card.minDays}`
                                }
                                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                    active
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-slate-200 bg-white'
                                }`}
                            >
                                <p className="text-sm font-bold text-slate-700">
                                    {card.label}
                                </p>

                                <p className="mt-2 text-3xl font-black text-slate-900">
                                    {summary[card.key]}
                                </p>
                            </Link>
                        );
                    })}
                </div>

                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    {orders.data.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <Hourglass size={26} />
                            </div>

                            <p className="font-black text-slate-900">
                                Nothing is waiting to be claimed
                            </p>

                            <p className="text-sm text-slate-500">
                                Every ready order has been picked up.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3">Order</th>
                                        <th className="px-5 py-3">Student</th>
                                        <th className="px-5 py-3">Ready since</th>
                                        <th className="px-5 py-3">Waiting</th>
                                        <th className="px-5 py-3 text-right">
                                            Total
                                        </th>
                                        <th className="px-5 py-3" />
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {orders.data.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-5 py-4">
                                                <p className="font-black text-slate-900">
                                                    {order.order_number}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {order.total_quantity}{' '}
                                                    {order.total_quantity === 1
                                                        ? 'item'
                                                        : 'items'}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-800">
                                                    {order.student_name}
                                                </p>

                                                <p className="text-xs text-slate-500">
                                                    {order.student_id}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4 text-slate-600">
                                                {order.ready_at}
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${waitingTone(order.days_waiting)}`}
                                                >
                                                    {order.days_waiting}{' '}
                                                    {order.days_waiting === 1
                                                        ? 'day'
                                                        : 'days'}
                                                </span>

                                                {order.last_reminder_days !==
                                                    null && (
                                                    <p className="mt-1 text-xs text-slate-400">
                                                        Reminded at{' '}
                                                        {order.last_reminder_days}{' '}
                                                        days
                                                    </p>
                                                )}
                                            </td>

                                            <td className="px-5 py-4 text-right font-bold text-slate-900">
                                                {formatCurrency(order.total)}
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <Link
                                                    href={order.order_url}
                                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    View order
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(orders.prev_page_url || orders.next_page_url) && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
                            {orders.prev_page_url ? (
                                <Link
                                    href={orders.prev_page_url}
                                    className="font-bold text-blue-600"
                                >
                                    Previous
                                </Link>
                            ) : (
                                <span />
                            )}

                            {orders.next_page_url && (
                                <Link
                                    href={orders.next_page_url}
                                    className="font-bold text-blue-600"
                                >
                                    Next
                                </Link>
                            )}
                        </div>
                    )}
                </section>
            </div>
        </>
    );
}
