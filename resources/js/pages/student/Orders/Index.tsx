import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Eye,
    History,
    PackageCheck,
    ReceiptText,
    ShoppingBag,
    XCircle,
} from 'lucide-react';

import type {
    LucideIcon,
} from 'lucide-react';

import {
    Head,
    Link,
} from '@inertiajs/react';

import {
    useMemo,
    useState,
} from 'react';

import StudentLayout from '@/layouts/StudentLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface StudentOrder {
    id: number;

    order_number: string;

    order_type: string;

    payment_status: string;

    fulfillment_status: string;

    subtotal: string;

    total: string;

    total_quantity: number;

    items_count: number;

    preview_item: {
        id: number;
        product_name: string;
        product_code: string;
        variant_name: string | null;
        program: string | null;
        size: string | null;
        quantity: number;
        image_url: string | null;
    } | null;

    additional_items_count: number;

    transaction_number?: string | null;

    created_at: string | null;
    created_at_iso: string | null;

    paid_at: string | null;
    paid_at_iso: string | null;

    ready_for_release_at: string | null;

    released_at: string | null;
    released_at_iso: string | null;

    cancelled_at: string | null;
}

interface OrderSummary {
    pending_payment: number;

    paid: number;

    ready_for_release: number;

    released: number;
}

interface HistorySummary {
    paid_today: number;

    released_today: number;
}

interface OrdersIndexProps {
    orderSummary: OrderSummary;

    historySummary: HistorySummary;

    orders: StudentOrder[];
}

interface OverallOrderStatus {
    label: string;

    description: string;

    badgeClass: string;

    icon: LucideIcon;
}

type MainTab =
    | 'active'
    | 'history';

type ActiveFilter =
    | 'all'
    | 'pending_payment'
    | 'paid'
    | 'ready_for_release';

type HistoryFilter =
    | 'all'
    | 'paid_today'
    | 'released_today'
    | 'this_week'
    | 'this_month';

/*
|--------------------------------------------------------------------------
| My Orders
|--------------------------------------------------------------------------
*/

