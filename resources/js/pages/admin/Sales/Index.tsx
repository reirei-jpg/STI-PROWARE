import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    PackageCheck,
    ReceiptText,
    ShoppingBag,
    ShoppingCart,
    TrendingUp,
    Trophy,
    WalletCards,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
} from '@inertiajs/react';

import {
    useRef,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

interface SalesSummary {
    today_sales: string;
    month_sales: string;
    filtered_sales: string;
    filtered_cost: string;
    filtered_profit: string;
    paid_orders: number;
    released_orders: number;
    items_sold: number;
}

interface SalesTransaction {
    id: number;
    order_number: string;
    student_name: string;
    student_id: string;
    total: string;
    payment_status: string;
    fulfillment_status: string;
    paid_at: string | null;
    released_at: string | null;
}

interface TopProduct {
    product_code: string;
    product_name: string;
    total_quantity: number;
    total_sales: string;
    total_cost: string;
    total_profit: string;
    has_complete_cost: boolean;
}

interface PaginatedTransactions {
    current_page: number;
    data: SalesTransaction[];
    from: number | null;
    last_page: number;
    next_page_url: string | null;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
}

interface SalesFilters {
    date_from: string | null;
    date_to: string | null;
}

interface SalesPageProps {
    summary: SalesSummary;
    transactions: PaginatedTransactions;
    topProducts: TopProduct[];
    filters: SalesFilters;
}

export default function Index({
    summary,
    transactions,
    topProducts,
    filters,
}: SalesPageProps) {
    const [
        dateFrom,
        setDateFrom,
    ] = useState(
        filters.date_from ?? '',
    );

    const [
        dateTo,
        setDateTo,
    ] = useState(
        filters.date_to ?? '',
    );

    const dateFromRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const dateToRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const hasDateFilter =
        Boolean(
            filters.date_from
            || filters.date_to,
        );

    const applyFilters = (): void => {
        if (
            dateFrom
            && dateTo
            && dateFrom > dateTo
        ) {
            return;
        }

        router.get(
            '/admin/sales',
            {
                date_from:
                    dateFrom
                    || undefined,

                date_to:
                    dateTo
                    || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const clearFilters = (): void => {
        setDateFrom('');
        setDateTo('');

        router.get(
            '/admin/sales',
            {},
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
            <Head title="Sales & Reports" />

            <div className="mx-auto max-w-7xl space-y-6">
                {/* HEADER */}
                <section
                    className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-end
                        lg:justify-between
                    "
                >
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Sales & Reports
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            Review confirmed sales,
                            paid orders, released
                            merchandise, and
                            top-selling products.
                        </p>
                    </div>

                    <div
                        className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            border-blue-100
                            bg-blue-50
                            px-4
                            py-2.5
                            text-xs
                            font-bold
                            text-blue-700
                        "
                    >
                        <ReceiptText size={16} />

                        Based on confirmed payments
                    </div>
                </section>

                {/* SALES OVERVIEW */}
                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-3
                    "
                >
                    <SalesCard
                        title="Sales Today"
                        value={formatCurrency(
                            summary.today_sales,
                        )}
                        description="Confirmed cashier payments today"
                        icon={WalletCards}
                        tone="yellow"
                    />

                    <SalesCard
                        title="Sales This Month"
                        value={formatCurrency(
                            summary.month_sales,
                        )}
                        description="Confirmed payments during the current month"
                        icon={CalendarDays}
                        tone="blue"
                    />

                    <SalesCard
                        title={
                            hasDateFilter
                                ? 'Filtered Sales'
                                : 'All-Time Sales'
                        }
                        value={formatCurrency(
                            summary.filtered_sales,
                        )}
                        description={
                            hasDateFilter
                                ? 'Sales within the selected date range'
                                : 'Total confirmed sales in PROWARE'
                        }
                        icon={ReceiptText}
                        tone="green"
                    />
                </section>

                {/* PROFIT OVERVIEW */}
                <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">
                                Purchasing Cost &amp; Estimated Profit
                            </h2>

                            <p className="mt-0.5 text-xs text-slate-500">
                                {hasDateFilter
                                    ? 'For the selected date range'
                                    : 'All-time'}
                                {' — '}
                                estimate based on items with a
                                recorded purchasing price
                            </p>
                        </div>
                    </div>

                    <div
                        className="
                            grid
                            gap-4
                            sm:grid-cols-2
                        "
                    >
                        <SalesCard
                            title="Purchasing Cost"
                            value={formatCurrency(
                                summary.filtered_cost,
                            )}
                            description="What PROWARE paid suppliers for the merchandise sold in this period"
                            icon={ShoppingCart}
                            tone="red"
                        />

                        <SalesCard
                            title="Estimated Profit"
                            value={formatCurrency(
                                summary.filtered_profit,
                            )}
                            description="Selling price minus purchasing cost — an estimate, not final accounting"
                            icon={TrendingUp}
                            tone="purple"
                        />
                    </div>
                </section>

                {/* TRANSACTION COUNTS */}
                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-3
                    "
                >
                    <CompactMetric
                        label="Paid Orders"
                        value={
                            summary.paid_orders
                        }
                        icon={
                            CheckCircle2
                        }
                        tone="blue"
                    />

                    <CompactMetric
                        label="Released Orders"
                        value={
                            summary.released_orders
                        }
                        icon={
                            PackageCheck
                        }
                        tone="green"
                    />

                    <CompactMetric
                        label="Items Sold"
                        value={
                            summary.items_sold
                        }
                        icon={ShoppingBag}
                        tone="amber"
                    />
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
                            lg:flex-row
                            lg:items-end
                            lg:justify-between
                        "
                    >
                        <div>
                            <h2 className="font-black text-slate-900">
                                Report Period
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Select the start and end
                                dates using the calendar.
                            </p>
                        </div>

                        <div
                            className="
                                grid
                                w-full
                                gap-3
                                sm:grid-cols-2
                                lg:w-auto
                                lg:grid-cols-[220px_220px_auto]
                            "
                        >
                            {/* FROM DATE */}
                            <CalendarField
                                label="From"
                                value={dateFrom}
                                placeholder="Select start date"
                                inputRef={
                                    dateFromRef
                                }
                                max={
                                    dateTo
                                    || undefined
                                }
                                onChange={
                                    setDateFrom
                                }
                            />

                            {/* TO DATE */}
                            <CalendarField
                                label="To"
                                value={dateTo}
                                placeholder="Select end date"
                                inputRef={
                                    dateToRef
                                }
                                min={
                                    dateFrom
                                    || undefined
                                }
                                onChange={
                                    setDateTo
                                }
                            />

                            {/* ACTIONS */}
                            <div
                                className="
                                    flex
                                    items-end
                                    gap-2
                                    sm:col-span-2
                                    lg:col-span-1
                                "
                            >
                                <button
                                    type="button"
                                    onClick={
                                        applyFilters
                                    }
                                    className="
                                        flex-1
                                        rounded-xl
                                        bg-[#0D6EFD]
                                        px-5
                                        py-3
                                        text-sm
                                        font-black
                                        text-white
                                        transition
                                        hover:bg-blue-700
                                        lg:flex-none
                                    "
                                >
                                    Apply
                                </button>

                                {(hasDateFilter
                                    || dateFrom
                                    || dateTo) && (
                                    <button
                                        type="button"
                                        onClick={
                                            clearFilters
                                        }
                                        className="
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-5
                                            py-3
                                            text-sm
                                            font-bold
                                            text-slate-600
                                            transition
                                            hover:bg-slate-50
                                        "
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {dateFrom
                    && dateTo
                    && dateFrom > dateTo ? (
                        <div
                            className="
                                mt-4
                                rounded-xl
                                bg-red-50
                                px-4
                                py-3
                                text-xs
                                font-semibold
                                text-red-700
                            "
                        >
                            The start date cannot be
                            later than the end date.
                        </div>
                    ) : hasDateFilter ? (
                        <div
                            className="
                                mt-4
                                flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-blue-50
                                px-4
                                py-3
                                text-xs
                                font-semibold
                                text-blue-700
                            "
                        >
                            <CalendarDays
                                size={15}
                            />

                            <span>
                                Showing sales
                                {filters.date_from
                                    ? ` from ${formatDisplayDate(
                                          filters.date_from,
                                      )}`
                                    : ''}
                                {filters.date_to
                                    ? ` to ${formatDisplayDate(
                                          filters.date_to,
                                      )}`
                                    : ''}
                            </span>
                        </div>
                    ) : null}
                </section>

                {/* TRANSACTIONS + TOP PRODUCTS */}
                <section
                    className="
                        grid
                        items-start
                        gap-6
                        xl:grid-cols-[minmax(0,1fr)_340px]
                    "
                >
                    {/* TRANSACTIONS */}
                    <article
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
                                <h2 className="text-lg font-black text-slate-900">
                                    Sales Transactions
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    {
                                        transactions.total
                                    }{' '}
                                    paid transaction
                                    {transactions.total ===
                                    1
                                        ? ''
                                        : 's'}
                                </p>
                            </div>

                            <ReceiptText
                                size={20}
                                className="text-blue-600"
                            />
                        </div>

                        {transactions.data
                            .length > 0 ? (
                            <>
                                <div className="divide-y divide-slate-100">
                                    {transactions.data.map(
                                        (
                                            transaction,
                                        ) => (
                                            <TransactionRow
                                                key={
                                                    transaction.id
                                                }
                                                transaction={
                                                    transaction
                                                }
                                            />
                                        ),
                                    )}
                                </div>

                                <div
                                    className="
                                        flex
                                        flex-col
                                        gap-3
                                        border-t
                                        border-slate-100
                                        px-5
                                        py-4
                                        sm:flex-row
                                        sm:items-center
                                        sm:justify-between
                                        sm:px-6
                                    "
                                >
                                    <p className="text-xs text-slate-500">
                                        Showing{' '}
                                        <strong>
                                            {transactions.from
                                                ?? 0}
                                        </strong>
                                        {' '}to{' '}
                                        <strong>
                                            {transactions.to
                                                ?? 0}
                                        </strong>
                                        {' '}of{' '}
                                        <strong>
                                            {
                                                transactions.total
                                            }
                                        </strong>
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <PaginationButton
                                            disabled={
                                                !transactions
                                                    .prev_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    transactions
                                                        .prev_page_url,
                                                )
                                            }
                                        >
                                            <ChevronLeft
                                                size={
                                                    17
                                                }
                                            />
                                        </PaginationButton>

                                        <span
                                            className="
                                                rounded-xl
                                                bg-slate-100
                                                px-4
                                                py-2.5
                                                text-xs
                                                font-bold
                                                text-slate-600
                                            "
                                        >
                                            {
                                                transactions.current_page
                                            }
                                            {' / '}
                                            {
                                                transactions.last_page
                                            }
                                        </span>

                                        <PaginationButton
                                            disabled={
                                                !transactions
                                                    .next_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    transactions
                                                        .next_page_url,
                                                )
                                            }
                                        >
                                            <ChevronRight
                                                size={
                                                    17
                                                }
                                            />
                                        </PaginationButton>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="px-6 py-14 text-center">
                                <ReceiptText
                                    size={38}
                                    className="mx-auto text-slate-300"
                                />

                                <h3 className="mt-4 font-black text-slate-800">
                                    No sales found
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    There are no confirmed
                                    payments for this
                                    report period.
                                </p>
                            </div>
                        )}
                    </article>

                    {/* TOP PRODUCTS */}
                    <article
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
                                border-b
                                border-slate-100
                                px-5
                                py-5
                            "
                        >
                            <div>
                                <h2 className="font-black text-slate-900">
                                    Top Products
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Based on units sold
                                </p>
                            </div>

                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-yellow-100
                                    text-amber-700
                                "
                            >
                                <Trophy size={19} />
                            </div>
                        </div>

                        {topProducts.length >
                        0 ? (
                            <div className="divide-y divide-slate-100">
                                {topProducts.map(
                                    (
                                        product,
                                        index,
                                    ) => (
                                        <TopProductRow
                                            key={
                                                product.product_code
                                            }
                                            product={
                                                product
                                            }
                                            rank={
                                                index
                                                + 1
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="px-5 py-12 text-center">
                                <ShoppingBag
                                    size={34}
                                    className="mx-auto text-slate-300"
                                />

                                <p className="mt-4 text-sm font-bold text-slate-700">
                                    No product sales yet
                                </p>
                            </div>
                        )}
                    </article>
                </section>
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Calendar Field
|--------------------------------------------------------------------------
*/

function CalendarField({
    label,
    value,
    placeholder,
    inputRef,
    min,
    max,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    min?: string;
    max?: string;
    onChange: (value: string) => void;
}) {
    const openCalendar = (): void => {
        const input =
            inputRef.current;

        if (!input) {
            return;
        }

        /*
         * Modern Chromium browsers support showPicker().
         * Fallback to focus/click if unavailable.
         */
        if (
            typeof input.showPicker ===
            'function'
        ) {
            input.showPicker();

            return;
        }

        input.focus();
        input.click();
    };

    return (
        <div>
            <p
                className="
                    mb-1.5
                    text-xs
                    font-bold
                    text-slate-500
                "
            >
                {label}
            </p>

            <div className="relative">
                <button
                    type="button"
                    onClick={
                        openCalendar
                    }
                    className="
                        flex
                        w-full
                        items-center
                        gap-3
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        py-3
                        text-left
                        transition
                        hover:border-blue-300
                        hover:bg-blue-50/30
                        focus:border-blue-500
                        focus:outline-none
                        focus:ring-4
                        focus:ring-blue-100
                    "
                >
                    <CalendarDays
                        size={18}
                        className="shrink-0 text-blue-600"
                    />

                    <span
                        className={
                            value
                                ? 'text-sm font-semibold text-slate-800'
                                : 'text-sm text-slate-400'
                        }
                    >
                        {value
                            ? formatDisplayDate(
                                  value,
                              )
                            : placeholder}
                    </span>
                </button>

                <input
                    ref={inputRef}
                    type="date"
                    value={value}
                    min={min}
                    max={max}
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value,
                        )
                    }
                    tabIndex={-1}
                    aria-hidden="true"
                    className="
                        pointer-events-none
                        absolute
                        left-0
                        top-0
                        h-px
                        w-px
                        opacity-0
                    "
                />
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Sales Card
|--------------------------------------------------------------------------
*/

type SalesTone =
    | 'yellow'
    | 'blue'
    | 'green'
    | 'red'
    | 'purple';

function SalesCard({
    title,
    value,
    description,
    icon: Icon,
    tone,
}: {
    title: string;
    value: string;
    description: string;
    icon: typeof WalletCards;
    tone: SalesTone;
}) {
    const styles = {
        yellow: {
            card:
                'border-yellow-200 bg-yellow-50',

            icon:
                'bg-yellow-400 text-blue-900',

            value:
                'text-slate-950',
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

        purple: {
            card:
                'border-violet-200 bg-violet-50/60',

            icon:
                'bg-violet-100 text-violet-700',

            value:
                'text-violet-700',
        },
    };

    const style =
        styles[tone];

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
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-700">
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

            <p className="mt-3 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Compact Metric
|--------------------------------------------------------------------------
*/

type CompactTone =
    | 'blue'
    | 'green'
    | 'amber';

function CompactMetric({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: typeof ShoppingBag;
    tone: CompactTone;
}) {
    const styles = {
        blue:
            'bg-blue-100 text-blue-700',

        green:
            'bg-emerald-100 text-emerald-700',

        amber:
            'bg-amber-100 text-amber-700',
    };

    return (
        <article
            className="
                flex
                items-center
                gap-4
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
            "
        >
            <div
                className={`
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${styles[tone]}
                `}
            >
                <Icon size={20} />
            </div>

            <div>
                <p className="text-xs font-bold text-slate-500">
                    {label}
                </p>

                <p className="mt-0.5 text-2xl font-black text-slate-900">
                    {value}
                </p>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Transaction
|--------------------------------------------------------------------------
*/

function TransactionRow({
    transaction,
}: {
    transaction: SalesTransaction;
}) {
    const released =
        transaction
            .fulfillment_status ===
        'released';

    return (
        <Link
            href={`/admin/orders/${transaction.id}`}
            className="
                group
                block
                px-5
                py-5
                transition
                hover:bg-slate-50
                sm:px-6
            "
        >
            <div
                className="
                    grid
                    gap-4
                    sm:grid-cols-[minmax(0,1fr)_auto]
                    sm:items-center
                "
            >
                <div className="min-w-0">
                    <p className="font-mono text-xs font-black text-blue-600">
                        {
                            transaction.order_number
                        }
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                        {
                            transaction.student_name
                        }
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-400">
                        {
                            transaction.student_id
                        }
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                        <span
                            className="
                                rounded-full
                                bg-emerald-100
                                px-2.5
                                py-1
                                text-[10px]
                                font-black
                                text-emerald-700
                            "
                        >
                            Paid
                        </span>

                        <span
                            className={`
                                rounded-full
                                px-2.5
                                py-1
                                text-[10px]
                                font-black
                                ${
                                    released
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-slate-100 text-slate-600'
                                }
                            `}
                        >
                            {released
                                ? 'Released'
                                : formatValue(
                                      transaction
                                          .fulfillment_status,
                                  )}
                        </span>
                    </div>
                </div>

                <div
                    className="
                        flex
                        items-center
                        justify-between
                        gap-5
                        sm:justify-end
                    "
                >
                    <div className="sm:text-right">
                        <p className="text-xs text-slate-400">
                            Paid
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            {transaction.paid_at
                                ?? 'N/A'}
                        </p>

                        <p className="mt-2 text-lg font-black text-slate-950">
                            {formatCurrency(
                                transaction.total,
                            )}
                        </p>
                    </div>

                    <div
                        className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-xl
                            bg-blue-50
                            text-blue-600
                            transition
                            group-hover:bg-blue-600
                            group-hover:text-white
                        "
                    >
                        <ArrowRight
                            size={16}
                        />
                    </div>
                </div>
            </div>
        </Link>
    );
}

/*
|--------------------------------------------------------------------------
| Top Product
|--------------------------------------------------------------------------
*/

function TopProductRow({
    product,
    rank,
}: {
    product: TopProduct;
    rank: number;
}) {
    return (
        <div className="px-5 py-4">
            <div className="flex items-start gap-3">
                <div
                    className={`
                        flex
                        h-8
                        w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-xs
                        font-black
                        ${
                            rank === 1
                                ? 'bg-yellow-400 text-blue-900'
                                : 'bg-slate-100 text-slate-600'
                        }
                    `}
                >
                    {rank}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-900">
                        {
                            product.product_name
                        }
                    </p>

                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                        {
                            product.product_code
                        }
                    </p>

                    <div className="mt-3 flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                Units Sold
                            </p>

                            <p className="mt-1 font-black text-blue-700">
                                {
                                    product.total_quantity
                                }
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                Sales
                            </p>

                            <p className="mt-1 font-black text-slate-900">
                                {formatCurrency(
                                    product.total_sales,
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                Cost
                            </p>

                            <p className="mt-1 text-sm font-bold text-red-600">
                                {formatCurrency(
                                    product.total_cost,
                                )}
                            </p>
                        </div>

                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">
                                Profit
                                {!product.has_complete_cost && (
                                    <span
                                        title="Some units sold don't have a recorded purchasing cost, so this is a partial estimate."
                                        className="ml-1 cursor-help text-amber-500"
                                    >
                                        ~
                                    </span>
                                )}
                            </p>

                            <p className="mt-1 text-sm font-bold text-violet-700">
                                {formatCurrency(
                                    product.total_profit,
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Pagination Button
|--------------------------------------------------------------------------
*/

function PaginationButton({
    disabled,
    onClick,
    children,
}: {
    disabled: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
            "
        >
            {children}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Formatting
|--------------------------------------------------------------------------
*/

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

function formatDisplayDate(
    date: string,
): string {
    if (!date) {
        return '';
    }

    const [
        year,
        month,
        day,
    ] = date.split('-');

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        },
    ).format(
        new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
        ),
    );
}