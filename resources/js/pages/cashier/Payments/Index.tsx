import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    CreditCard,
    Info,
    PackageCheck,
    ReceiptText,
    Search,
    ShoppingBag,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
} from '@inertiajs/react';

import {
    useEffect,
    useState,
} from 'react';

import DetailPopup from '@/components/action-feedback/DetailPopup';

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';

interface PaymentStudent {
    name: string;
    student_id: string;
}

interface ConfirmedBy {
    name: string;
}

interface PaymentItem {
    id: number;
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
}

interface PaymentRecord {
    id: number;
    transaction_number: string;
    short_reference: string;
    order_number: string;
    total: string;
    payment_method: string | null;
    payment_reference: string | null;
    paid_at: string | null;
    created_at: string | null;
    fulfillment_status: string;
    ready_for_release_at: string | null;
    released_at: string | null;
    student: PaymentStudent;
    confirmed_by: ConfirmedBy;
    items: PaymentItem[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaymentsPaginator {
    data: PaymentRecord[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
}

interface PaymentFilters {
    search: string;
    method: string;
    date: string;
}

interface PaymentHistoryProps {
    payments: PaymentsPaginator;
    filters: PaymentFilters;
}

export default function Index({
    payments,
    filters,
}: PaymentHistoryProps) {
    const [search, setSearch] = useState(
        filters.search ?? '',
    );

    const [activePayment, setActivePayment] =
        useState<PaymentRecord | null>(null);

    /*
     * Delay searching slightly so we do not
     * request the server after every keystroke.
     */
    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (
                search.trim()
                === (filters.search ?? '')
            ) {
                return;
            }

            router.get(
                cashier.payments.index.url(),
                {
                    search: search.trim(),
                    method: filters.method || undefined,
                    date: filters.date || undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 400);

        return () => {
            window.clearTimeout(timer);
        };
    }, [
        search,
        filters.search,
        filters.method,
        filters.date,
    ]);

    const updateFilter = (
        name: 'method' | 'date',
        value: string,
    ) => {
        router.get(
            cashier.payments.index.url(),
            {
                search: search.trim() || undefined,
                method:
                    name === 'method'
                        ? value || undefined
                        : filters.method || undefined,
                date:
                    name === 'date'
                        ? value || undefined
                        : filters.date || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <CashierLayout>
            <Head title="Payment History" />

            <div className="space-y-7">
                {/* Header */}
                <header>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Payment History
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Trace confirmed student payments
                        and official transaction records.
                    </p>
                </header>

                {/* Search + Filters */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                        <div className="relative flex-1">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Transaction, order, student name or Student ID..."
                                className="
                                    w-full rounded-xl
                                    border border-slate-200
                                    bg-white py-3
                                    pl-11 pr-4
                                    text-sm text-slate-900
                                    outline-none transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="relative">
                                <CreditCard
                                    size={16}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <select
                                    value={
                                        filters.method ?? ''
                                    }
                                    onChange={(event) =>
                                        updateFilter(
                                            'method',
                                            event.target.value,
                                        )
                                    }
                                    className="
                                        min-w-48 appearance-none
                                        rounded-xl border
                                        border-slate-200
                                        bg-white py-3
                                        pl-10 pr-9
                                        text-sm font-semibold
                                        text-slate-700
                                        outline-none transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                >
                                    <option value="">
                                        All Payment Methods
                                    </option>

                                    <option value="cash">
                                        Cash
                                    </option>

                                    <option value="gcash">
                                        GCash
                                    </option>

                                    <option value="maya">
                                        Maya
                                    </option>
                                </select>
                            </div>

                            <div className="relative">
                                <CalendarDays
                                    size={16}
                                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />

                                <select
                                    value={
                                        filters.date ?? ''
                                    }
                                    onChange={(event) =>
                                        updateFilter(
                                            'date',
                                            event.target.value,
                                        )
                                    }
                                    className="
                                        min-w-44 appearance-none
                                        rounded-xl border
                                        border-slate-200
                                        bg-white py-3
                                        pl-10 pr-9
                                        text-sm font-semibold
                                        text-slate-700
                                        outline-none transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                >
                                    <option value="">
                                        All Time
                                    </option>

                                    <option value="today">
                                        Today
                                    </option>

                                    <option value="week">
                                        This Week
                                    </option>

                                    <option value="month">
                                        This Month
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Payment Records */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ReceiptText size={19} />
                            </div>

                            <div>
                                <h2 className="font-black text-slate-900">
                                    Payment Records
                                </h2>

                                <p className="mt-0.5 text-xs text-slate-500">
                                    Confirmed PROWARE transactions
                                </p>
                            </div>
                        </div>

                        <p className="text-sm font-bold text-slate-500">
                            {payments.total}{' '}
                            {payments.total === 1
                                ? 'record'
                                : 'records'}
                        </p>
                    </div>

                    {payments.data.length > 0 ? (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wide text-slate-400">
                                            <th className="px-6 py-4">
                                                Transaction
                                            </th>

                                            <th className="px-6 py-4">
                                                Amount
                                            </th>

                                            <th className="px-6 py-4">
                                                Method
                                            </th>

                                            <th className="px-6 py-4">
                                                Paid At
                                            </th>

                                            <th className="px-6 py-4 text-right">
                                                Details
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {payments.data.map(
                                            (payment) => (
                                                <PaymentRow
                                                    key={
                                                        payment.id
                                                    }
                                                    payment={
                                                        payment
                                                    }
                                                    onViewDetails={() =>
                                                        setActivePayment(
                                                            payment,
                                                        )
                                                    }
                                                />
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile */}
                            <div className="divide-y divide-slate-100 lg:hidden">
                                {payments.data.map(
                                    (payment) => (
                                        <PaymentCard
                                            key={
                                                payment.id
                                            }
                                            payment={
                                                payment
                                            }
                                            onViewDetails={() =>
                                                setActivePayment(
                                                    payment,
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </div>

                            <Pagination
                                payments={payments}
                            />
                        </>
                    ) : (
                        <EmptyState
                            searching={
                                search.trim() !== ''
                                || filters.method !== ''
                                || filters.date !== ''
                            }
                        />
                    )}
                </section>
            </div>

            <DetailPopup
                open={activePayment !== null}
                title={
                    activePayment
                        ? activePayment.short_reference
                        : 'Transaction Details'
                }
                icon={ReceiptText}
                onClose={() =>
                    setActivePayment(null)
                }
                actionHref={
                    activePayment
                        ? cashier.orders.receipt.url(
                              activePayment.id,
                              {
                                  query: {
                                      from: 'payments',
                                  },
                              },
                          )
                        : undefined
                }
                actionLabel="View Receipt"
            >
                {activePayment && (
                    <div className="space-y-6">
                        {/* Transaction + Order Identifiers */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                    Transaction #
                                </p>

                                <p className="mt-1 break-all font-mono text-base font-black text-slate-900">
                                    {
                                        activePayment.transaction_number
                                    }
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Order #
                                </p>

                                <p className="mt-1 break-all font-mono text-base font-black text-slate-900">
                                    {
                                        activePayment.order_number
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="rounded-2xl bg-blue-50/60 p-5 text-center">
                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                Total Amount
                            </p>

                            <p className="mt-1 text-3xl font-black text-slate-900">
                                {formatCurrency(
                                    activePayment.total,
                                )}
                            </p>
                        </div>

                        {/* Items Purchased */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                Items Purchased
                            </p>

                            {activePayment.items.length > 0 ? (
                                <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                                    {activePayment.items.map(
                                        (item) => (
                                            <div
                                                key={
                                                    item.id
                                                }
                                                className="flex items-start justify-between gap-4 px-4 py-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900">
                                                        {
                                                            item.product_name
                                                        }
                                                    </p>

                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        {
                                                            item.variant_name
                                                        }{' '}
                                                        · Qty{' '}
                                                        {
                                                            item.quantity
                                                        }{' '}
                                                        ×{' '}
                                                        {formatCurrency(
                                                            item.unit_price,
                                                        )}
                                                    </p>
                                                </div>

                                                <p className="shrink-0 font-black text-slate-900">
                                                    {formatCurrency(
                                                        item.line_total,
                                                    )}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-slate-500">
                                    No item details available for this order.
                                </p>
                            )}
                        </div>

                        {/* Transaction Timeline */}
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                Transaction Timeline
                            </p>

                            <div className="mt-3">
                                <TimelineStep
                                    icon={ShoppingBag}
                                    title="Order Placed"
                                    value={
                                        activePayment.created_at
                                            ?? 'Unavailable'
                                    }
                                    completed
                                />

                                <TimelineStep
                                    icon={CheckCircle2}
                                    title="Payment Confirmed"
                                    value={`${activePayment.paid_at ?? 'Unavailable'} · ${formatPaymentMethod(activePayment.payment_method)}${activePayment.payment_reference ? ` (Ref: ${activePayment.payment_reference})` : ''}`}
                                    completed
                                />

                                <TimelineStep
                                    icon={PackageCheck}
                                    title="Ready for Release"
                                    value={
                                        activePayment.ready_for_release_at
                                            ?? 'Not yet ready'
                                    }
                                    completed={
                                        activePayment.ready_for_release_at
                                            !== null
                                    }
                                />

                                <TimelineStep
                                    icon={CheckCircle2}
                                    title="Released"
                                    value={
                                        activePayment.released_at
                                            ?? 'Not yet released'
                                    }
                                    completed={
                                        activePayment.released_at
                                            !== null
                                    }
                                    last
                                />
                            </div>
                        </div>

                        {/* People */}
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
                            <MobileInfo
                                label="Student"
                                value={
                                    activePayment.student.name
                                }
                                secondary={
                                    activePayment.student
                                        .student_id
                                }
                            />

                            <MobileInfo
                                label="Confirmed By"
                                value={
                                    activePayment.confirmed_by
                                        .name
                                }
                            />
                        </div>
                    </div>
                )}
            </DetailPopup>
        </CashierLayout>
    );
}

function PaymentRow({
    payment,
    onViewDetails,
}: {
    payment: PaymentRecord;
    onViewDetails: () => void;
}) {
    return (
        <tr className="transition hover:bg-slate-50/70">
            <td className="px-6 py-5">
                <p className="font-mono text-sm font-black text-blue-600">
                    {payment.short_reference}
                </p>

                <p className="mt-1 whitespace-nowrap font-mono text-[11px] text-slate-400">
                    {payment.transaction_number}
                </p>
            </td>

            <td className="px-6 py-5">
                <p className="whitespace-nowrap font-black text-slate-900">
                    {formatCurrency(
                        payment.total,
                    )}
                </p>
            </td>

            <td className="px-6 py-5">
                <MethodBadge
                    method={
                        payment.payment_method
                    }
                />
            </td>

            <td className="px-6 py-5">
                <p className="whitespace-nowrap text-sm font-semibold text-slate-600">
                    {payment.paid_at
                        ?? 'Unavailable'}
                </p>
            </td>

            <td className="px-6 py-5 text-right">
                <button
                    type="button"
                    onClick={onViewDetails}
                    className="
                        inline-flex items-center
                        gap-2 rounded-xl
                        border border-slate-200
                        bg-white px-3 py-2
                        text-xs font-bold
                        text-slate-700 transition
                        hover:border-blue-300
                        hover:bg-blue-50
                        hover:text-blue-700
                    "
                >
                    <Info size={15} />

                    Details
                </button>
            </td>
        </tr>
    );
}

function MethodBadge({
    method,
}: {
    method: string | null;
}) {
    return (
        <span
            className="
                inline-flex items-center
                rounded-full bg-slate-100
                px-3 py-1 text-xs
                font-bold text-slate-700
            "
        >
            {formatPaymentMethod(method)}
        </span>
    );
}

function PaymentCard({
    payment,
    onViewDetails,
}: {
    payment: PaymentRecord;
    onViewDetails: () => void;
}) {
    return (
        <article className="p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-mono text-base font-black text-blue-600">
                        {payment.short_reference}
                    </p>

                    <p className="mt-1 break-all font-mono text-[11px] text-slate-400">
                        {payment.transaction_number}
                    </p>
                </div>

                <p className="shrink-0 text-lg font-black text-slate-900">
                    {formatCurrency(
                        payment.total,
                    )}
                </p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
                <MethodBadge
                    method={
                        payment.payment_method
                    }
                />

                <p className="text-sm font-semibold text-slate-500">
                    {payment.paid_at
                        ?? 'Unavailable'}
                </p>
            </div>

            <button
                type="button"
                onClick={onViewDetails}
                className="
                    mt-5 flex w-full
                    items-center justify-center
                    gap-2 rounded-xl
                    border border-slate-200
                    bg-white px-4 py-3
                    text-sm font-bold
                    text-slate-700 transition
                    hover:border-blue-300
                    hover:bg-blue-50
                    hover:text-blue-700
                "
            >
                <Info size={16} />

                Details
            </button>
        </article>
    );
}

function MobileInfo({
    label,
    value,
    secondary,
}: {
    label: string;
    value: string;
    secondary?: string;
}) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {value}
            </p>

            {secondary && (
                <p className="mt-0.5 text-xs text-slate-400">
                    {secondary}
                </p>
            )}
        </div>
    );
}

function TimelineStep({
    icon: Icon,
    title,
    value,
    completed,
    last = false,
}: {
    icon: typeof Clock3;
    title: string;
    value: string;
    completed: boolean;
    last?: boolean;
}) {
    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div
                    className={`
                        flex h-8 w-8 shrink-0 items-center
                        justify-center rounded-full border-2
                        ${
                            completed
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-slate-200 bg-white text-slate-300'
                        }
                    `}
                >
                    {completed ? (
                        <Icon size={14} />
                    ) : (
                        <Clock3 size={14} />
                    )}
                </div>

                {!last && (
                    <div
                        className={`
                            min-h-8 w-0.5 flex-1
                            ${
                                completed
                                    ? 'bg-emerald-200'
                                    : 'bg-slate-200'
                            }
                        `}
                    />
                )}
            </div>

            <div className={last ? 'pb-0' : 'pb-4'}>
                <p
                    className={`text-sm font-black ${
                        completed
                            ? 'text-slate-900'
                            : 'text-slate-400'
                    }`}
                >
                    {title}
                </p>

                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    {value}
                </p>
            </div>
        </div>
    );
}

function Pagination({
    payments,
}: {
    payments: PaymentsPaginator;
}) {
    if (payments.last_page <= 1) {
        return null;
    }

    const previous =
        payments.current_page > 1
            ? payments.links.find(
                  (link) =>
                      link.label.includes(
                          'Previous',
                      ),
              )
            : null;

    const next =
        payments.current_page
            < payments.last_page
            ? payments.links.find(
                  (link) =>
                      link.label.includes(
                          'Next',
                      ),
              )
            : null;

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
                Showing {payments.from ?? 0}–
                {payments.to ?? 0} of{' '}
                {payments.total} payments
            </p>

            <div className="flex items-center gap-2">
                {previous?.url ? (
                    <Link
                        href={previous.url}
                        preserveScroll
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    >
                        <ChevronLeft size={16} />
                    </Link>
                ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-100 text-slate-300">
                        <ChevronLeft size={16} />
                    </span>
                )}

                <span className="px-2 text-xs font-bold text-slate-600">
                    Page {payments.current_page}{' '}
                    of {payments.last_page}
                </span>

                {next?.url ? (
                    <Link
                        href={next.url}
                        preserveScroll
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                    >
                        <ChevronRight size={16} />
                    </Link>
                ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-100 text-slate-300">
                        <ChevronRight size={16} />
                    </span>
                )}
            </div>
        </div>
    );
}

function EmptyState({
    searching,
}: {
    searching: boolean;
}) {
    return (
        <div className="px-6 py-16 text-center">
            {searching ? (
                <Search
                    size={44}
                    className="mx-auto text-slate-300"
                />
            ) : (
                <ReceiptText
                    size={44}
                    className="mx-auto text-slate-300"
                />
            )}

            <h2 className="mt-5 text-xl font-black text-slate-800">
                {searching
                    ? 'No matching payments'
                    : 'No payment records yet'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {searching
                    ? 'Try another transaction number, order number, student name, Student ID, or filter.'
                    : 'Confirmed student payments will appear here after a Cashier successfully processes a payment.'}
            </p>
        </div>
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

function formatPaymentMethod(
    method: string | null,
): string {
    if (!method) {
        return 'N/A';
    }

    if (method === 'gcash') {
        return 'GCash';
    }

    if (method === 'maya') {
        return 'Maya';
    }

    if (method === 'cash') {
        return 'Cash';
    }

    return method
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase(),
        );
}