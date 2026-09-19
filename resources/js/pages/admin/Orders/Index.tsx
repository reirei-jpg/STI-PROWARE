import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Search,
    ShieldAlert,
    ShoppingBag,
    XCircle,
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

import AdminLayout from '@/layouts/AdminLayout';

interface StudentInfo {
    name: string;
    student_id: string;
    course: string | null;
}

interface AdminOrder {
    id: number;
    order_number: string;
    source: string;
    order_type: string;
    payment_status: string;
    fulfillment_status: string;
    total: string;
    paid_at: string | null;
    released_at: string | null;
    created_at: string | null;
    student: StudentInfo;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedOrders {
    current_page: number;
    data: AdminOrder[];
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: PaginationLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

interface OrderSummary {
    total: number;
    pending_payment: number;
    paid: number;
    released: number;
    cancelled: number;
}

type OrderFilter =
    | 'all'
    | 'pending_payment'
    | 'paid'
    | 'released'
    | 'cancelled';

interface OrderFilters {
    search: string;
    status: OrderFilter;
}

interface AdminOrdersPageProps {
    orders: PaginatedOrders;
    summary: OrderSummary;
    filters: OrderFilters;
}

export default function Index({
    orders,
    summary,
    filters,
}: AdminOrdersPageProps) {
    const [
        search,
        setSearch,
    ] = useState(
        filters.search ?? '',
    );

    const currentStatus =
        filters.status ?? 'all';

    /*
    |--------------------------------------------------------------------------
    | Debounced Search
    |--------------------------------------------------------------------------
    |
    | Laravel/PostgreSQL performs the actual search.
    |
    */

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    const normalizedSearch =
                        search.trim();

                    if (
                        normalizedSearch ===
                        (
                            filters.search
                            ?? ''
                        )
                    ) {
                        return;
                    }

                    router.get(
                        '/admin/orders',
                        {
                            search:
                                normalizedSearch
                                || undefined,

                            status:
                                currentStatus ===
                                'all'
                                    ? undefined
                                    : currentStatus,
                        },
                        {
                            preserveState: true,
                            preserveScroll: true,
                            replace: true,
                        },
                    );
                },
                350,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        search,
        filters.search,
        currentStatus,
    ]);

    const changeStatus = (
        status: OrderFilter,
    ): void => {
        router.get(
            '/admin/orders',
            {
                search:
                    search.trim()
                    || undefined,

                status:
                    status === 'all'
                        ? undefined
                        : status,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const visitPage = (
        url: string | null,
    ): void => {
        if (!url) {
            return;
        }

        router.visit(
            url,
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    return (
        <AdminLayout>
            <Head title="Orders" />

            <div className="mx-auto max-w-7xl space-y-6">
                {/* BACK */}
                <button
                    type="button"
                    onClick={() =>
                        window.history.back()
                    }
                    className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-bold
                        text-blue-600
                        transition
                        hover:text-blue-800
                    "
                >
                    <ArrowLeft size={17} />

                    Back
                </button>

                {/* HEADER */}
                <section>
                    <p className="text-sm font-black uppercase tracking-wide text-blue-600">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Order Management
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Monitor all student orders,
                        payment progress, fulfillment
                        status, and completed
                        transactions across PROWARE.
                    </p>
                </section>

                {/* SUMMARY */}
                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-5
                    "
                >
                    <SummaryCard
                        label="All Orders"
                        value={summary.total}
                        icon={ShoppingBag}
                        tone="slate"
                    />

                    <SummaryCard
                        label="Pending Payment"
                        value={
                            summary
                                .pending_payment
                        }
                        icon={Clock3}
                        tone="amber"
                    />

                    <SummaryCard
                        label="Paid"
                        value={summary.paid}
                        icon={
                            CheckCircle2
                        }
                        tone="blue"
                    />

                    <SummaryCard
                        label="Released"
                        value={
                            summary.released
                        }
                        icon={
                            CheckCircle2
                        }
                        tone="green"
                    />

                    <SummaryCard
                        label="Cancelled"
                        value={
                            summary.cancelled
                        }
                        icon={XCircle}
                        tone="red"
                    />
                </section>

                {/* INFO */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-blue-100
                        bg-blue-50/70
                        p-5
                    "
                >
                    <div className="flex items-start gap-4">
                        <div
                            className="
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-600
                                text-white
                            "
                        >
                            <ShieldAlert
                                size={20}
                            />
                        </div>

                        <div>
                            <h2 className="font-black text-blue-950">
                                Admin Oversight
                            </h2>

                            <p className="mt-1 max-w-3xl text-sm leading-6 text-blue-800">
                                This page is for
                                monitoring and
                                investigation. Payment
                                confirmation remains
                                the Cashier&apos;s
                                responsibility, while
                                merchandise release
                                remains the
                                Specialist&apos;s
                                responsibility.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SEARCH + FILTER */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                    "
                >
                    <div
                        className="
                            flex
                            flex-col
                            gap-4
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                        "
                    >
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                size={18}
                                className="
                                    absolute
                                    left-4
                                    top-1/2
                                    -translate-y-1/2
                                    text-slate-400
                                "
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search order, student name, or Student ID..."
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    py-3
                                    pl-11
                                    pr-4
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <FilterButton
                                active={
                                    currentStatus ===
                                    'all'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'all',
                                    )
                                }
                            >
                                All
                            </FilterButton>

                            <FilterButton
                                active={
                                    currentStatus ===
                                    'pending_payment'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'pending_payment',
                                    )
                                }
                            >
                                Pending
                            </FilterButton>

                            <FilterButton
                                active={
                                    currentStatus ===
                                    'paid'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'paid',
                                    )
                                }
                            >
                                Paid
                            </FilterButton>

                            <FilterButton
                                active={
                                    currentStatus ===
                                    'released'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'released',
                                    )
                                }
                            >
                                Released
                            </FilterButton>

                            <FilterButton
                                active={
                                    currentStatus ===
                                    'cancelled'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'cancelled',
                                    )
                                }
                            >
                                Cancelled
                            </FilterButton>
                        </div>
                    </div>
                </section>

                {/* TABLE */}
                <section
                    className="
                        overflow-hidden
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >
                    <div
                        className="
                            flex
                            items-center
                            justify-between
                            gap-4
                            border-b
                            border-slate-100
                            px-5
                            py-5
                            sm:px-6
                        "
                    >
                        <div>
                            <h2 className="text-xl font-black text-slate-900">
                                Orders
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {orders.total}{' '}
                                order
                                {orders.total ===
                                1
                                    ? ''
                                    : 's'}{' '}
                                found
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                h-11
                                w-11
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-600
                            "
                        >
                            <ShoppingBag
                                size={21}
                            />
                        </div>
                    </div>

                    {orders.data.length >
                    0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <TableHeader>
                                                Order
                                            </TableHeader>

                                            <TableHeader>
                                                Student
                                            </TableHeader>

                                            <TableHeader>
                                                Payment
                                            </TableHeader>

                                            <TableHeader>
                                                Fulfillment
                                            </TableHeader>

                                            <TableHeader
                                                align="right"
                                            >
                                                Total
                                            </TableHeader>

                                            <TableHeader>
                                                Created
                                            </TableHeader>

                                            <TableHeader
                                                align="right"
                                            >
                                                Action
                                            </TableHeader>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {orders.data.map(
                                            (
                                                order,
                                            ) => (
                                                <OrderRow
                                                    key={
                                                        order.id
                                                    }
                                                    order={
                                                        order
                                                    }
                                                />
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            <div
                                className="
                                    border-t
                                    border-slate-100
                                    px-5
                                    py-5
                                    sm:px-6
                                "
                            >
                                <div
                                    className="
                                        flex
                                        flex-col
                                        gap-4
                                        sm:flex-row
                                        sm:items-center
                                        sm:justify-between
                                    "
                                >
                                    <p className="text-sm text-slate-500">
                                        Showing{' '}
                                        <strong className="text-slate-700">
                                            {orders.from
                                                ?? 0}
                                        </strong>
                                        {' '}to{' '}
                                        <strong className="text-slate-700">
                                            {orders.to
                                                ?? 0}
                                        </strong>
                                        {' '}of{' '}
                                        <strong className="text-slate-700">
                                            {
                                                orders.total
                                            }
                                        </strong>
                                        {' '}orders
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={
                                                !orders
                                                    .prev_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    orders
                                                        .prev_page_url,
                                                )
                                            }
                                            className="
                                                inline-flex
                                                items-center
                                                gap-2
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-2.5
                                                text-sm
                                                font-bold
                                                text-slate-700
                                                transition
                                                hover:bg-slate-50
                                                disabled:cursor-not-allowed
                                                disabled:opacity-40
                                            "
                                        >
                                            <ChevronLeft
                                                size={
                                                    17
                                                }
                                            />

                                            Previous
                                        </button>

                                        <div
                                            className="
                                                rounded-xl
                                                bg-slate-100
                                                px-4
                                                py-2.5
                                                text-sm
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            Page{' '}
                                            {
                                                orders.current_page
                                            }
                                            {' '}of{' '}
                                            {
                                                orders.last_page
                                            }
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                !orders
                                                    .next_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    orders
                                                        .next_page_url,
                                                )
                                            }
                                            className="
                                                inline-flex
                                                items-center
                                                gap-2
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-2.5
                                                text-sm
                                                font-bold
                                                text-slate-700
                                                transition
                                                hover:bg-slate-50
                                                disabled:cursor-not-allowed
                                                disabled:opacity-40
                                            "
                                        >
                                            Next

                                            <ChevronRight
                                                size={
                                                    17
                                                }
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <ShoppingBag
                                size={40}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 font-black text-slate-800">
                                No orders found
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Try changing the search
                                term or status filter.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}

type SummaryTone =
    | 'slate'
    | 'amber'
    | 'blue'
    | 'green'
    | 'red';

function SummaryCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: typeof ShoppingBag;
    tone: SummaryTone;
}) {
    const styles = {
        slate: {
            card:
                'border-slate-200 bg-white',

            icon:
                'bg-slate-100 text-slate-700',

            value:
                'text-slate-900',
        },

        amber: {
            card:
                'border-amber-200 bg-amber-50/60',

            icon:
                'bg-amber-100 text-amber-700',

            value:
                'text-amber-700',
        },

        blue: {
            card:
                'border-blue-200 bg-blue-50/60',

            icon:
                'bg-blue-100 text-blue-700',

            value:
                'text-blue-700',
        },

        green: {
            card:
                'border-emerald-200 bg-emerald-50/60',

            icon:
                'bg-emerald-100 text-emerald-700',

            value:
                'text-emerald-700',
        },

        red: {
            card:
                'border-red-200 bg-red-50/60',

            icon:
                'bg-red-100 text-red-700',

            value:
                'text-red-700',
        },
    };

    const style =
        styles[tone];

    return (
        <article
            className={`
                rounded-2xl
                border
                p-5
                shadow-sm
                ${style.card}
            `}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {label}
                    </p>

                    <p
                        className={`
                            mt-2
                            text-3xl
                            font-black
                            ${style.value}
                        `}
                    >
                        {value}
                    </p>
                </div>

                <div
                    className={`
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-xl
                        ${style.icon}
                    `}
                >
                    <Icon size={20} />
                </div>
            </div>
        </article>
    );
}

