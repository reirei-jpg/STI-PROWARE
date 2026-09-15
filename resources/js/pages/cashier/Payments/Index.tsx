import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    ReceiptText,
    Search,
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

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';

interface PaymentStudent {
    name: string;
    student_id: string;
}

interface ConfirmedBy {
    name: string;
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
    student: PaymentStudent;
    confirmed_by: ConfirmedBy;
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
                                                Order
                                            </th>

                                            <th className="px-6 py-4">
                                                Student
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

                                            <th className="px-6 py-4">
                                                Confirmed By
                                            </th>

                                            <th className="px-6 py-4 text-right">
                                                Action
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
        </CashierLayout>
    );
}

function PaymentRow({
    payment,
}: {
    payment: PaymentRecord;
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
                <p className="whitespace-nowrap font-mono text-xs font-bold text-slate-700">
                    {payment.order_number}
                </p>
            </td>

            <td className="px-6 py-5">
                <p className="font-bold text-slate-900">
                    {payment.student.name}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-400">
                    {payment.student.student_id}
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
                <p className="text-sm font-bold text-slate-700">
                    {formatPaymentMethod(
                        payment.payment_method,
                    )}
                </p>

                {payment.payment_reference && (
                    <p className="mt-1 max-w-36 truncate font-mono text-[11px] text-slate-400">
                        Ref:{' '}
                        {payment.payment_reference}
                    </p>
                )}
            </td>

            <td className="px-6 py-5">
                <p className="whitespace-nowrap text-sm font-semibold text-slate-600">
                    {payment.paid_at
                        ?? 'Unavailable'}
                </p>
            </td>

            <td className="px-6 py-5">
                <p className="whitespace-nowrap text-sm font-bold text-slate-700">
                    {payment.confirmed_by.name}
                </p>
            </td>

            <td className="px-6 py-5 text-right">
                <Link
                    href={cashier.orders.receipt.url(payment.id)}
                    className="
                        inline-flex items-center
                        gap-2 rounded-xl
                        border border-blue-200
                        bg-blue-50 px-3 py-2
                        text-xs font-bold
                        text-blue-700 transition
                        hover:border-blue-300
                        hover:bg-blue-100
                    "
                >
                    <ReceiptText size={15} />

                    View Receipt
                </Link>
            </td>
        </tr>
    );
}

function PaymentCard({
    payment,
}: {
    payment: PaymentRecord;
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

            <div className="mt-5 grid grid-cols-2 gap-4">
                <MobileInfo
                    label="Order"
                    value={payment.order_number}
                />

                <MobileInfo
                    label="Payment"
                    value={formatPaymentMethod(
                        payment.payment_method,
                    )}
                />

                <MobileInfo
                    label="Student"
                    value={payment.student.name}
                    secondary={
                        payment.student.student_id
                    }
                />

                <MobileInfo
                    label="Confirmed By"
                    value={
                        payment.confirmed_by.name
                    }
                />

                <MobileInfo
                    label="Paid At"
                    value={
                        payment.paid_at
                            ?? 'Unavailable'
                    }
                />

                {payment.payment_reference && (
                    <MobileInfo
                        label="Reference"
                        value={
                            payment.payment_reference
                        }
                    />
                )}
            </div>

            <Link
                href={cashier.orders.receipt.url(payment.id)}
                className="
                    mt-5 flex w-full
                    items-center justify-center
                    gap-2 rounded-xl
                    bg-blue-50 px-4 py-3
                    text-sm font-bold
                    text-blue-700 transition
                    hover:bg-blue-100
                "
            >
                <ReceiptText size={16} />

                View Receipt
            </Link>
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