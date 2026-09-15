import {
    AlertTriangle,
    Banknote,
    BarChart3,
    Boxes,
    CheckCircle2,
    Clock3,
    PackageCheck,
    ShoppingCart,
    TrendingUp,
} from 'lucide-react';

import {
    Head,
    router,
} from '@inertiajs/react';

import {
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

interface AnalyticsFilters {
    period:
        | 'today'
        | 'week'
        | 'month'
        | 'custom';

    start_date:
        string;

    end_date:
        string;
}

interface AnalyticsSummary {
    total_sales:
        number;

    paid_orders:
        number;

    units_sold:
        number;

    average_order_value:
        number;

    released_orders:
        number;

    pending_payments:
        number;

    fulfillment_rate:
        number;
}

interface InventoryHealth {
    in_stock:
        number;

    low_stock:
        number;

    out_of_stock:
        number;
}

interface TopProduct {
    product_code:
        string;

    product_name:
        string;

    units_sold:
        number;

    total_sales:
        number;
}

interface SalesTrendItem {
    date:
        string;

    full_date:
        string;

    sales:
        number;

    orders:
        number;
}

interface AnalyticsPageProps {
    filters:
        AnalyticsFilters;

    periodLabel:
        string;

    summary:
        AnalyticsSummary;

    inventoryHealth:
        InventoryHealth;

    topProducts:
        TopProduct[];

    salesTrend:
        SalesTrendItem[];
}

export default function Index({
    filters,
    periodLabel,
    summary,
    inventoryHealth,
    topProducts,
    salesTrend,
}: AnalyticsPageProps) {
    const [
        period,
        setPeriod,
    ] =
        useState<
            AnalyticsFilters['period']
        >(
            filters.period,
        );

    const [
        startDate,
        setStartDate,
    ] =
        useState(
            filters.start_date,
        );

    const [
        endDate,
        setEndDate,
    ] =
        useState(
            filters.end_date,
        );

    const applyFilter =
        (): void => {
            router.get(
                '/admin/analytics',
                {
                    period,

                    start_date:
                        period ===
                        'custom'
                            ? startDate
                            : undefined,

                    end_date:
                        period ===
                        'custom'
                            ? endDate
                            : undefined,
                },
                {
                    preserveScroll:
                        true,

                    preserveState:
                        true,

                    replace:
                        true,
                },
            );
        };

    const maxSales =
        salesTrend.length > 0
            ? Math.max(
                ...salesTrend.map(
                    (
                        item,
                    ) =>
                        item.sales,
                ),
                1,
            )
            : 1;

    const totalInventoryVariants =
        inventoryHealth.in_stock
        +
        inventoryHealth.low_stock
        +
        inventoryHealth.out_of_stock;

    return (
        <AdminLayout>
            <Head
                title="Analytics"
            />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/* HEADER */}
                <section>
                    <p
                        className="
                            text-sm
                            font-black
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
                        Analytics
                    </h1>

                    <p
                        className="
                            mt-2
                            max-w-3xl
                            text-sm
                            leading-6
                            text-slate-500
                        "
                    >
                        Monitor sales performance,
                        merchandise demand,
                        fulfillment efficiency,
                        and current inventory health.
                    </p>
                </section>

                {/* DATE FILTER */}
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
                            gap-5
                            xl:flex-row
                            xl:items-end
                            xl:justify-between
                        "
                    >
                        <div>
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-slate-400
                                "
                            >
                                Analytics Period
                            </p>

                            <p
                                className="
                                    mt-2
                                    text-lg
                                    font-black
                                    text-slate-900
                                "
                            >
                                {periodLabel}
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                flex-col
                                gap-3
                                md:flex-row
                                md:items-end
                            "
                        >
                            <div>
                                <label
                                    className="
                                        mb-1.5
                                        block
                                        text-xs
                                        font-black
                                        text-slate-500
                                    "
                                >
                                    Period
                                </label>

                                <select
                                    value={
                                        period
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setPeriod(
                                            event
                                                .target
                                                .value as AnalyticsFilters['period'],
                                        )
                                    }
                                    className="
                                        min-w-44
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        px-4
                                        py-3
                                        text-sm
                                        font-bold
                                        text-slate-700
                                        outline-none
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                >
                                    <option
                                        value="today"
                                    >
                                        Today
                                    </option>

                                    <option
                                        value="week"
                                    >
                                        This Week
                                    </option>

                                    <option
                                        value="month"
                                    >
                                        This Month
                                    </option>

                                    <option
                                        value="custom"
                                    >
                                        Custom Range
                                    </option>
                                </select>
                            </div>

                            {period ===
                                'custom' && (
                                <>
                                    <div>
                                        <label
                                            className="
                                                mb-1.5
                                                block
                                                text-xs
                                                font-black
                                                text-slate-500
                                            "
                                        >
                                            Start Date
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                startDate
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setStartDate(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-3
                                                text-sm
                                                font-bold
                                                text-slate-700
                                                outline-none
                                                focus:border-blue-500
                                                focus:ring-4
                                                focus:ring-blue-100
                                            "
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className="
                                                mb-1.5
                                                block
                                                text-xs
                                                font-black
                                                text-slate-500
                                            "
                                        >
                                            End Date
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                endDate
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                setEndDate(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-3
                                                text-sm
                                                font-bold
                                                text-slate-700
                                                outline-none
                                                focus:border-blue-500
                                                focus:ring-4
                                                focus:ring-blue-100
                                            "
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={
                                    applyFilter
                                }
                                disabled={
                                    period ===
                                        'custom'
                                    &&
                                    (
                                        !startDate
                                        ||
                                        !endDate
                                    )
                                }
                                className="
                                    rounded-xl
                                    bg-blue-600
                                    px-5
                                    py-3
                                    text-sm
                                    font-black
                                    text-white
                                    transition
                                    hover:bg-blue-700
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </section>

                {/* KPI CARDS */}
                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <MetricCard
                        label="Total Sales"
                        value={
                            formatCurrency(
                                summary.total_sales,
                            )
                        }
                        description="Confirmed paid order revenue"
                        icon={
                            Banknote
                        }
                        tone="blue"
                    />

                    <MetricCard
                        label="Paid Orders"
                        value={
                            summary.paid_orders
                        }
                        description="Orders successfully paid"
                        icon={
                            CheckCircle2
                        }
                        tone="green"
                    />

                    <MetricCard
                        label="Units Sold"
                        value={
                            summary.units_sold
                        }
                        description="Total merchandise units sold"
                        icon={
                            ShoppingCart
                        }
                        tone="purple"
                    />

                    <MetricCard
                        label="Average Order"
                        value={
                            formatCurrency(
                                summary.average_order_value,
                            )
                        }
                        description="Average revenue per paid order"
                        icon={
                            TrendingUp
                        }
                        tone="amber"
                    />
                </section>

                {/* SECONDARY KPI CARDS */}
                <section
                    className="
                        grid
                        gap-4
                        md:grid-cols-3
                    "
                >
                    <MetricCard
                        label="Released Orders"
                        value={
                            summary.released_orders
                        }
                        description="Orders already handed to students"
                        icon={
                            PackageCheck
                        }
                        tone="green"
                    />

                    <MetricCard
                        label="Pending Payments"
                        value={
                            summary.pending_payments
                        }
                        description="Orders awaiting cashier confirmation"
                        icon={
                            Clock3
                        }
                        tone="amber"
                    />

                    <MetricCard
                        label="Fulfillment Rate"
                        value={
                            `${summary.fulfillment_rate}%`
                        }
                        description="Released orders compared with paid orders"
                        icon={
                            BarChart3
                        }
                        tone="blue"
                    />
                </section>

                {/* SALES TREND */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm
                    "
                >
                    <div
                        className="
                            border-b
                            border-slate-100
                            px-6
                            py-5
                        "
                    >
                        <p
                            className="
                                text-xs
                                font-black
                                uppercase
                                tracking-wide
                                text-blue-600
                            "
                        >
                            Sales Trend
                        </p>

                        <h2
                            className="
                                mt-1
                                text-xl
                                font-black
                                text-slate-900
                            "
                        >
                            Daily Sales Performance
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Revenue and paid orders
                            during {periodLabel}.
                        </p>
                    </div>

                    {salesTrend.length >
                    0 ? (
                        <div
                            className="
                                overflow-x-auto
                                px-6
                                py-7
                            "
                        >
                            <div
                                className="
                                    flex
                                    min-w-[700px]
                                    items-end
                                    gap-4
                                "
                            >
                                {salesTrend.map(
                                    (
                                        item,
                                    ) => {
                                        const height =
                                            Math.max(
                                                8,
                                                (
                                                    item.sales
                                                    /
                                                    maxSales
                                                )
                                                * 220,
                                            );

                                        return (
                                            <div
                                                key={
                                                    item.full_date
                                                }
                                                className="
                                                    flex
                                                    min-w-20
                                                    flex-1
                                                    flex-col
                                                    items-center
                                                "
                                            >
                                                <p
                                                    className="
                                                        mb-2
                                                        text-xs
                                                        font-black
                                                        text-slate-700
                                                    "
                                                >
                                                    {
                                                        formatCompactCurrency(
                                                            item.sales,
                                                        )
                                                    }
                                                </p>

                                                <div
                                                    className="
                                                        flex
                                                        h-56
                                                        w-full
                                                        items-end
                                                        justify-center
                                                    "
                                                >
                                                    <div
                                                        title={`${formatCurrency(item.sales)} • ${item.orders} paid order(s)`}
                                                        style={{
                                                            height:
                                                                `${height}px`,
                                                        }}
                                                        className="
                                                            w-10
                                                            rounded-t-xl
                                                            bg-blue-600
                                                            transition
                                                            hover:bg-blue-700
                                                        "
                                                    />
                                                </div>

                                                <p
                                                    className="
                                                        mt-3
                                                        text-xs
                                                        font-black
                                                        text-slate-600
                                                    "
                                                >
                                                    {
                                                        item.date
                                                    }
                                                </p>

                                                <p
                                                    className="
                                                        mt-1
                                                        text-[10px]
                                                        font-semibold
                                                        text-slate-400
                                                    "
                                                >
                                                    {
                                                        item.orders
                                                    }{' '}
                                                    order
                                                    {
                                                        item.orders ===
                                                        1
                                                            ? ''
                                                            : 's'
                                                    }
                                                </p>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            message="No paid sales were recorded for this period."
                        />
                    )}
                </section>

                {/* ANALYTICS GRID */}
                <section
                    className="
                        grid
                        gap-6
                        xl:grid-cols-2
                    "
                >
                    {/* TOP PRODUCTS */}
                    <div
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
                                border-b
                                border-slate-100
                                px-6
                                py-5
                            "
                        >
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-violet-600
                                "
                            >
                                Demand
                            </p>

                            <h2
                                className="
                                    mt-1
                                    text-xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                Top Merchandise
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Highest-selling
                                merchandise by units.
                            </p>
                        </div>

                        {topProducts.length >
                        0 ? (
                            <div
                                className="
                                    divide-y
                                    divide-slate-100
                                "
                            >
                                {topProducts.map(
                                    (
                                        product,
                                        index,
                                    ) => (
                                        <div
                                            key={
                                                product.product_code
                                            }
                                            className="
                                                flex
                                                items-center
                                                gap-4
                                                px-6
                                                py-5
                                            "
                                        >
                                            <div
                                                className="
                                                    flex
                                                    h-10
                                                    w-10
                                                    shrink-0
                                                    items-center
                                                    justify-center
                                                    rounded-xl
                                                    bg-violet-50
                                                    text-sm
                                                    font-black
                                                    text-violet-700
                                                "
                                            >
                                                {
                                                    index
                                                    + 1
                                                }
                                            </div>

                                            <div
                                                className="
                                                    min-w-0
                                                    flex-1
                                                "
                                            >
                                                <p
                                                    className="
                                                        truncate
                                                        font-black
                                                        text-slate-900
                                                    "
                                                >
                                                    {
                                                        product.product_name
                                                    }
                                                </p>

                                                <p
                                                    className="
                                                        mt-1
                                                        font-mono
                                                        text-xs
                                                        text-slate-400
                                                    "
                                                >
                                                    {
                                                        product.product_code
                                                    }
                                                </p>
                                            </div>

                                            <div
                                                className="
                                                    text-right
                                                "
                                            >
                                                <p
                                                    className="
                                                        font-black
                                                        text-blue-700
                                                    "
                                                >
                                                    {
                                                        product.units_sold
                                                    }{' '}
                                                    units
                                                </p>

                                                <p
                                                    className="
                                                        mt-1
                                                        text-xs
                                                        font-bold
                                                        text-emerald-600
                                                    "
                                                >
                                                    {
                                                        formatCurrency(
                                                            product.total_sales,
                                                        )
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        ) : (
                            <EmptyState
                                message="No product sales data available."
                            />
                        )}
                    </div>

                    {/* INVENTORY HEALTH */}
                    <div
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            shadow-sm
                        "
                    >
                        <div
                            className="
                                border-b
                                border-slate-100
                                px-6
                                py-5
                            "
                        >
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-blue-600
                                "
                            >
                                Inventory
                            </p>

                            <h2
                                className="
                                    mt-1
                                    text-xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                Inventory Health
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Current stock condition
                                across all variants.
                            </p>
                        </div>

                        <div
                            className="
                                space-y-5
                                p-6
                            "
                        >
                            <InventoryHealthRow
                                label="In Stock"
                                value={
                                    inventoryHealth.in_stock
                                }
                                total={
                                    totalInventoryVariants
                                }
                                tone="green"
                            />

                            <InventoryHealthRow
                                label="Low Stock"
                                value={
                                    inventoryHealth.low_stock
                                }
                                total={
                                    totalInventoryVariants
                                }
                                tone="amber"
                            />

                            <InventoryHealthRow
                                label="Out of Stock"
                                value={
                                    inventoryHealth.out_of_stock
                                }
                                total={
                                    totalInventoryVariants
                                }
                                tone="red"
                            />

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-100
                                    bg-slate-50
                                    p-4
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-3
                                    "
                                >
                                    <AlertTriangle
                                        size={18}
                                        className="
                                            text-amber-500
                                        "
                                    />

                                    <div>
                                        <p
                                            className="
                                                text-sm
                                                font-black
                                                text-slate-800
                                            "
                                        >
                                            Stock Attention
                                        </p>

                                        <p
                                            className="
                                                mt-1
                                                text-xs
                                                leading-5
                                                text-slate-500
                                            "
                                        >
                                            {
                                                inventoryHealth.low_stock
                                                +
                                                inventoryHealth.out_of_stock
                                            }{' '}
                                            variant(s)
                                            currently require
                                            inventory attention.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Metric Card
|--------------------------------------------------------------------------
*/

type MetricTone =
    | 'blue'
    | 'green'
    | 'amber'
    | 'purple';

function MetricCard({
    label,
    value,
    description,
    icon: Icon,
    tone,
}: {
    label:
        string;

    value:
        string | number;

    description:
        string;

    icon:
        typeof Banknote;

    tone:
        MetricTone;
}) {
    const styles:
        Record<
            MetricTone,
            {
                card:
                    string;

                icon:
                    string;

                value:
                    string;
            }
        > = {
        blue: {
            card:
                'border-blue-100 bg-blue-50/40',

            icon:
                'bg-blue-100 text-blue-600',

            value:
                'text-blue-700',
        },

        green: {
            card:
                'border-emerald-100 bg-emerald-50/40',

            icon:
                'bg-emerald-100 text-emerald-600',

            value:
                'text-emerald-700',
        },

        amber: {
            card:
                'border-amber-100 bg-amber-50/40',

            icon:
                'bg-amber-100 text-amber-600',

            value:
                'text-amber-700',
        },

        purple: {
            card:
                'border-violet-100 bg-violet-50/40',

            icon:
                'bg-violet-100 text-violet-600',

            value:
                'text-violet-700',
        },
    };

    const style =
        styles[
            tone
        ];

    return (
        <article
            className={`
                rounded-3xl
                border
                p-5
                shadow-sm
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
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-slate-500
                        "
                    >
                        {label}
                    </p>

                    <p
                        className={`
                            mt-3
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
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-2xl
                        ${style.icon}
                    `}
                >
                    <Icon
                        size={21}
                    />
                </div>
            </div>

            <p
                className="
                    mt-4
                    text-xs
                    leading-5
                    text-slate-500
                "
            >
                {description}
            </p>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Inventory Health Row
|--------------------------------------------------------------------------
*/

function InventoryHealthRow({
    label,
    value,
    total,
    tone,
}: {
    label:
        string;

    value:
        number;

    total:
        number;

    tone:
        | 'green'
        | 'amber'
        | 'red';
}) {
    const percentage =
        total > 0
            ? Math.round(
                (
                    value
                    /
                    total
                )
                * 100,
            )
            : 0;

    const tones = {
        green: {
            text:
                'text-emerald-700',

            bar:
                'bg-emerald-500',

            background:
                'bg-emerald-100',
        },

        amber: {
            text:
                'text-amber-700',

            bar:
                'bg-amber-500',

            background:
                'bg-amber-100',
        },

        red: {
            text:
                'text-red-700',

            bar:
                'bg-red-500',

            background:
                'bg-red-100',
        },
    };

    const style =
        tones[
            tone
        ];

    return (
        <div>
            <div
                className="
                    flex
                    items-center
                    justify-between
                    gap-4
                "
            >
                <p
                    className="
                        text-sm
                        font-black
                        text-slate-700
                    "
                >
                    {label}
                </p>

                <div
                    className="
                        text-right
                    "
                >
                    <span
                        className={`
                            text-sm
                            font-black
                            ${style.text}
                        `}
                    >
                        {value}
                    </span>

                    <span
                        className="
                            ml-2
                            text-xs
                            font-bold
                            text-slate-400
                        "
                    >
                        {percentage}%
                    </span>
                </div>
            </div>

            <div
                className={`
                    mt-2
                    h-3
                    overflow-hidden
                    rounded-full
                    ${style.background}
                `}
            >
                <div
                    style={{
                        width:
                            `${percentage}%`,
                    }}
                    className={`
                        h-full
                        rounded-full
                        transition-all
                        ${style.bar}
                    `}
                />
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({
    message,
}: {
    message:
        string;
}) {
    return (
        <div
            className="
                px-6
                py-14
                text-center
            "
        >
            <BarChart3
                size={40}
                className="
                    mx-auto
                    text-slate-300
                "
            />

            <p
                className="
                    mt-4
                    font-black
                    text-slate-700
                "
            >
                {message}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatCurrency(
    value:
        number,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style:
                'currency',

            currency:
                'PHP',

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2,
        },
    ).format(
        value,
    );
}

function formatCompactCurrency(
    value:
        number,
): string {
    if (
        value >=
        1000000
    ) {
        return `₱${(
            value
            /
            1000000
        ).toFixed(
            1,
        )}M`;
    }

    if (
        value >=
        1000
    ) {
        return `₱${(
            value
            /
            1000
        ).toFixed(
            1,
        )}K`;
    }

    return `₱${Math.round(
        value,
    )}`;
}