function OrderRow({
    order,
}: {
    order: AdminOrder;
}) {
    const payment =
        getPaymentStatus(
            order.payment_status,
        );

    const fulfillment =
        getFulfillmentStatus(
            order.fulfillment_status,
        );

    return (
        <tr className="transition hover:bg-slate-50/70">
            <td className="whitespace-nowrap px-6 py-5">
                <p className="font-mono text-xs font-black text-blue-600">
                    {order.order_number}
                </p>

                <p className="mt-1 text-xs capitalize text-slate-400">
                    {formatValue(
                        order.order_type,
                    )}
                </p>
            </td>

            <td className="px-6 py-5">
                <p className="font-black text-slate-900">
                    {order.student.name}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-500">
                    {
                        order.student
                            .student_id
                    }
                </p>

                {order.student.course && (
                    <p className="mt-1 text-xs text-slate-400">
                        {
                            order.student
                                .course
                        }
                    </p>
                )}
            </td>

            <td className="whitespace-nowrap px-6 py-5">
                <span
                    className={`
                        inline-flex
                        rounded-full
                        px-3
                        py-1.5
                        text-xs
                        font-black
                        ${payment.className}
                    `}
                >
                    {payment.label}
                </span>
            </td>

            <td className="whitespace-nowrap px-6 py-5">
                <span
                    className={`
                        inline-flex
                        rounded-full
                        px-3
                        py-1.5
                        text-xs
                        font-black
                        ${fulfillment.className}
                    `}
                >
                    {fulfillment.label}
                </span>
            </td>

            <td className="whitespace-nowrap px-6 py-5 text-right font-black text-slate-900">
                {formatCurrency(
                    order.total,
                )}
            </td>

            <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-500">
                {order.created_at
                    ?? 'N/A'}
            </td>

            <td className="whitespace-nowrap px-6 py-5 text-right">
                <Link
                    href={`/admin/orders/${order.id}`}
                    className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-xl
                        bg-blue-50
                        px-4
                        py-2.5
                        text-sm
                        font-black
                        text-blue-700
                        transition
                        hover:bg-blue-100
                    "
                >
                    View

                    <ArrowRight
                        size={15}
                    />
                </Link>
            </td>
        </tr>
    );
}