export default function Index({
    orderSummary,
    historySummary,
    orders,
}: OrdersIndexProps) {
    const [
        activeTab,
        setActiveTab,
    ] =
        useState<MainTab>(
            'active',
        );

    const [
        activeFilter,
        setActiveFilter,
    ] =
        useState<ActiveFilter>(
            'all',
        );

    const [
        historyFilter,
        setHistoryFilter,
    ] =
        useState<HistoryFilter>(
            'all',
        );

    /*
    |--------------------------------------------------------------------------
    | Active Orders
    |--------------------------------------------------------------------------
    |
    | Active orders are transactions that still require payment,
    | preparation, pickup, or release.
    |
    | Released and cancelled transactions are excluded here.
    |
    */

    const activeOrders =
        useMemo(
            () =>
                orders.filter(
                    (order) => {
                        if (
                            order
                                .fulfillment_status
                            === 'released'
                            ||
                            order
                                .fulfillment_status
                            === 'cancelled'
                            ||
                            order
                                .payment_status
                            === 'cancelled'
                        ) {
                            return false;
                        }

                        if (
                            activeFilter ===
                            'all'
                        ) {
                            return true;
                        }

                        if (
                            activeFilter ===
                            'pending_payment'
                        ) {
                            return (
                                order
                                    .payment_status
                                === 'pending'
                            );
                        }

                        if (
                            activeFilter ===
                            'paid'
                        ) {
                            return (
                                order
                                    .payment_status
                                === 'paid'
                                &&
                                (
                                    order
                                        .fulfillment_status
                                    === 'pending'
                                    ||
                                    order
                                        .fulfillment_status
                                    === 'preparing'
                                )
                            );
                        }

                        if (
                            activeFilter ===
                            'ready_for_release'
                        ) {
                            return (
                                order
                                    .payment_status
                                === 'paid'
                                &&
                                order
                                    .fulfillment_status
                                ===
                                    'ready_for_release'
                            );
                        }

                        return true;
                    },
                ),
            [
                activeFilter,
                orders,
            ],
        );

    /*
    |--------------------------------------------------------------------------
    | Historical Orders
    |--------------------------------------------------------------------------
    |
    | History contains completed or cancelled transactions.
    |
    */

    const historyOrders =
        useMemo(
            () =>
                orders.filter(
                    (order) =>
                        order
                            .fulfillment_status
                        === 'released'
                        ||
                        order
                            .fulfillment_status
                        === 'cancelled'
                        ||
                        order
                            .payment_status
                        === 'cancelled',
                ),
            [orders],
        );

    /*
    |--------------------------------------------------------------------------
    | Filtered History
    |--------------------------------------------------------------------------
    */

    const filteredHistory =
        useMemo(
            () => {
                if (
                    historyFilter ===
                    'all'
                ) {
                    return historyOrders;
                }

                return historyOrders.filter(
                    (order) => {
                        if (
                            historyFilter ===
                            'paid_today'
                        ) {
                            return isToday(
                                order
                                    .paid_at_iso,
                            );
                        }

                        if (
                            historyFilter ===
                            'released_today'
                        ) {
                            return isToday(
                                order
                                    .released_at_iso,
                            );
                        }

                        if (
                            historyFilter ===
                            'this_week'
                        ) {
                            return isThisWeek(
                                getHistoryDate(
                                    order,
                                ),
                            );
                        }

                        if (
                            historyFilter ===
                            'this_month'
                        ) {
                            return isThisMonth(
                                getHistoryDate(
                                    order,
                                ),
                            );
                        }

                        return true;
                    },
                );
            },
            [
                historyFilter,
                historyOrders,
            ],
        );

    return (
        <StudentLayout>
            <Head title="My Orders" />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/*
                |--------------------------------------------------------------------------
                | Page Header
                |--------------------------------------------------------------------------
                */}

                <div>
                    <p
                        className="
                            text-sm
                            font-bold
                            uppercase
                            tracking-wide
                            text-blue-600
                        "
                    >
                        STI PROWARE
                    </p>

                    <h1
                        className="
                            mt-1
                            text-3xl
                            font-black
                            text-slate-900
                        "
                    >
                        My Orders
                    </h1>

                    <p
                        className="
                            mt-2
                            text-sm
                            leading-6
                            text-slate-500
                        "
                    >
                        Track active orders,
                        payment status, pickup
                        progress, receipts, and
                        completed transaction
                        history.
                    </p>
                </div>

                {/*
                |--------------------------------------------------------------------------
                | Summary Cards
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <SummaryCard
                        title="Pending Payment"
                        value={
                            orderSummary
                                .pending_payment
                        }
                        description="Waiting for cashier payment confirmation"
                        icon={Clock3}
                        tone="amber"
                        onClick={() => {
                            setActiveTab(
                                'active',
                            );

                            setActiveFilter(
                                'pending_payment',
                            );
                        }}
                    />

                    <SummaryCard
                        title="Paid"
                        value={
                            orderSummary.paid
                        }
                        description="Paid orders still being processed"
                        icon={
                            CheckCircle2
                        }
                        tone="blue"
                        onClick={() => {
                            setActiveTab(
                                'active',
                            );

                            setActiveFilter(
                                'paid',
                            );
                        }}
                    />

                    <SummaryCard
                        title="Ready for Pickup"
                        value={
                            orderSummary
                                .ready_for_release
                        }
                        description="Orders currently ready to claim"
                        icon={
                            PackageCheck
                        }
                        tone="green"
                        onClick={() => {
                            setActiveTab(
                                'active',
                            );

                            setActiveFilter(
                                'ready_for_release',
                            );
                        }}
                    />

                    <SummaryCard
                        title="Released"
                        value={
                            orderSummary
                                .released
                        }
                        description="Successfully completed transactions"
                        icon={
                            History
                        }
                        tone="slate"
                        onClick={() => {
                            setActiveTab(
                                'history',
                            );

                            setHistoryFilter(
                                'all',
                            );
                        }}
                    />
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Active / History Tabs
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-2
                        shadow-sm
                    "
                >
                    <div
                        className="
                            grid
                            gap-2
                            sm:grid-cols-2
                        "
                    >
                        <button
                            type="button"
                            onClick={() =>
                                setActiveTab(
                                    'active',
                                )
                            }
                            className={`
                                flex
                                items-center
                                justify-center
                                gap-2
                                rounded-2xl
                                px-5
                                py-3
                                text-sm
                                font-black
                                transition

                                ${
                                    activeTab ===
                                    'active'
                                        ? 'bg-[#0D6EFD] text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }
                            `}
                        >
                            <PackageCheck
                                size={18}
                            />

                            Active Orders
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setActiveTab(
                                    'history',
                                )
                            }
                            className={`
                                flex
                                items-center
                                justify-center
                                gap-2
                                rounded-2xl
                                px-5
                                py-3
                                text-sm
                                font-black
                                transition

                                ${
                                    activeTab ===
                                    'history'
                                        ? 'bg-[#0D6EFD] text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50'
                                }
                            `}
                        >
                            <History
                                size={18}
                            />

                            Order History
                        </button>
                    </div>
                </section>

                {activeTab ===
                'active' ? (
                    <ActiveOrdersSection
                        orders={
                            activeOrders
                        }
                        totalOrders={
                            orders.length
                        }
                        filter={
                            activeFilter
                        }
                        onFilterChange={
                            setActiveFilter
                        }
                    />
                ) : (
                    <HistorySection
                        orders={
                            filteredHistory
                        }
                        totalHistory={
                            historyOrders.length
                        }
                        filter={
                            historyFilter
                        }
                        historySummary={
                            historySummary
                        }
                        onFilterChange={
                            setHistoryFilter
                        }
                    />
                )}
            </div>
        </StudentLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Active Orders Section
|--------------------------------------------------------------------------
*/

function ActiveOrdersSection({
    orders,
    totalOrders,
    filter,
    onFilterChange,
}: {
    orders: StudentOrder[];

    totalOrders: number;

    filter: ActiveFilter;

    onFilterChange:
        (
            value: ActiveFilter,
        ) => void;
}) {
    return (
        <section className="space-y-6">
            <div
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
                    <div>
                        <h2
                            className="
                                text-xl
                                font-black
                                text-slate-900
                            "
                        >
                            Active Orders
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            {
                                orders.length
                            }{' '}
                            active order
                            {orders.length ===
                            1
                                ? ''
                                : 's'}{' '}
                            shown
                        </p>
                    </div>

                    <div
                        className="
                            flex
                            flex-wrap
                            gap-2
                        "
                    >
                        <ActiveFilterButton
                            label="All Active"
                            value="all"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <ActiveFilterButton
                            label="Pending Payment"
                            value="pending_payment"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <ActiveFilterButton
                            label="Paid"
                            value="paid"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <ActiveFilterButton
                            label="Ready for Pickup"
                            value="ready_for_release"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />
                    </div>
                </div>
            </div>

            {orders.length > 0 ? (
                <section
                    className="
                        grid
                        gap-6
                        md:grid-cols-2
                        xl:grid-cols-3
                    "
                >
                    {orders.map(
                        (order) => (
                            <OrderCard
                                key={
                                    order.id
                                }
                                order={
                                    order
                                }
                            />
                        ),
                    )}
                </section>
            ) : (
                <FilteredEmptyState
                    title={
                        totalOrders === 0
                            ? 'No orders yet'
                            : 'No active orders in this status'
                    }
                    message={
                        totalOrders === 0
                            ? 'Orders you successfully check out will appear here.'
                            : 'Try another active order filter.'
                    }
                    action={
                        totalOrders === 0
                            ? 'shop'
                            : 'clear'
                    }
                    onClear={() =>
                        onFilterChange(
                            'all',
                        )
                    }
                />
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Order History
|--------------------------------------------------------------------------
*/

function HistorySection({
    orders,
    totalHistory,
    filter,
    historySummary,
    onFilterChange,
}: {
    orders: StudentOrder[];

    totalHistory: number;

    filter: HistoryFilter;

    historySummary: HistorySummary;

    onFilterChange:
        (
            value: HistoryFilter,
        ) => void;
}) {
    return (
        <section className="space-y-6">
            {/*
            |--------------------------------------------------------------------------
            | History Quick Summary
            |--------------------------------------------------------------------------
            */}

            <div
                className="
                    grid
                    gap-4
                    sm:grid-cols-2
                "
            >
                <HistorySummaryCard
                    title="Paid Today"
                    value={
                        historySummary
                            .paid_today
                    }
                    description="Orders paid today"
                    icon={
                        CheckCircle2
                    }
                />

                <HistorySummaryCard
                    title="Released Today"
                    value={
                        historySummary
                            .released_today
                    }
                    description="Orders completed today"
                    icon={
                        PackageCheck
                    }
                />
            </div>

            {/*
            |--------------------------------------------------------------------------
            | History Filters
            |--------------------------------------------------------------------------
            */}

            <div
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
                    <div>
                        <h2
                            className="
                                text-xl
                                font-black
                                text-slate-900
                            "
                        >
                            Order History
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            {
                                orders.length
                            }{' '}
                            historical transaction
                            {orders.length ===
                            1
                                ? ''
                                : 's'}{' '}
                            shown
                        </p>
                    </div>

                    <div
                        className="
                            flex
                            flex-wrap
                            gap-2
                        "
                    >
                        <HistoryFilterButton
                            label="All History"
                            value="all"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <HistoryFilterButton
                            label="Paid Today"
                            value="paid_today"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <HistoryFilterButton
                            label="Released Today"
                            value="released_today"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <HistoryFilterButton
                            label="This Week"
                            value="this_week"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />

                        <HistoryFilterButton
                            label="This Month"
                            value="this_month"
                            activeFilter={
                                filter
                            }
                            onClick={
                                onFilterChange
                            }
                        />
                    </div>
                </div>
            </div>

            {orders.length > 0 ? (
                <section
                    className="
                        grid
                        gap-6
                        md:grid-cols-2
                        xl:grid-cols-3
                    "
                >
                    {orders.map(
                        (order) => (
                            <OrderCard
                                key={
                                    order.id
                                }
                                order={
                                    order
                                }
                                showHistoryDetails
                            />
                        ),
                    )}
                </section>
            ) : (
                <FilteredEmptyState
                    title={
                        totalHistory === 0
                            ? 'No order history yet'
                            : 'No history in this period'
                    }
                    message={
                        totalHistory === 0
                            ? 'Released and cancelled transactions will appear here.'
                            : 'Try another history filter.'
                    }
                    action="clear"
                    onClear={() =>
                        onFilterChange(
                            'all',
                        )
                    }
                />
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone =
    | 'amber'
    | 'blue'
    | 'green'
    | 'slate';

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
    tone,
    onClick,
}: {
    title: string;

    value: number;

    description: string;

    icon: LucideIcon;

    tone: SummaryTone;

    onClick: () => void;
}) {
    const tones: Record<
        SummaryTone,
        {
            card: string;
            icon: string;
            value: string;
        }
    > = {
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

        slate: {
            card:
                'border-slate-200 bg-slate-50',

            icon:
                'bg-slate-200 text-slate-700',

            value:
                'text-slate-700',
        },
    };

    const style =
        tones[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                w-full
                rounded-2xl
                border
                p-5
                text-left
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:shadow-md
                ${style.card}
            `}
        >
            <div
                className="
                    flex
                    items-start
                    justify-between
                    gap-4
                "
            >
                <div>
                    <p
                        className="
                            text-sm
                            font-bold
                            text-slate-700
                        "
                    >
                        {title}
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
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        ${style.icon}
                    `}
                >
                    <Icon size={20} />
                </div>
            </div>

            <p
                className="
                    mt-3
                    text-xs
                    leading-5
                    text-slate-500
                "
            >
                {description}
            </p>
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| History Summary Card
|--------------------------------------------------------------------------
*/

function HistorySummaryCard({
    title,
    value,
    description,
    icon: Icon,
}: {
    title: string;

    value: number;

    description: string;

    icon: LucideIcon;
}) {
    return (
        <article
            className="
                rounded-2xl
                border
                border-blue-100
                bg-blue-50/60
                p-5
                shadow-sm
            "
        >
            <div
                className="
                    flex
                    items-start
                    justify-between
                    gap-4
                "
            >
                <div>
                    <p
                        className="
                            text-sm
                            font-bold
                            text-slate-700
                        "
                    >
                        {title}
                    </p>

                    <p
                        className="
                            mt-2
                            text-3xl
                            font-black
                            text-blue-700
                        "
                    >
                        {value}
                    </p>

                    <p
                        className="
                            mt-2
                            text-xs
                            text-slate-500
                        "
                    >
                        {description}
                    </p>
                </div>

                <div
                    className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-100
                        text-blue-700
                    "
                >
                    <Icon size={20} />
                </div>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Filter Buttons
|--------------------------------------------------------------------------
*/

function ActiveFilterButton({
    label,
    value,
    activeFilter,
    onClick,
}: {
    label: string;

    value: ActiveFilter;

    activeFilter:
        ActiveFilter;

    onClick:
        (
            value:
                ActiveFilter,
        ) => void;
}) {
    const active =
        value ===
        activeFilter;

    return (
        <button
            type="button"
            onClick={() =>
                onClick(value)
            }
            className={`
                rounded-full
                border
                px-4
                py-2
                text-sm
                font-bold
                transition

                ${
                    active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                }
            `}
        >
            {label}
        </button>
    );
}

function HistoryFilterButton({
    label,
    value,
    activeFilter,
    onClick,
}: {
    label: string;

    value:
        HistoryFilter;

    activeFilter:
        HistoryFilter;

    onClick:
        (
            value:
                HistoryFilter,
        ) => void;
}) {
    const active =
        value ===
        activeFilter;

    return (
        <button
            type="button"
            onClick={() =>
                onClick(value)
            }
            className={`
                rounded-full
                border
                px-4
                py-2
                text-sm
                font-bold
                transition

                ${
                    active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                }
            `}
        >
            {label}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Order Card
|--------------------------------------------------------------------------
*/

function OrderCard({
    order,
    showHistoryDetails = false,
}: {
    order: StudentOrder;

    showHistoryDetails?: boolean;
}) {
    const status =
        getOrderStatus(
            order,
        );

    const StatusIcon =
        status.icon;

    const canViewReceipt =
        order.payment_status ===
        'paid';

    return (
        <article
            className="
                rounded-3xl
                border
                border-slate-200
                bg-white
                p-6
                shadow-sm
                transition
                hover:border-blue-200
                hover:shadow-md
            "
        >
            <div
                className="
                    flex
                    items-start
                    justify-between
                    gap-4
                "
            >
                <div className="min-w-0">
                    <p
                        className="
                            font-mono
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-blue-600
                        "
                    >
                        {
                            order.order_number
                        }
                    </p>

                    <p
                        className="
                            mt-2
                            text-sm
                            text-slate-500
                        "
                    >
                        {order.created_at
                            ?? 'Date unavailable'}
                    </p>
                </div>

                <div
                    className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-blue-50
                        text-blue-600
                    "
                >
                    <ShoppingBag
                        size={20}
                    />
                </div>
            </div>

            <div className="mt-5">
                <span
                    className={`
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        px-3
                        py-1.5
                        text-xs
                        font-bold
                        ${status.badgeClass}
                    `}
                >
                    <StatusIcon
                        size={14}
                    />

                    {
                        status.label
                    }
                </span>
            </div>

            <div
                className="
                    mt-5
                    rounded-2xl
                    bg-slate-50
                    p-4
                "
            >
                <p
                    className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                    "
                >
                    Current Status
                </p>

                <p
                    className="
                        mt-2
                        font-black
                        text-slate-900
                    "
                >
                    {status.label}
                </p>

                <p
                    className="
                        mt-1
                        text-sm
                        leading-6
                        text-slate-500
                    "
                >
                    {
                        status.description
                    }
                </p>
            </div>

{/* Merchandise Preview */}
{order.preview_item && (
    <div
        className="
            mt-5
            rounded-2xl
            border
            border-slate-200
            bg-slate-50/70
            p-4
        "
    >
        <div className="flex items-center gap-4">
            {/* Product Image */}
            <div
                className="
                    flex
                    h-24
                    w-24
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                "
            >
                {order.preview_item.image_url ? (
                    <img
                        src={
                            order.preview_item
                                .image_url
                        }
                        alt={
                            order.preview_item
                                .product_name
                        }
                        className="
                            h-full
                            w-full
                            object-cover
                        "
                    />
                ) : (
                    <ShoppingBag
                        size={30}
                        className="text-slate-300"
                    />
                )}
            </div>

            {/* Product Information */}
            <div className="min-w-0 flex-1">
                <p
                    className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-blue-600
                    "
                >
                    {
                        order.preview_item
                            .product_code
                    }
                </p>

                <h3
                    className="
                        mt-1
                        truncate
                        text-base
                        font-black
                        text-slate-900
                    "
                >
                    {
                        order.preview_item
                            .product_name
                    }
                </h3>

                {order.preview_item
                    .variant_name && (
                    <p
                        className="
                            mt-1
                            text-sm
                            font-medium
                            text-slate-600
                        "
                    >
                        {
                            order.preview_item
                                .variant_name
                        }
                    </p>
                )}

                <div
                    className="
                        mt-2
                        flex
                        flex-wrap
                        items-center
                        gap-2
                    "
                >
                    <span
                        className="
                            rounded-full
                            bg-white
                            px-2.5
                            py-1
                            text-xs
                            font-bold
                            text-slate-600
                            shadow-sm
                        "
                    >
                        Qty{' '}
                        {
                            order.preview_item
                                .quantity
                        }
                    </span>

                    {order.additional_items_count >
                        0 && (
                        <span
                            className="
                                rounded-full
                                bg-blue-100
                                px-2.5
                                py-1
                                text-xs
                                font-black
                                text-blue-700
                            "
                        >
                            +
                            {
                                order
                                    .additional_items_count
                            }{' '}
                            more{' '}
                            {order
                                .additional_items_count ===
                            1
                                ? 'item'
                                : 'items'}
                        </span>
                    )}
                </div>
            </div>
        </div>

        {order.additional_items_count > 0 && (
            <p
                className="
                    mt-3
                    border-t
                    border-slate-200
                    pt-3
                    text-xs
                    leading-5
                    text-slate-500
                "
            >
                This order contains{' '}
                <span className="font-bold text-slate-700">
                    {order.items_count}{' '}
                    {order.items_count === 1
                        ? 'item'
                        : 'items'}
                </span>
                . Open the order to view all
                merchandise.
            </p>
        )}
    </div>
)}


            <div className="mt-5 space-y-3">
                <StatusRow
                    icon={Clock3}
                    label="Payment"
                    value={
                        formatStatus(
                            order
                                .payment_status,
                        )
                    }
                    tone={
                        order
                            .payment_status
                        === 'paid'
                            ? 'green'
                            : order
                                      .payment_status
                                  ===
                                  'cancelled'
                              ? 'red'
                              : 'yellow'
                    }
                />

                <StatusRow
                    icon={
                        PackageCheck
                    }
                    label="Fulfillment"
                    value={
                        formatStatus(
                            order
                                .fulfillment_status,
                        )
                    }
                    tone={
                        order
                            .fulfillment_status
                        === 'released'
                            ? 'green'
                            : order
                                      .fulfillment_status
                                  ===
                                  'cancelled'
                              ? 'red'
                              : 'blue'
                    }
                />
            </div>

            {showHistoryDetails && (
                <HistoryDetails
                    order={order}
                />
            )}

            <div
                className="
                    mt-5
                    grid
                    grid-cols-2
                    gap-3
                "
            >
                <InfoBox
                    label="Items"
                    value={String(
                        order
                            .items_count,
                    )}
                />

                <InfoBox
                    label="Quantity"
                    value={String(
                        order
                            .total_quantity,
                    )}
                />
            </div>

            <div
                className="
                    mt-5
                    border-t
                    border-slate-100
                    pt-5
                "
            >
                <div
                    className="
                        flex
                        items-end
                        justify-between
                        gap-4
                    "
                >
                    <div>
                        <p className="text-xs text-slate-400">
                            Order Type
                        </p>

                        <p
                            className="
                                mt-1
                                text-sm
                                font-bold
                                text-slate-700
                            "
                        >
                            {formatStatus(
                                order
                                    .order_type,
                            )}
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-slate-400">
                            Total
                        </p>

                        <p
                            className="
                                mt-1
                                text-xl
                                font-black
                                text-slate-900
                            "
                        >
                            {formatCurrency(
                                order.total,
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div
                className={`
                    mt-5
                    grid
                    gap-3

                    ${
                        canViewReceipt
                            ? 'sm:grid-cols-2'
                            : 'grid-cols-1'
                    }
                `}
            >
                <Link
                    href={
                        `/student/orders/${order.id}`
                    }
                    className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-blue-200
                        bg-blue-50
                        px-4
                        py-3
                        text-sm
                        font-bold
                        text-blue-700
                        transition
                        hover:bg-blue-100
                    "
                >
                    <Eye size={17} />

                    View Order
                </Link>

                {canViewReceipt && (
                    <Link
                        href={
                            `/student/orders/${order.id}/receipt`
                        }
                        className="
                            flex
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-[#0D6EFD]
                            px-4
                            py-3
                            text-sm
                            font-black
                            text-white
                            transition
                            hover:bg-blue-700
                        "
                    >
                        <ReceiptText
                            size={17}
                        />

                        View Receipt
                    </Link>
                )}
            </div>

            {canViewReceipt && (
                <div
                    className="
                        mt-4
                        rounded-xl
                        border
                        border-emerald-100
                        bg-emerald-50
                        px-4
                        py-3
                    "
                >
                    <div
                        className="
                            flex
                            items-start
                            gap-2
                        "
                    >
                        <CheckCircle2
                            size={16}
                            className="
                                mt-0.5
                                shrink-0
                                text-emerald-600
                            "
                        />

                        <p
                            className="
                                text-xs
                                leading-5
                                text-emerald-700
                            "
                        >
                            Payment confirmed.
                            Your digital receipt
                            is available.
                        </p>
                    </div>
                </div>
            )}
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| History Details
|--------------------------------------------------------------------------
*/

function HistoryDetails({
    order,
}: {
    order: StudentOrder;
}) {
    return (
        <div
            className="
                mt-5
                space-y-3
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
            "
        >
            <div
                className="
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-black
                    text-slate-800
                "
            >
                <CalendarDays
                    size={17}
                    className="text-blue-600"
                />

                Transaction History
            </div>

            <HistoryRow
                label="Order Date"
                value={
                    order.created_at
                    ?? 'Unavailable'
                }
            />

            {order.paid_at && (
                <HistoryRow
                    label="Paid"
                    value={
                        order.paid_at
                    }
                />
            )}

            {order
                .ready_for_release_at && (
                <HistoryRow
                    label="Ready for Pickup"
                    value={
                        order
                            .ready_for_release_at
                    }
                />
            )}

            {order.released_at && (
                <HistoryRow
                    label="Released"
                    value={
                        order
                            .released_at
                    }
                />
            )}

            {order.cancelled_at && (
                <HistoryRow
                    label="Cancelled"
                    value={
                        order
                            .cancelled_at
                    }
                />
            )}

            {order
                .transaction_number && (
                <HistoryRow
                    label="Transaction No."
                    value={
                        order
                            .transaction_number
                    }
                    mono
                />
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| History Row
|--------------------------------------------------------------------------
*/

function HistoryRow({
    label,
    value,
    mono = false,
}: {
    label: string;

    value: string;

    mono?: boolean;
}) {
    return (
        <div
            className="
                flex
                items-start
                justify-between
                gap-4
                text-sm
            "
        >
            <span className="text-slate-500">
                {label}
            </span>

            <span
                className={`
                    text-right
                    font-bold
                    text-slate-800

                    ${
                        mono
                            ? 'font-mono text-xs'
                            : ''
                    }
                `}
            >
                {value}
            </span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Status Row
|--------------------------------------------------------------------------
*/

function StatusRow({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;

    label: string;

    value: string;

    tone:
        | 'yellow'
        | 'blue'
        | 'green'
        | 'red';
}) {
    const toneClasses = {
        yellow:
            'bg-amber-50 text-amber-700',

        blue:
            'bg-blue-50 text-blue-700',

        green:
            'bg-emerald-50 text-emerald-700',

        red:
            'bg-red-50 text-red-700',
    };

    return (
        <div
            className="
                flex
                items-center
                gap-3
                rounded-2xl
                bg-slate-50
                px-4
                py-3
            "
        >
            <div
                className={`
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${toneClasses[tone]}
                `}
            >
                <Icon size={17} />
            </div>

            <div>
                <p
                    className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                    "
                >
                    {label}
                </p>

                <p
                    className="
                        mt-1
                        text-sm
                        font-black
                        text-slate-800
                    "
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Info Box
|--------------------------------------------------------------------------
*/

function InfoBox({
    label,
    value,
}: {
    label: string;

    value: string;
}) {
    return (
        <div
            className="
                rounded-2xl
                bg-slate-50
                px-4
                py-3
            "
        >
            <p
                className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-400
                "
            >
                {label}
            </p>

            <p
                className="
                    mt-1
                    text-lg
                    font-black
                    text-slate-900
                "
            >
                {value}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function FilteredEmptyState({
    title,
    message,
    action,
    onClear,
}: {
    title: string;

    message: string;

    action:
        | 'shop'
        | 'clear';

    onClear: () => void;
}) {
    return (
        <section
            className="
                rounded-3xl
                border
                border-slate-200
                bg-white
                px-6
                py-16
                text-center
                shadow-sm
            "
        >
            <ShoppingBag
                size={46}
                className="
                    mx-auto
                    text-slate-300
                "
            />

            <h2
                className="
                    mt-5
                    text-xl
                    font-black
                    text-slate-800
                "
            >
                {title}
            </h2>

            <p
                className="
                    mx-auto
                    mt-2
                    max-w-md
                    text-sm
                    leading-6
                    text-slate-500
                "
            >
                {message}
            </p>

            {action ===
            'shop' ? (
                <Link
                    href="/student/dashboard#merchandise"
                    className="
                        mt-6
                        inline-flex
                        items-center
                        justify-center
                        rounded-xl
                        bg-[#0D6EFD]
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-white
                        transition
                        hover:bg-blue-700
                    "
                >
                    Shop Merchandise
                </Link>
            ) : (
                <button
                    type="button"
                    onClick={
                        onClear
                    }
                    className="
                        mt-6
                        rounded-xl
                        bg-[#0D6EFD]
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-white
                        transition
                        hover:bg-blue-700
                    "
                >
                    Show All
                </button>
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Overall Status
|--------------------------------------------------------------------------
*/

function getOrderStatus(
    order: StudentOrder,
): OverallOrderStatus {
    if (
        order.payment_status ===
            'cancelled'
        ||
        order.fulfillment_status ===
            'cancelled'
    ) {
        return {
            label:
                'Cancelled',

            description:
                'This order has been cancelled and will not continue to fulfillment.',

            badgeClass:
                'bg-red-100 text-red-700',

            icon:
                XCircle,
        };
    }

    if (
        order.fulfillment_status ===
        'released'
    ) {
        return {
            label:
                'Released',

            description:
                'Your merchandise has been successfully released to you.',

            badgeClass:
                'bg-emerald-100 text-emerald-700',

            icon:
                CheckCircle2,
        };
    }

    if (
        order.fulfillment_status ===
        'ready_for_release'
    ) {
        return {
            label:
                'Ready for Pickup',

            description:
                'Your merchandise is ready for pickup at PROWARE.',

            badgeClass:
                'bg-emerald-100 text-emerald-700',

            icon:
                PackageCheck,
        };
    }

    if (
        order.fulfillment_status ===
        'preparing'
    ) {
        return {
            label:
                'Preparing',

            description:
                'PROWARE is currently preparing your merchandise.',

            badgeClass:
                'bg-blue-100 text-blue-700',

            icon:
                PackageCheck,
        };
    }

    if (
        order.payment_status ===
        'paid'
    ) {
        return {
            label:
                'Payment Confirmed',

            description:
                'The cashier confirmed your payment. Your digital receipt and Release QR are now available.',

            badgeClass:
                'bg-blue-100 text-blue-700',

            icon:
                CheckCircle2,
        };
    }

    return {
        label:
            'Pending Payment',

        description:
            'Your order is recorded and stock is reserved. Complete payment with the cashier before merchandise can be released.',

        badgeClass:
            'bg-amber-100 text-amber-700',

        icon:
            Clock3,
    };
}

/*
|--------------------------------------------------------------------------
| History Date Helpers
|--------------------------------------------------------------------------
*/

function getHistoryDate(
    order: StudentOrder,
): string | null {
    return (
        order.released_at_iso
        ??
        order.paid_at_iso
        ??
        order.created_at_iso
    );
}

function isToday(
    value: string | null,
): boolean {
    if (!value) {
        return false;
    }

    const date =
        new Date(value);

    const today =
        new Date();

    return (
        date.getFullYear()
        === today.getFullYear()
        &&
        date.getMonth()
        === today.getMonth()
        &&
        date.getDate()
        === today.getDate()
    );
}

function isThisMonth(
    value: string | null,
): boolean {
    if (!value) {
        return false;
    }

    const date =
        new Date(value);

    const today =
        new Date();

    return (
        date.getFullYear()
        === today.getFullYear()
        &&
        date.getMonth()
        === today.getMonth()
    );
}

function isThisWeek(
    value: string | null,
): boolean {
    if (!value) {
        return false;
    }

    const date =
        new Date(value);

    const now =
        new Date();

    const startOfWeek =
        new Date(now);

    const day =
        startOfWeek.getDay();

    const difference =
        day === 0
            ? -6
            : 1 - day;

    startOfWeek.setDate(
        startOfWeek.getDate()
        + difference,
    );

    startOfWeek.setHours(
        0,
        0,
        0,
        0,
    );

    const endOfWeek =
        new Date(
            startOfWeek,
        );

    endOfWeek.setDate(
        startOfWeek.getDate()
        + 6,
    );

    endOfWeek.setHours(
        23,
        59,
        59,
        999,
    );

    return (
        date >= startOfWeek
        &&
        date <= endOfWeek
    );
}

/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

function formatCurrency(
    amount: string,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style:
                'currency',

            currency:
                'PHP',
        },
    ).format(
        Number(amount),
    );
}

/*
|--------------------------------------------------------------------------
| Status Formatting
|--------------------------------------------------------------------------
*/

function formatStatus(
    status: string,
): string {
    return status
        .replace(
            /_/g,
            ' ',
        )
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character
                    .toUpperCase(),
        );
}