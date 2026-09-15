import {
    AlertTriangle,
    Banknote,
    Boxes,
    CheckCircle2,
    Clock,
    PackageCheck,
    Printer,
    ReceiptText,
    ShoppingCart,
} from 'lucide-react';

import {
    Head,
    router,
} from '@inertiajs/react';

import {
    type ReactNode,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface SalesByVariantItem {
    product_code: string;
    product_name: string;
    variant_name: string;
    sku: string;
    units_sold: number;
    total_sales: number;
}

interface TopSellingProduct {
    product_code: string;
    product_name: string;
    units_sold: number;
    total_sales: number;
}

interface ReportFilters {
    period:
        | 'today'
        | 'week'
        | 'month'
        | 'custom';

    start_date: string;
    end_date: string;
}

interface ReportSummary {
    total_sales: number;
    paid_orders: number;
    pending_payments: number;
    released_orders: number;
    total_stock_received: number;
    low_stock: number;
    out_of_stock: number;
}

interface RecentOrder {
    id: number;
    order_number: string;
    student_name: string;
    total: string;
    payment_status: string;
    fulfillment_status: string;
    paid_at: string | null;
}

interface RecentReceipt {
    id: number;
    receipt_number: string | null;
    product_code: string;
    product_name: string;
    variant_name: string;
    quantity: number;
    received_by: string;
    created_at: string | null;
}

interface ReportPageProps {
    summary: ReportSummary;
    recentOrders: RecentOrder[];
    recentReceipts: RecentReceipt[];
    filters: ReportFilters;
    periodLabel: string;
    topSellingProducts: TopSellingProduct[];
    salesByVariant: SalesByVariantItem[];
}

/*
|--------------------------------------------------------------------------
| Reports Page
|--------------------------------------------------------------------------
*/

export default function Index({
    summary,
    recentOrders,
    recentReceipts,
    filters,
    periodLabel,
    topSellingProducts,
    salesByVariant,
}: ReportPageProps) {
    const [
        period,
        setPeriod,
    ] =
        useState<
            ReportFilters['period']
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

    /*
    |--------------------------------------------------------------------------
    | Apply Report Filter
    |--------------------------------------------------------------------------
    */

    const applyFilter =
        (): void => {
            router.get(
                '/admin/reports',
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

    /*
    |--------------------------------------------------------------------------
    | Print Report
    |--------------------------------------------------------------------------
    */

    const printReport =
        (): void => {
            window.print();
        };

    return (
        <AdminLayout>
            <Head
                title="Reports"
            />

            <div
                className="
                    report-page
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/* SCREEN HEADER */}
                <section
                    className="
                        report-screen-header
                        flex
                        flex-col
                        gap-4
                        md:flex-row
                        md:items-start
                        md:justify-between
                    "
                >
                    <div>
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
                            Reports
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
                            Review sales,
                            payments,
                            merchandise releases,
                            inventory receipts,
                            and current stock
                            conditions.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            printReport
                        }
                        className="
                            no-print
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-slate-900
                            px-5
                            py-3
                            text-sm
                            font-black
                            text-white
                            transition
                            hover:bg-slate-800
                        "
                    >
                        <Printer
                            size={18}
                        />

                        Print Report
                    </button>
                </section>

                {/* PRINT-ONLY HEADER */}
                <section
                    className="
                        print-report-header
                        hidden
                    "
                >
                    <div
                        className="
                            border-b
                            border-slate-300
                            pb-4
                            text-center
                        "
                    >
                        <h1
                            className="
                                text-2xl
                                font-black
                                text-slate-900
                            "
                        >
                            STI PROWARE
                        </h1>

                        <p
                            className="
                                mt-1
                                text-sm
                                font-bold
                                text-slate-700
                            "
                        >
                            Merchandise and
                            Inventory Management
                            Report
                        </p>

                        <p
                            className="
                                mt-2
                                text-xs
                                text-slate-500
                            "
                        >
                            Reporting Period:{' '}
                            {periodLabel}
                        </p>
                    </div>
                </section>

                {/* FILTERS */}
                <section
                    className="
                        no-print
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
                                Reporting Period
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
                                                .value as ReportFilters['period'],
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

                {/* PRIMARY SUMMARY */}
                <section
                    className="
                        report-summary-grid
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <SummaryCard
                        label="Total Sales"
                        value={
                            formatCurrency(
                                summary.total_sales,
                            )
                        }
                        description="Revenue from confirmed paid orders"
                        icon={
                            Banknote
                        }
                        tone="blue"
                    />

                    <SummaryCard
                        label="Paid Orders"
                        value={
                            summary.paid_orders
                        }
                        description="Orders with confirmed payment"
                        icon={
                            CheckCircle2
                        }
                        tone="green"
                    />

                    <SummaryCard
                        label="Pending Payments"
                        value={
                            summary
                                .pending_payments
                        }
                        description="Orders still waiting for cashier confirmation"
                        icon={
                            Clock
                        }
                        tone="amber"
                    />

                    <SummaryCard
                        label="Released Orders"
                        value={
                            summary
                                .released_orders
                        }
                        description="Orders successfully handed over"
                        icon={
                            PackageCheck
                        }
                        tone="purple"
                    />
                </section>

                {/* INVENTORY SUMMARY */}
                <section
                    className="
                        report-inventory-summary
                        grid
                        gap-4
                        md:grid-cols-3
                    "
                >
                    <SummaryCard
                        label="Stock Received"
                        value={
                            summary
                                .total_stock_received
                        }
                        description="Total units recorded through stock receiving"
                        icon={
                            Boxes
                        }
                        tone="blue"
                    />

                    <SummaryCard
                        label="Low Stock"
                        value={
                            summary
                                .low_stock
                        }
                        description="Variants currently at or below restock threshold"
                        icon={
                            AlertTriangle
                        }
                        tone="amber"
                    />

                    <SummaryCard
                        label="Out of Stock"
                        value={
                            summary
                                .out_of_stock
                        }
                        description="Variants with zero available stock"
                        icon={
                            AlertTriangle
                        }
                        tone="red"
                    />
                </section>

                {/* TOP SELLING */}
                <ReportSection
                    eyebrow="Sales Performance"
                    title="Top-Selling Merchandise"
                    description={
                        `Ranked by units sold during ${periodLabel}.`
                    }
                    icon={
                        ShoppingCart
                    }
                    iconClass="bg-emerald-50 text-emerald-600"
                >
                    {topSellingProducts
                        .length >
                    0 ? (
                        <div
                            className="
                                overflow-x-auto
                            "
                        >
                            <table
                                className="
                                    min-w-full
                                "
                            >
                                <thead
                                    className="
                                        bg-slate-50
                                    "
                                >
                                    <tr>
                                        <TableHeader>
                                            Rank
                                        </TableHeader>

                                        <TableHeader>
                                            Product
                                        </TableHeader>

                                        <TableHeader
                                            align="center"
                                        >
                                            Units Sold
                                        </TableHeader>

                                        <TableHeader
                                            align="center"
                                        >
                                            Sales
                                        </TableHeader>
                                    </tr>
                                </thead>

                                <tbody
                                    className="
                                        divide-y
                                        divide-slate-100
                                    "
                                >
                                    {topSellingProducts.map(
                                        (
                                            product,
                                            index,
                                        ) => (
                                            <tr
                                                key={
                                                    product
                                                        .product_code
                                                }
                                            >
                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            inline-flex
                                                            h-9
                                                            w-9
                                                            items-center
                                                            justify-center
                                                            rounded-xl
                                                            bg-blue-50
                                                            text-sm
                                                            font-black
                                                            text-blue-700
                                                        "
                                                    >
                                                        {
                                                            index
                                                            + 1
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <p
                                                        className="
                                                            font-black
                                                            text-slate-900
                                                        "
                                                    >
                                                        {
                                                            product
                                                                .product_name
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
                                                            product
                                                                .product_code
                                                        }
                                                    </p>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                        text-center
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            inline-flex
                                                            min-w-14
                                                            items-center
                                                            justify-center
                                                            rounded-xl
                                                            bg-violet-50
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            font-black
                                                            text-violet-700
                                                        "
                                                    >
                                                        {
                                                            product
                                                                .units_sold
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-center
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            font-black
                                                            text-emerald-700
                                                        "
                                                    >
                                                        {
                                                            formatCurrency(
                                                                product
                                                                    .total_sales,
                                                            )
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            message="No merchandise sales found for this reporting period."
                        />
                    )}
                </ReportSection>

                {/* SALES BY VARIANT */}
                <ReportSection
                    eyebrow="Variant Performance"
                    title="Sales by Product Variant"
                    description={
                        `Exact variant sales for ${periodLabel}.`
                    }
                    icon={
                        Boxes
                    }
                    iconClass="bg-violet-50 text-violet-600"
                >
                    {salesByVariant.length >
                    0 ? (
                        <div
                            className="
                                overflow-x-auto
                            "
                        >
                            <table
                                className="
                                    min-w-full
                                "
                            >
                                <thead
                                    className="
                                        bg-slate-50
                                    "
                                >
                                    <tr>
                                        <TableHeader>
                                            Product
                                        </TableHeader>

                                        <TableHeader>
                                            Variant
                                        </TableHeader>

                                        <TableHeader>
                                            SKU
                                        </TableHeader>

                                        <TableHeader
                                            align="center"
                                        >
                                            Units Sold
                                        </TableHeader>

                                        <TableHeader
                                            align="center"
                                        >
                                            Sales
                                        </TableHeader>
                                    </tr>
                                </thead>

                                <tbody
                                    className="
                                        divide-y
                                        divide-slate-100
                                    "
                                >
                                    {salesByVariant.map(
                                        (
                                            item,
                                        ) => (
                                            <tr
                                                key={
                                                    `${item.product_code}-${item.sku}`
                                                }
                                            >
                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <p
                                                        className="
                                                            font-black
                                                            text-slate-900
                                                        "
                                                    >
                                                        {
                                                            item
                                                                .product_name
                                                        }
                                                    </p>

                                                    <p
                                                        className="
                                                            mt-1
                                                            font-mono
                                                            text-xs
                                                            text-blue-600
                                                        "
                                                    >
                                                        {
                                                            item
                                                                .product_code
                                                        }
                                                    </p>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            inline-flex
                                                            rounded-xl
                                                            bg-violet-50
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            font-black
                                                            text-violet-700
                                                        "
                                                    >
                                                        {
                                                            item
                                                                .variant_name
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        font-mono
                                                        text-xs
                                                        font-bold
                                                        text-slate-500
                                                    "
                                                >
                                                    {
                                                        item.sku
                                                    }
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-center
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            inline-flex
                                                            min-w-14
                                                            items-center
                                                            justify-center
                                                            rounded-xl
                                                            bg-blue-50
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            font-black
                                                            text-blue-700
                                                        "
                                                    >
                                                        {
                                                            item
                                                                .units_sold
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-center
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            font-black
                                                            text-emerald-700
                                                        "
                                                    >
                                                        {
                                                            formatCurrency(
                                                                item
                                                                    .total_sales,
                                                            )
                                                        }
                                                    </span>
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            message="No variant sales found for this reporting period."
                        />
                    )}
                </ReportSection>

                {/* RECENT ORDERS */}
                <ReportSection
                    title="Recent Paid Orders"
                    description="Latest cashier-confirmed payments."
                    icon={
                        ShoppingCart
                    }
                    iconClass="bg-blue-50 text-blue-600"
                >
                    {recentOrders.length >
                    0 ? (
                        <div
                            className="
                                overflow-x-auto
                            "
                        >
                            <table
                                className="
                                    min-w-full
                                "
                            >
                                <thead
                                    className="
                                        bg-slate-50
                                    "
                                >
                                    <tr>
                                        <TableHeader>
                                            Order
                                        </TableHeader>

                                        <TableHeader>
                                            Student
                                        </TableHeader>

                                        <TableHeader
                                            align="center"
                                        >
                                            Amount
                                        </TableHeader>

                                        <TableHeader>
                                            Payment
                                        </TableHeader>

                                        <TableHeader>
                                            Fulfillment
                                        </TableHeader>

                                        <TableHeader>
                                            Paid At
                                        </TableHeader>
                                    </tr>
                                </thead>

                                <tbody
                                    className="
                                        divide-y
                                        divide-slate-100
                                    "
                                >
                                    {recentOrders.map(
                                        (
                                            order,
                                        ) => (
                                            <tr
                                                key={
                                                    order.id
                                                }
                                            >
                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <p
                                                        className="
                                                            font-mono
                                                            text-sm
                                                            font-black
                                                            text-blue-700
                                                        "
                                                    >
                                                        {
                                                            order
                                                                .order_number
                                                        }
                                                    </p>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <p
                                                        className="
                                                            text-sm
                                                            font-bold
                                                            text-slate-800
                                                        "
                                                    >
                                                        {
                                                            order
                                                                .student_name
                                                        }
                                                    </p>
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-center
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            inline-flex
                                                            rounded-xl
                                                            bg-emerald-50
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            font-black
                                                            text-emerald-700
                                                        "
                                                    >
                                                        {
                                                            formatCurrency(
                                                                Number(
                                                                    order
                                                                        .total,
                                                                ),
                                                            )
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <StatusBadge
                                                        value={
                                                            order
                                                                .payment_status
                                                        }
                                                    />
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <StatusBadge
                                                        value={
                                                            order
                                                                .fulfillment_status
                                                        }
                                                    />
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-sm
                                                        text-slate-500
                                                    "
                                                >
                                                    {
                                                        order
                                                            .paid_at
                                                        ?? '—'
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            message="No paid orders found for this reporting period."
                        />
                    )}
                </ReportSection>

                {/* RECENT RECEIPTS */}
                <ReportSection
                    title="Recent Stock Receipts"
                    description="Latest merchandise received into inventory."
                    icon={
                        ReceiptText
                    }
                    iconClass="bg-violet-50 text-violet-600"
                >
                    {recentReceipts.length >
                    0 ? (
                        <div
                            className="
                                overflow-x-auto
                            "
                        >
                            <table
                                className="
                                    min-w-full
                                "
                            >
                                <thead
                                    className="
                                        bg-slate-50
                                    "
                                >
                                    <tr>
                                        <TableHeader>
                                            Receipt
                                        </TableHeader>

                                        <TableHeader>
                                            Product
                                        </TableHeader>

                                        <TableHeader>
                                            Variant
                                        </TableHeader>

                                        <TableHeader
                                            align="center"
                                        >
                                            Received
                                        </TableHeader>

                                        <TableHeader>
                                            Staff
                                        </TableHeader>

                                        <TableHeader>
                                            Date
                                        </TableHeader>
                                    </tr>
                                </thead>

                                <tbody
                                    className="
                                        divide-y
                                        divide-slate-100
                                    "
                                >
                                    {recentReceipts.map(
                                        (
                                            receipt,
                                        ) => (
                                            <tr
                                                key={
                                                    receipt.id
                                                }
                                            >
                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <p
                                                        className="
                                                            font-mono
                                                            text-sm
                                                            font-black
                                                            text-blue-700
                                                        "
                                                    >
                                                        {
                                                            receipt
                                                                .receipt_number
                                                            ?? 'N/A'
                                                        }
                                                    </p>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                    "
                                                >
                                                    <p
                                                        className="
                                                            text-sm
                                                            font-black
                                                            text-slate-900
                                                        "
                                                    >
                                                        {
                                                            receipt
                                                                .product_name
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
                                                            receipt
                                                                .product_code
                                                        }
                                                    </p>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                        text-sm
                                                        font-semibold
                                                        text-slate-700
                                                    "
                                                >
                                                    {
                                                        receipt
                                                            .variant_name
                                                    }
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-center
                                                    "
                                                >
                                                    <span
                                                        className="
                                                            inline-flex
                                                            rounded-xl
                                                            bg-blue-50
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            font-black
                                                            text-blue-700
                                                        "
                                                    >
                                                        +
                                                        {
                                                            receipt
                                                                .quantity
                                                        }
                                                    </span>
                                                </td>

                                                <td
                                                    className="
                                                        px-6
                                                        py-5
                                                        text-sm
                                                        font-bold
                                                        text-slate-700
                                                    "
                                                >
                                                    {
                                                        receipt
                                                            .received_by
                                                    }
                                                </td>

                                                <td
                                                    className="
                                                        whitespace-nowrap
                                                        px-6
                                                        py-5
                                                        text-sm
                                                        text-slate-500
                                                    "
                                                >
                                                    {
                                                        receipt
                                                            .created_at
                                                        ?? '—'
                                                    }
                                                </td>
                                            </tr>
                                        ),
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            message="No stock receipts found for this reporting period."
                        />
                    )}
                </ReportSection>

                {/* PRINT FOOTER */}
                <section
                    className="
                        print-report-footer
                        hidden
                    "
                >
                    <div
                        className="
                            mt-8
                            border-t
                            border-slate-300
                            pt-4
                        "
                    >
                        <p
                            className="
                                text-center
                                text-xs
                                text-slate-500
                            "
                        >
                            STI PROWARE —
                            Merchandise and
                            Inventory Management
                            System
                        </p>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Report Section
|--------------------------------------------------------------------------
*/

function ReportSection({
    eyebrow,
    title,
    description,
    icon: Icon,
    iconClass,
    children,
}: {
    eyebrow?: string;
    title: string;
    description: string;
    icon: typeof Boxes;
    iconClass: string;
    children: ReactNode;
}) {
    return (
        <section
            className="
                report-section
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
                    report-section-header
                    flex
                    items-center
                    justify-between
                    gap-4
                    border-b
                    border-slate-100
                    px-6
                    py-5
                "
            >
                <div>
                    {eyebrow && (
                        <p
                            className="
                                text-xs
                                font-black
                                uppercase
                                tracking-wide
                                text-blue-600
                            "
                        >
                            {eyebrow}
                        </p>
                    )}

                    <h2
                        className="
                            mt-1
                            text-xl
                            font-black
                            text-slate-900
                        "
                    >
                        {title}
                    </h2>

                    <p
                        className="
                            mt-1
                            text-sm
                            text-slate-500
                        "
                    >
                        {description}
                    </p>
                </div>

                <div
                    className={`
                        report-section-icon
                        flex
                        h-11
                        w-11
                        items-center
                        justify-center
                        rounded-xl
                        ${iconClass}
                    `}
                >
                    <Icon
                        size={20}
                    />
                </div>
            </div>

            {children}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone =
    | 'blue'
    | 'green'
    | 'amber'
    | 'purple'
    | 'red';

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    tone,
}: {
    label: string;
    value: string | number;
    description: string;
    icon: typeof Banknote;
    tone: SummaryTone;
}) {
    const styles:
        Record<
            SummaryTone,
            {
                card: string;
                icon: string;
                value: string;
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

        red: {
            card:
                'border-red-100 bg-red-50/40',

            icon:
                'bg-red-100 text-red-600',

            value:
                'text-red-700',
        },
    };

    const style =
        styles[
            tone
        ];

    return (
        <article
            className={`
                report-summary-card
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
                        report-summary-icon
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
| Table Header
|--------------------------------------------------------------------------
*/

function TableHeader({
    children,
    align = 'left',
}: {
    children: ReactNode;

    align?:
        | 'left'
        | 'center';
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
                    align ===
                    'center'
                        ? 'text-center'
                        : 'text-left'
                }
            `}
        >
            {children}
        </th>
    );
}

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

function StatusBadge({
    value,
}: {
    value: string;
}) {
    const normalized =
        value
            .toLowerCase()
            .replaceAll(
                ' ',
                '_',
            );

    if (
        normalized ===
        'paid'
        ||
        normalized ===
        'released'
        ||
        normalized ===
        'completed'
    ) {
        return (
            <span
                className="
                    inline-flex
                    rounded-full
                    bg-emerald-100
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-emerald-700
                "
            >
                {
                    formatStatus(
                        value,
                    )
                }
            </span>
        );
    }

    if (
        normalized ===
        'pending'
        ||
        normalized ===
        'pending_payment'
        ||
        normalized ===
        'waiting'
    ) {
        return (
            <span
                className="
                    inline-flex
                    rounded-full
                    bg-amber-100
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-amber-700
                "
            >
                {
                    formatStatus(
                        value,
                    )
                }
            </span>
        );
    }

    if (
        normalized ===
        'cancelled'
        ||
        normalized ===
        'canceled'
    ) {
        return (
            <span
                className="
                    inline-flex
                    rounded-full
                    bg-red-100
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-red-700
                "
            >
                {
                    formatStatus(
                        value,
                    )
                }
            </span>
        );
    }

    return (
        <span
            className="
                inline-flex
                rounded-full
                bg-slate-100
                px-3
                py-1.5
                text-xs
                font-black
                text-slate-600
            "
        >
            {
                formatStatus(
                    value,
                )
            }
        </span>
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
    message: string;
}) {
    return (
        <div
            className="
                px-6
                py-14
                text-center
            "
        >
            <ReceiptText
                size={38}
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
    value: number,
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

function formatStatus(
    value: string,
): string {
    return value
        .replaceAll(
            '_',
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