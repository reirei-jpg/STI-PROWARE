import {
    Head,
    router,
} from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarRange,
    CheckCircle2,
    ClipboardList,
    Package,
    PackageCheck,
    Percent,
    Printer,
    ShoppingBag,
    ShoppingCart,
    Truck,
    Wallet,
} from 'lucide-react';


import type {
    LucideIcon,
} from 'lucide-react';
import {
    useState,
} from 'react';

import {
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';


import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type Period =
    | 'today'
    | 'week'
    | 'month'
    | 'custom';

interface Filters {
    period: Period;
    start_date: string;
    end_date: string;
}

interface Summary {
    total_sales: number;
    paid_orders: number;
    average_order_value: number;
    pending_payments: number;
    released_orders: number;
    fulfillment_rate: number;
    units_sold: number;
    total_stock_received: number;
}

interface InventoryHealth {
    in_stock: number;
    low_stock: number;
    out_of_stock: number;
}

interface SalesTrendPoint {
    date: string;
    full_date: string;
    sales: number;
    orders: number;
}

interface TopProduct {
    product_code: string;
    product_name: string;
    units_sold: number;
    total_sales: number;
}

interface SalesByVariantRow {
    product_code: string;
    product_name: string;
    variant_name: string;
    sku: string;
    units_sold: number;
    total_sales: number;
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

interface ReportsPageProps {
    filters: Filters;
    periodLabel: string;
    summary: Summary;
    inventoryHealth: InventoryHealth;
    salesTrend: SalesTrendPoint[];
    topSellingProducts: TopProduct[];
    salesByVariant: SalesByVariantRow[];
    recentOrders: RecentOrder[];
    recentReceipts: RecentReceipt[];
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({
    filters,
    periodLabel,
    summary,
    inventoryHealth,
    salesTrend,
    topSellingProducts,
    salesByVariant,
    recentOrders,
    recentReceipts,
}: ReportsPageProps) {
    const [
        period,
        setPeriod,
    ] = useState<Period>(
        filters.period,
    );

    const [
        startDate,
        setStartDate,
    ] = useState(
        filters.start_date,
    );

    const [
        endDate,
        setEndDate,
    ] = useState(
        filters.end_date,
    );

    /*
    |--------------------------------------------------------------------------
    | Apply Filter
    |--------------------------------------------------------------------------
    */

    const applyFilter = (
        nextPeriod: Period,
    ): void => {
        setPeriod(nextPeriod);

        if (nextPeriod === 'custom') {
            return;
        }

        router.get(
            '/admin/reports',
            { period: nextPeriod },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const applyCustomRange = (): void => {
        if (!startDate || !endDate) {
            return;
        }

        router.get(
            '/admin/reports',
            {
                period: 'custom',
                start_date: startDate,
                end_date: endDate,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const inventoryTotal =
        inventoryHealth.in_stock
        + inventoryHealth.low_stock
        + inventoryHealth.out_of_stock;

    const inventoryChartData = [
        {
            name: 'In Stock',
            value: inventoryHealth.in_stock,
            color: 'var(--chart-good)',
        },
        {
            name: 'Low Stock',
            value: inventoryHealth.low_stock,
            color: 'var(--chart-warn)',
        },
        {
            name: 'Out of Stock',
            value: inventoryHealth.out_of_stock,
            color: 'var(--chart-bad)',
        },
    ];

    return (
        <AdminLayout>
            <Head title="Reports & Analytics" />

            <div
                className="mx-auto max-w-7xl space-y-7"
                style={{
                    '--chart-good': '#10b981',
                    '--chart-warn': '#f59e0b',
                    '--chart-bad': '#ef4444',
                } as React.CSSProperties}
            >
                {/* Print-only heading */}
                <div className="print-report-heading hidden">
                    <h1 className="text-2xl font-black text-black">
                        STI PROWARE — Reports &amp; Analytics
                    </h1>
                    <p className="text-sm text-black">
                        {periodLabel}
                    </p>
                </div>

                {/* Header */}
                <section className="no-print flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-black uppercase tracking-wide text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Reports &amp; Analytics
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            {periodLabel}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <Printer size={18} />
                        Print Report
                    </button>
                </section>

                {/* Period Filter */}
                <section className="no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        {(
                            [
                                ['today', 'Today'],
                                ['week', 'This Week'],
                                ['month', 'This Month'],
                                ['custom', 'Custom Range'],
                            ] as [Period, string][]
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => applyFilter(value)}
                                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                                    period === value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {label}
                            </button>
                        ))}

                        {period === 'custom' && (
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(event) =>
                                        setStartDate(event.target.value)
                                    }
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                                />

                                <span className="text-xs text-slate-400">
                                    to
                                </span>

                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(event) =>
                                        setEndDate(event.target.value)
                                    }
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                                />

                                <button
                                    type="button"
                                    disabled={!startDate || !endDate}
                                    onClick={applyCustomRange}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <CalendarRange size={14} />
                                    Apply
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Summary Grid — consolidated, one grid instead of two */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat
                        label="Total Sales"
                        value={formatCurrency(summary.total_sales)}
                        icon={Wallet}
                        tone="blue"
                    />
                    <Stat
                        label="Paid Orders"
                        value={String(summary.paid_orders)}
                        icon={ShoppingCart}
                        tone="blue"
                    />
                    <Stat
                        label="Avg. Order Value"
                        value={formatCurrency(summary.average_order_value)}
                        icon={ShoppingBag}
                        tone="purple"
                    />
                    <Stat
                        label="Fulfillment Rate"
                        value={`${summary.fulfillment_rate}%`}
                        icon={Percent}
                        tone="green"
                    />
                    <Stat
                        label="Pending Payments"
                        value={String(summary.pending_payments)}
                        icon={ClipboardList}
                        tone={
                            summary.pending_payments > 0
                                ? 'amber'
                                : 'green'
                        }
                    />
                    <Stat
                        label="Released Orders"
                        value={String(summary.released_orders)}
                        icon={PackageCheck}
                        tone="blue"
                    />
                    <Stat
                        label="Units Sold"
                        value={String(summary.units_sold)}
                        icon={Package}
                        tone="slate"
                    />
                    <Stat
                        label="Stock Received"
                        value={String(summary.total_stock_received)}
                        icon={Truck}
                        tone="green"
                    />
                </section>

                {/* Charts */}
                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    {/* Sales Trend */}
                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            Sales Trend
                        </p>
                        <h2 className="mt-1 text-lg font-black text-slate-900">
                            Daily Sales for the Selected Period
                        </h2>

                        {salesTrend.length > 0 ? (
                            <div className="mt-4 h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesTrend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11, fill: '#64748b' }}
                                            axisLine={{ stroke: '#e2e8f0' }}
                                            tickLine={false}
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
                                            formatter={(value, name) =>
                                                name === 'sales'
                                                    ? [formatCurrency(Number(value)), 'Sales']
                                                    : [Number(value), 'Orders']
                                            }
                                            contentStyle={{
                                                borderRadius: 12,
                                                border: '1px solid #e2e8f0',
                                                fontSize: 12,
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="#2563eb"
                                            strokeWidth={2.5}
                                            dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyState message="No paid orders recorded in this period." />
                        )}
                    </article>

                    {/* Inventory Health */}
                    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            Inventory Health
                        </p>
                        <h2 className="mt-1 text-lg font-black text-slate-900">
                            Current Stock Status
                        </h2>

                        {inventoryTotal > 0 ? (
                            <>
                                <div className="mt-2 h-52 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={inventoryChartData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={54}
                                                outerRadius={80}
                                                paddingAngle={2}
                                            >
                                                {inventoryChartData.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value, name) => [
                                                    `${value} variant${Number(value) === 1 ? '' : 's'}`,
                                                    String(name),
                                                ]}
                                                contentStyle={{
                                                    borderRadius: 12,
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                iconType="circle"
                                                iconSize={8}
                                                formatter={(value: string) => (
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        {value}
                                                    </span>
                                                )}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {inventoryHealth.out_of_stock > 0 && (
                                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">
                                        <AlertTriangle size={15} />
                                        {inventoryHealth.out_of_stock} variant
                                        {inventoryHealth.out_of_stock === 1 ? '' : 's'} out of stock
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyState message="No inventory records yet." />
                        )}
                    </article>
                </section>

                {/* Top-Selling Merchandise */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="text-lg font-black text-slate-900">
                            Top-Selling Merchandise
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Ranked by units sold in the selected period.
                        </p>
                    </div>

                    {topSellingProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Product</th>
                                        <th className="px-6 py-3 text-right">Units Sold</th>
                                        <th className="px-6 py-3 text-right">Total Sales</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {topSellingProducts.map((product) => (
                                        <tr key={product.product_code}>
                                            <td className="px-6 py-3.5">
                                                <p className="font-bold text-slate-900">
                                                    {product.product_name}
                                                </p>
                                                <p className="font-mono text-xs text-slate-400">
                                                    {product.product_code}
                                                </p>
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-black text-slate-900">
                                                {product.units_sold}
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-black text-emerald-700">
                                                {formatCurrency(product.total_sales)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState message="No merchandise sold in this period." />
                    )}
                </section>

                {/* Sales by Variant */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="text-lg font-black text-slate-900">
                            Sales by Product Variant
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Every variant sold in the selected period.
                        </p>
                    </div>

                    {salesByVariant.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-6 py-3">Product</th>
                                        <th className="px-6 py-3">Variant</th>
                                        <th className="px-6 py-3">SKU</th>
                                        <th className="px-6 py-3 text-right">Units</th>
                                        <th className="px-6 py-3 text-right">Sales</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {salesByVariant.map((row) => (
                                        <tr key={`${row.product_code}-${row.sku}`}>
                                            <td className="px-6 py-3">
                                                <p className="font-bold text-slate-900">
                                                    {row.product_name}
                                                </p>
                                                <p className="font-mono text-xs text-slate-400">
                                                    {row.product_code}
                                                </p>
                                            </td>
                                            <td className="px-6 py-3 text-slate-600">
                                                {row.variant_name}
                                            </td>
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">
                                                {row.sku}
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-900">
                                                {row.units_sold}
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-emerald-700">
                                                {formatCurrency(row.total_sales)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState message="No variant sales in this period." />
                    )}
                </section>

                {/* Recent Orders + Recent Receipts */}
                <section className="grid gap-6 xl:grid-cols-2">
                    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                            <h2 className="text-lg font-black text-slate-900">
                                Recent Paid Orders
                            </h2>
                        </div>

                        {recentOrders.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {recentOrders.map((order) => (
                                    <div key={order.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs font-black text-blue-600">
                                                {order.order_number}
                                            </p>
                                            <p className="mt-1 truncate font-bold text-slate-900">
                                                {order.student_name}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {order.paid_at ?? 'Date unavailable'}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-black text-slate-900">
                                            {formatCurrency(Number(order.total))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No paid orders in this period." />
                        )}
                    </article>

                    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                            <h2 className="text-lg font-black text-slate-900">
                                Recent Stock Receipts
                            </h2>
                        </div>

                        {recentReceipts.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {recentReceipts.map((receipt) => (
                                    <div key={receipt.id} className="flex items-center justify-between gap-4 px-6 py-4">
                                        <div className="min-w-0">
                                            <p className="font-mono text-xs font-black text-emerald-600">
                                                {receipt.receipt_number ?? 'No receipt #'}
                                            </p>
                                            <p className="mt-1 truncate font-bold text-slate-900">
                                                {receipt.product_name} — {receipt.variant_name}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-400">
                                                {receipt.received_by} · {receipt.created_at ?? 'Date unavailable'}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-black text-emerald-700">
                                            +{receipt.quantity}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState message="No stock received in this period." />
                        )}
                    </article>
                </section>
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Stat Tile
|--------------------------------------------------------------------------
*/

type StatTone =
    | 'blue'
    | 'green'
    | 'amber'
    | 'purple'
    | 'slate';

function Stat({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: StatTone;
}) {
    const tones: Record<StatTone, { wrapper: string; icon: string }> = {
        blue: {
            wrapper: 'border-blue-100 bg-blue-50/60',
            icon: 'bg-blue-100 text-blue-700',
        },
        green: {
            wrapper: 'border-emerald-100 bg-emerald-50/60',
            icon: 'bg-emerald-100 text-emerald-700',
        },
        amber: {
            wrapper: 'border-amber-100 bg-amber-50/60',
            icon: 'bg-amber-100 text-amber-700',
        },
        purple: {
            wrapper: 'border-purple-100 bg-purple-50/60',
            icon: 'bg-purple-100 text-purple-700',
        },
        slate: {
            wrapper: 'border-slate-200 bg-slate-50',
            icon: 'bg-slate-200 text-slate-700',
        },
    };

    const style = tones[tone];

    return (
        <article className={`rounded-2xl border p-4 ${style.wrapper}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.icon}`}>
                <Icon size={17} />
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {label}
            </p>
            <p className="mt-1 text-lg font-black text-slate-900">
                {value}
            </p>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <CheckCircle2 size={30} className="text-slate-300" />
            <p className="text-sm text-slate-500">{message}</p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
}
