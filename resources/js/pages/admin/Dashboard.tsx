import {
    Head,
    Link,
} from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    CheckCircle2,
    Clock3,
    ClipboardList,
    Package,
    PackageCheck,
    ShoppingBag,
    ShoppingCart,
    Truck,
    WalletCards,
} from 'lucide-react';

import type {
    LucideIcon,
} from 'lucide-react';


import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface AdminOverview {
    orders_today: number;
    active_products: number;
    total_available_stock: number;
}

interface TodaySales {
    total: string;
    transactions: number;
    trend: number | null;
}

interface TransactionSummary {
    pending_payments: number;
}

interface SpecialistActivity {
    stock_in_today: number;
    stock_out_today: number;
    released_today: number;
}

interface PurchaseOrderSummary {
    draft: number;
    awaiting_delivery: number;
    partially_received: number;
    completed: number;
}

interface RecentOrder {
    id: number;
    order_number: string;
    student_name: string;
    payment_status: string;
    fulfillment_status: string;
    total: string;
    created_at: string | null;
}

interface InventoryAlert {
    id: number;
    product_name: string;
    product_code: string;
    variant_name: string;
    available_quantity: number;
    reorder_level: number;
    stock_status:
        | 'low_stock'
        | 'out_of_stock'
        | 'in_stock';
}

interface AdminDashboardProps {
    todayDate: string;

    overview: AdminOverview;

    todaySales: TodaySales;

    transactions: TransactionSummary;

    specialistActivity: SpecialistActivity;

    purchaseOrders: PurchaseOrderSummary;

    recentOrders: RecentOrder[];

    inventoryAlerts: InventoryAlert[];
}

type MetricTone =
    | 'blue'
    | 'green'
    | 'amber'
    | 'red'
    | 'slate'
    | 'purple';

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