function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                rounded-xl
                px-4
                py-2.5
                text-xs
                font-bold
                transition

                ${
                    active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
            `}
        >
            {children}
        </button>
    );
}

function TableHeader({
    children,
    align = 'left',
}: {
    children: React.ReactNode;
    align?: 'left' | 'right';
}) {
    return (
        <th
            className={`
                px-6
                py-4
                text-xs
                font-black
                uppercase
                tracking-wide
                text-slate-400

                ${
                    align === 'right'
                        ? 'text-right'
                        : 'text-left'
                }
            `}
        >
            {children}
        </th>
    );
}

function getPaymentStatus(
    status: string,
): {
    label: string;
    className: string;
} {
    if (status === 'paid') {
        return {
            label: 'Paid',

            className:
                'bg-emerald-100 text-emerald-700',
        };
    }

    if (
        status === 'cancelled'
    ) {
        return {
            label: 'Cancelled',

            className:
                'bg-red-100 text-red-700',
        };
    }

    if (status === 'refunded') {
        return {
            label: 'Refunded',

            className:
                'bg-red-100 text-red-700',
        };
    }

    return {
        label: 'Pending',

        className:
            'bg-amber-100 text-amber-700',
    };
}

function getFulfillmentStatus(
    status: string,
): {
    label: string;
    className: string;
} {
    if (status === 'released') {
        return {
            label: 'Released',

            className:
                'bg-emerald-100 text-emerald-700',
        };
    }

    if (
        status ===
        'ready_for_release'
    ) {
        return {
            label:
                'Ready for Release',

            className:
                'bg-blue-100 text-blue-700',
        };
    }

    if (status === 'preparing') {
        return {
            label: 'Preparing',

            className:
                'bg-blue-100 text-blue-700',
        };
    }

    if (status === 'cancelled') {
        return {
            label: 'Cancelled',

            className:
                'bg-red-100 text-red-700',
        };
    }

    return {
        label: formatValue(
            status,
        ),

        className:
            'bg-slate-100 text-slate-700',
    };
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

function formatValue(
    value: string,
): string {
    return value
        .replace(
            /_/g,
            ' ',
        )
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character.toUpperCase(),
        );
}