export default function Dashboard({
    todayDate,
    overview,
    todaySales,
    transactions,
    specialistActivity,
    purchaseOrders,
    recentOrders,
    inventoryAlerts,
}: AdminDashboardProps) {
    const activePurchaseOrders =
        purchaseOrders.draft
        + purchaseOrders.awaiting_delivery
        + purchaseOrders.partially_received;

    return (
        <AdminLayout>
            <Head title="Admin Dashboard" />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/* Page Header */}
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
                        Admin Control Center
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
                        Monitor merchandise,
                        inventory, procurement,
                        orders, employee operations,
                        and overall activity across
                        PROWARE.
                    </p>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | System Overview
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6
                        shadow-sm
                        sm:p-7
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
                        <div>
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-blue-600
                                "
                            >
                                System Monitoring
                            </p>

                            <h2
                                className="
                                    mt-1
                                    text-xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                System Overview
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Current merchandise,
                                order, and inventory
                                health.
                            </p>
                        </div>

                        <Link
                            href="/staff/inventory"
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
                            View Inventory

                            <ArrowRight
                                size={16}
                            />
                        </Link>
                    </div>

                    <div
                        className="
                            mt-6
                            grid
                            gap-4
                            sm:grid-cols-3
                        "
                    >
                        <OverviewMetric
                            label="Orders Today"
                            value={
                                overview.orders_today
                            }
                            icon={ShoppingBag}
                            tone="blue"
                            href="/admin/orders"
                        />

                        <OverviewMetric
                            label="Active Products"
                            value={
                                overview.active_products
                            }
                            icon={Package}
                            tone="purple"
                            href="/admin/products"
                        />

                        <OverviewMetric
                            label="Available Stock"
                            value={
                                overview
                                    .total_available_stock
                            }
                            icon={Boxes}
                            tone="green"
                            href="/staff/inventory"
                        />
                    </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Department Monitoring
                |--------------------------------------------------------------------------
                */}

                <section>
                    <div>
                        <p
                            className="
                                text-xs
                                font-black
                                uppercase
                                tracking-wide
                                text-blue-600
                            "
                        >
                            Department Monitoring
                        </p>

                        <h2
                            className="
                                mt-1
                                text-xl
                                font-black
                                text-slate-900
                            "
                        >
                            Operational Activity
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Monitor the major
                            activities performed by
                            the Cashier and
                            Specialist departments.
                        </p>
                    </div>

                    <div
                        className="
                            mt-5
                            grid
                            gap-6
                            xl:grid-cols-2
                        "
                    >
                        {/*
                        |--------------------------------------------------------------------------
                        | Cashier Activity
                        |--------------------------------------------------------------------------
                        */}

                        <DepartmentCard
                            title="Cashier Activity"
                            subtitle="Financial and payment monitoring"
                            icon={WalletCards}
                            tone="blue"
                            columns={2}
                            footer={
                                <Link
                                    href="/admin/sales"
                                    className="
                                        inline-flex
                                        items-center
                                        gap-2
                                        text-sm
                                        font-black
                                        text-blue-600
                                        transition
                                        hover:text-blue-800
                                    "
                                >
                                    Sales Monitoring

                                    <ArrowRight
                                        size={16}
                                    />
                                </Link>
                            }
                        >
                            <DepartmentMetric
                                label="Sales Today"
                                value={formatCurrency(
                                    todaySales.total,
                                )}
                                sublabel={`${todaySales.transactions} transaction${todaySales.transactions === 1 ? '' : 's'}`}
                                icon={ShoppingCart}
                                tone="blue"
                                href={`/admin/sales?date_from=${todayDate}&date_to=${todayDate}`}
                            />

                            <DepartmentMetric
                                label="Pending Payments"
                                value={String(
                                    transactions
                                        .pending_payments,
                                )}
                                icon={Clock3}
                                tone={
                                    transactions
                                        .pending_payments
                                        > 0
                                        ? 'amber'
                                        : 'green'
                                }
                                href="/admin/orders?status=pending_payment"
                            />
                        </DepartmentCard>

                        {/*
                        |--------------------------------------------------------------------------
                        | Specialist Activity
                        |--------------------------------------------------------------------------
                        */}

                        <DepartmentCard
                            title="Specialist Activity"
                            subtitle="Inventory and merchandise fulfillment monitoring"
                            icon={PackageCheck}
                            tone="green"
                            footer={
                                <div
                                    className="
                                        flex
                                        flex-wrap
                                        items-center
                                        gap-4
                                    "
                                >
                                    <Link
                                        href="/staff/inventory"
                                        className="
                                            inline-flex
                                            items-center
                                            gap-2
                                            text-sm
                                            font-black
                                            text-blue-600
                                            transition
                                            hover:text-blue-800
                                        "
                                    >
                                        Inventory

                                        <ArrowRight
                                            size={16}
                                        />
                                    </Link>

                                    <Link
                                        href="/staff/stock-receipts"
                                        className="
                                            inline-flex
                                            items-center
                                            gap-2
                                            text-sm
                                            font-black
                                            text-emerald-600
                                            transition
                                            hover:text-emerald-800
                                        "
                                    >
                                        Receipt History

                                        <ArrowRight
                                            size={16}
                                        />
                                    </Link>
                                </div>
                            }
                        >
                            <DepartmentMetric
                                label="Stock In Today"
                                value={`${specialistActivity.stock_in_today} units`}
                                icon={Truck}
                                tone="green"
                                href="/staff/inventory/movements?direction=in"
                            />

                            <DepartmentMetric
                                label="Stock Out Today"
                                value={`${specialistActivity.stock_out_today} units`}
                                icon={Package}
                                tone="amber"
                                href="/staff/inventory/movements?direction=out"
                            />

                            <DepartmentMetric
                                label="Released Today"
                                value={String(
                                    specialistActivity
                                        .released_today,
                                )}
                                icon={PackageCheck}
                                tone="blue"
                                href="/admin/orders?status=released"
                            />
                        </DepartmentCard>
                    </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Purchase Order Monitoring
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6
                        shadow-sm
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
                        <div>
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-purple-600
                                "
                            >
                                Procurement Monitoring
                            </p>

                            <h2
                                className="
                                    mt-1
                                    text-xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                Purchase Orders
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Monitor purchase
                                orders from creation
                                through receiving and
                                completion.
                            </p>
                        </div>

                        <Link
                            href="/admin/purchase-orders"
                            className="
                                inline-flex
                                items-center
                                gap-2
                                text-sm
                                font-black
                                text-blue-600
                                transition
                                hover:text-blue-800
                            "
                        >
                            View Purchase Orders

                            <ArrowRight
                                size={16}
                            />
                        </Link>
                    </div>

                    <div
                        className="
                            mt-6
                            grid
                            gap-4
                            sm:grid-cols-2
                            xl:grid-cols-4
                        "
                    >
                        <OverviewMetric
                            label="Draft"
                            value={
                                purchaseOrders.draft
                            }
                            icon={ClipboardList}
                            tone="slate"
                            href="/admin/purchase-orders?status=draft"
                        />

                        <OverviewMetric
                            label="Awaiting Delivery"
                            value={
                                purchaseOrders
                                    .awaiting_delivery
                            }
                            icon={Truck}
                            tone="blue"
                            href="/admin/purchase-orders?status=ordered"
                        />

                        <OverviewMetric
                            label="Partially Received"
                            value={
                                purchaseOrders
                                    .partially_received
                            }
                            icon={Clock3}
                            tone="amber"
                            href="/admin/purchase-orders?status=partially_received"
                        />

                        <OverviewMetric
                            label="Completed"
                            value={
                                purchaseOrders
                                    .completed
                            }
                            icon={CheckCircle2}
                            tone="green"
                            href="/admin/purchase-orders?status=completed"
                        />
                    </div>

                    {activePurchaseOrders > 0 && (
                        <div
                            className="
                                mt-5
                                rounded-2xl
                                border
                                border-blue-100
                                bg-blue-50
                                px-4
                                py-3
                                text-sm
                                text-blue-700
                            "
                        >
                            <strong>
                                {
                                    activePurchaseOrders
                                }
                            </strong>{' '}
                            purchase order
                            {activePurchaseOrders ===
                            1
                                ? ''
                                : 's'}{' '}
                            currently require
                            monitoring before
                            completion.
                        </div>
                    )}
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Needs Attention + Recent Orders
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        grid
                        items-start
                        gap-6
                        xl:grid-cols-[380px_minmax(0,1fr)]
                    "
                >
                    {/* Inventory Alerts */}
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
                            "
                        >
                            <div>
                                <h2
                                    className="
                                        text-lg
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Needs Attention
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Inventory problems
                                    requiring Admin
                                    review.
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
                                    bg-red-50
                                    text-red-600
                                "
                            >
                                <AlertTriangle
                                    size={20}
                                />
                            </div>
                        </div>

                        {inventoryAlerts.length >
                        0 ? (
                            <>
                                <div className="divide-y divide-slate-100">
                                    {inventoryAlerts.map(
                                        (
                                            alert,
                                        ) => (
                                            <InventoryAlertRow
                                                key={
                                                    alert.id
                                                }
                                                alert={
                                                    alert
                                                }
                                            />
                                        ),
                                    )}
                                </div>

                                <div
                                    className="
                                        border-t
                                        border-slate-100
                                        p-4
                                    "
                                >
                                    <Link
                                        href="/staff/inventory"
                                        className="
                                            flex
                                            w-full
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            bg-blue-50
                                            px-4
                                            py-3
                                            text-sm
                                            font-black
                                            text-blue-700
                                            transition
                                            hover:bg-blue-100
                                        "
                                    >
                                        Review Inventory

                                        <ArrowRight
                                            size={16}
                                        />
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <div
                                className="
                                    px-6
                                    py-12
                                    text-center
                                "
                            >
                                <CheckCircle2
                                    size={38}
                                    className="
                                        mx-auto
                                        text-emerald-400
                                    "
                                />

                                <h3
                                    className="
                                        mt-4
                                        font-black
                                        text-slate-800
                                    "
                                >
                                    Inventory looks
                                    healthy
                                </h3>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        leading-6
                                        text-slate-500
                                    "
                                >
                                    No low-stock or
                                    out-of-stock
                                    variants currently
                                    require attention.
                                </p>
                            </div>
                        )}
                    </article>

                    {/* Recent Orders */}
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
                                <h2
                                    className="
                                        text-lg
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Recent Orders
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Latest student
                                    transactions moving
                                    through PROWARE.
                                </p>
                            </div>

                            <Link
                                href="/admin/orders"
                                className="
                                    inline-flex
                                    items-center
                                    gap-2
                                    text-sm
                                    font-black
                                    text-blue-600
                                    transition
                                    hover:text-blue-800
                                "
                            >
                                View All

                                <ArrowRight
                                    size={16}
                                />
                            </Link>
                        </div>

                        {recentOrders.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {recentOrders.map(
                                    (order) => (
                                        <RecentOrderRow
                                            key={
                                                order.id
                                            }
                                            order={
                                                order
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div
                                className="
                                    px-6
                                    py-14
                                    text-center
                                "
                            >
                                <ShoppingBag
                                    size={36}
                                    className="
                                        mx-auto
                                        text-slate-300
                                    "
                                />

                                <h3
                                    className="
                                        mt-4
                                        font-black
                                        text-slate-800
                                    "
                                >
                                    No recent orders
                                </h3>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Student
                                    transactions will
                                    appear here.
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
| Department Card
|--------------------------------------------------------------------------
*/

function DepartmentCard({
    title,
    subtitle,
    icon: Icon,
    tone,
    footer,
    children,
    columns = 3,
}: {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    tone: 'blue' | 'green';
    footer: React.ReactNode;
    children: React.ReactNode;
    columns?: 2 | 3;
}) {
    const style =
        tone === 'blue'
            ? {
                  header:
                      'bg-blue-50',
                  icon:
                      'bg-blue-100 text-blue-700',
              }
            : {
                  header:
                      'bg-emerald-50',
                  icon:
                      'bg-emerald-100 text-emerald-700',
              };

    return (
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
                className={`
                    flex
                    items-start
                    justify-between
                    gap-4
                    px-6
                    py-5
                    ${style.header}
                `}
            >
                <div>
                    <h3
                        className="
                            text-lg
                            font-black
                            text-slate-900
                        "
                    >
                        {title}
                    </h3>

                    <p
                        className="
                            mt-1
                            text-sm
                            text-slate-500
                        "
                    >
                        {subtitle}
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
                    <Icon size={21} />
                </div>
            </div>

            <div
                className={`
                    grid
                    gap-3
                    p-5
                    ${
                        columns === 2
                            ? 'sm:grid-cols-2'
                            : 'sm:grid-cols-3'
                    }
                `}
            >
                {children}
            </div>

            <div
                className="
                    border-t
                    border-slate-100
                    px-6
                    py-4
                "
            >
                {footer}
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Department Metric
|--------------------------------------------------------------------------
*/

function DepartmentMetric({
    label,
    value,
    sublabel,
    icon: Icon,
    tone,
    href,
}: {
    label: string;
    value: string;
    sublabel?: string;
    icon: LucideIcon;
    tone:
        | 'blue'
        | 'green'
        | 'amber';
    href?: string;
}) {
    const styles = {
        blue:
            'bg-blue-50 text-blue-700',

        green:
            'bg-emerald-50 text-emerald-700',

        amber:
            'bg-amber-50 text-amber-700',
    };

    const content = (
        <>
            <div
                className={`
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    ${styles[tone]}
                `}
            >
                <Icon size={18} />
            </div>

            <p
                className="
                    mt-4
                    text-xs
                    font-bold
                    text-slate-500
                "
            >
                {label}
            </p>

            <p
                className="
                    mt-1
                    text-xl
                    font-black
                    text-slate-900
                "
            >
                {value}
            </p>

            {sublabel && (
                <p
                    className="
                        mt-0.5
                        text-xs
                        text-slate-400
                    "
                >
                    {sublabel}
                </p>
            )}
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="
                    block
                    rounded-2xl
                    border
                    border-slate-100
                    bg-white
                    p-4
                    transition
                    hover:-translate-y-0.5
                    hover:border-blue-200
                    hover:shadow-md
                "
            >
                {content}
            </Link>
        );
    }

    return (
        <div
            className="
                rounded-2xl
                border
                border-slate-100
                bg-white
                p-4
            "
        >
            {content}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Overview Metric
|--------------------------------------------------------------------------
*/

function OverviewMetric({
    label,
    value,
    icon: Icon,
    tone,
    href,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: MetricTone;
    href?: string;
}) {
    const tones: Record<
        MetricTone,
        {
            wrapper: string;
            icon: string;
            value: string;
        }
    > = {
        blue: {
            wrapper:
                'border-blue-100 bg-blue-50/60',

            icon:
                'bg-blue-100 text-blue-700',

            value:
                'text-blue-700',
        },

        green: {
            wrapper:
                'border-emerald-100 bg-emerald-50/60',

            icon:
                'bg-emerald-100 text-emerald-700',

            value:
                'text-emerald-700',
        },

        amber: {
            wrapper:
                'border-amber-100 bg-amber-50/60',

            icon:
                'bg-amber-100 text-amber-700',

            value:
                'text-amber-700',
        },

        red: {
            wrapper:
                'border-red-100 bg-red-50/60',

            icon:
                'bg-red-100 text-red-700',

            value:
                'text-red-700',
        },

        slate: {
            wrapper:
                'border-slate-200 bg-slate-50',

            icon:
                'bg-slate-200 text-slate-700',

            value:
                'text-slate-900',
        },

        purple: {
            wrapper:
                'border-purple-100 bg-purple-50',

            icon:
                'bg-purple-100 text-purple-700',

            value:
                'text-purple-700',
        },
    };

    const style =
        tones[tone];

    const content = (
        <>
            <div
                className={`
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    ${style.icon}
                `}
            >
                <Icon size={19} />
            </div>

            <p
                className="
                    mt-4
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-500
                "
            >
                {label}
            </p>

            <p
                className={`
                    mt-1
                    text-2xl
                    font-black
                    ${style.value}
                `}
            >
                {value}
            </p>
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className={`
                    block
                    rounded-2xl
                    border
                    p-4
                    transition
                    hover:-translate-y-0.5
                    hover:shadow-md
                    ${style.wrapper}
                `}
            >
                {content}
            </Link>
        );
    }

    return (
        <article
            className={`
                rounded-2xl
                border
                p-4
                ${style.wrapper}
            `}
        >
            {content}
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Inventory Alert Row
|--------------------------------------------------------------------------
*/

function InventoryAlertRow({
    alert,
}: {
    alert: InventoryAlert;
}) {
    const outOfStock =
        alert.stock_status ===
        'out_of_stock';

    return (
        <Link
            href={`/staff/inventory?search=${encodeURIComponent(alert.product_code)}`}
            className="block px-5 py-4 transition hover:bg-slate-50"
        >
            <div
                className="
                    flex
                    items-start
                    gap-3
                "
            >
                <div
                    className={`
                        mt-0.5
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl

                        ${
                            outOfStock
                                ? 'bg-red-100 text-red-600'
                                : 'bg-amber-100 text-amber-700'
                        }
                    `}
                >
                    <AlertTriangle
                        size={17}
                    />
                </div>

                <div className="min-w-0">
                    <div
                        className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
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
                                alert.product_name
                            }
                        </p>

                        <span
                            className={`
                                rounded-full
                                px-2.5
                                py-1
                                text-[10px]
                                font-black
                                uppercase
                                tracking-wide

                                ${
                                    outOfStock
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-amber-100 text-amber-700'
                                }
                            `}
                        >
                            {outOfStock
                                ? 'Out of Stock'
                                : 'Low Stock'}
                        </span>
                    </div>

                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-500
                        "
                    >
                        {
                            alert.product_code
                        }

                        {' • '}

                        {
                            alert.variant_name
                        }
                    </p>

                    <p
                        className="
                            mt-2
                            text-xs
                            text-slate-500
                        "
                    >
                        Available:{' '}

                        <strong className="text-slate-700">
                            {
                                alert.available_quantity
                            }
                        </strong>

                        {' • '}

                        Reorder level:{' '}

                        <strong className="text-slate-700">
                            {
                                alert.reorder_level
                            }
                        </strong>
                    </p>
                </div>
            </div>
        </Link>
    );
}

/*
|--------------------------------------------------------------------------
| Recent Order Row
|--------------------------------------------------------------------------
*/

function RecentOrderRow({
    order,
}: {
    order: RecentOrder;
}) {
    const status =
        getOrderDisplayStatus(
            order,
        );

    return (
        <Link
            href={`/admin/orders/${order.id}`}
            className="
                flex
                flex-col
                gap-4
                px-5
                py-5
                transition
                hover:bg-slate-50
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:px-6
            "
        >
            <div className="min-w-0">
                <p
                    className="
                        font-mono
                        text-xs
                        font-black
                        text-blue-600
                    "
                >
                    {
                        order.order_number
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-black
                        text-slate-900
                    "
                >
                    {
                        order.student_name
                    }
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        text-slate-400
                    "
                >
                    {order.created_at
                        ?? 'Date unavailable'}
                </p>
            </div>

            <div
                className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    sm:justify-end
                "
            >
                <span
                    className={`
                        rounded-full
                        px-3
                        py-1
                        text-xs
                        font-bold
                        ${status.className}
                    `}
                >
                    {status.label}
                </span>

                <p
                    className="
                        min-w-24
                        text-right
                        font-black
                        text-slate-900
                    "
                >
                    {formatCurrency(
                        order.total,
                    )}
                </p>

                <ArrowRight
                    size={16}
                    className="text-slate-400"
                />
            </div>
        </Link>
    );
}

/*
|--------------------------------------------------------------------------
| Order Status
|--------------------------------------------------------------------------
*/

function getOrderDisplayStatus(
    order: RecentOrder,
): {
    label: string;
    className: string;
} {
    if (
        order.fulfillment_status ===
        'cancelled'
        ||
        order.payment_status ===
        'cancelled'
    ) {
        return {
            label:
                'Cancelled',

            className:
                'bg-red-100 text-red-700',
        };
    }

    if (
        order.fulfillment_status ===
        'released'
    ) {
        return {
            label:
                'Released',

            className:
                'bg-emerald-100 text-emerald-700',
        };
    }

    if (
        order.fulfillment_status ===
        'ready_for_release'
    ) {
        return {
            label:
                'Ready for Pickup',

            className:
                'bg-blue-100 text-blue-700',
        };
    }

    if (
        order.fulfillment_status ===
        'preparing'
    ) {
        return {
            label:
                'Preparing',

            className:
                'bg-blue-100 text-blue-700',
        };
    }

    if (
        order.payment_status ===
        'paid'
    ) {
        return {
            label:
                'Paid',

            className:
                'bg-blue-100 text-blue-700',
        };
    }

    return {
        label:
            'Pending Payment',

        className:
            'bg-amber-100 text-amber-700',
    };
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