import {
    ArrowRight,
    Banknote,
    CheckCircle2,
    Clock3,
    QrCode,
    ReceiptText,
} from 'lucide-react';

import {
    Head,
    Link,
} from '@inertiajs/react';

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';

interface CashierDashboardProps {
    pendingPayments: number;
    paidToday: number;
    totalCollectedToday: string;
    recentOrders: RecentOrder[];
}

interface RecentOrder {
    id: number;
    order_number: string;
    student_name: string;
    total: string;
    payment_status: string;
    created_at: string | null;
}

export default function Dashboard({
    pendingPayments = 0,
    paidToday = 0,
    totalCollectedToday = '0.00',
    recentOrders = [],
}: CashierDashboardProps) {
    /*
     * The cashier dashboard should primarily
     * show orders that still need payment work.
     */
    const pendingOrders =
        recentOrders.filter(
            (order) =>
                order.payment_status !==
                'paid',
        );

    return (
        <CashierLayout>
            <Head title="Cashier Dashboard" />

            <div className="mx-auto max-w-7xl space-y-6">
                {/* PRIMARY CASHIER ACTION */}
                <section
                    className="
                        relative
                        overflow-hidden
                        rounded-3xl
                        bg-gradient-to-r
                        from-[#0D6EFD]
                        via-blue-600
                        to-blue-700
                        p-6
                        text-white
                        shadow-sm
                        sm:p-8
                    "
                >
                    <div
                        className="
                            relative
                            z-10
                            grid
                            gap-7
                            lg:grid-cols-[1fr_auto]
                            lg:items-center
                        "
                    >
                        <div className="max-w-2xl">
                            <div
                                className="
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-white/15
                                "
                            >
                                <QrCode size={28} />
                            </div>

                            <p
                                className="
                                    mt-5
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-blue-100
                                "
                            >
                                Primary Cashier Action
                            </p>

                            <h1
                                className="
                                    mt-2
                                    text-3xl
                                    font-black
                                    sm:text-4xl
                                "
                            >
                                Scan Student Order QR
                            </h1>

                            <p
                                className="
                                    mt-3
                                    max-w-xl
                                    text-sm
                                    leading-6
                                    text-blue-100
                                "
                            >
                                Scan the QR presented
                                by the student to open
                                the exact order, verify
                                the amount, and confirm
                                payment.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                flex-col
                                gap-3
                                sm:flex-row
                                lg:flex-col
                            "
                        >
                            <Link
                                href="/orders/scanner"
                                className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-yellow-400
                                    px-5
                                    py-3
                                    text-sm
                                    font-black
                                    text-blue-900
                                    transition
                                    hover:bg-yellow-300
                                "
                            >
                                <QrCode size={18} />

                                Scan Order QR
                            </Link>

                            <Link
                                href={cashier.orders.index.url()}
                                className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-white/25
                                    bg-white/10
                                    px-5
                                    py-3
                                    text-sm
                                    font-bold
                                    text-white
                                    transition
                                    hover:bg-white/20
                                "
                            >
                                <Banknote size={18} />

                                Pending Payments
                            </Link>
                        </div>
                    </div>

                    <QrCode
                        size={190}
                        strokeWidth={1}
                        className="
                            absolute
                            -bottom-8
                            right-10
                            hidden
                            text-white/10
                            xl:block
                        "
                    />
                </section>

                {/* TODAY'S CASHIER SUMMARY */}
                <section>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            Today&apos;s Payment Activity
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Only the information needed
                            for cashier operations.
                        </p>
                    </div>

                    <div
                        className="
                            mt-4
                            grid
                            gap-4
                            sm:grid-cols-3
                        "
                    >
                        <CashierStatCard
                            title="Waiting for Payment"
                            value={String(
                                pendingPayments,
                            )}
                            description="Orders still requiring cashier confirmation"
                            icon={Clock3}
                            tone="amber"
                        />

                        <CashierStatCard
                            title="Paid Today"
                            value={String(
                                paidToday,
                            )}
                            description="Payments confirmed during today's shift"
                            icon={
                                CheckCircle2
                            }
                            tone="green"
                        />

                        <CashierStatCard
                            title="Collected Today"
                            value={formatCurrency(
                                totalCollectedToday,
                            )}
                            description="Total value of payments confirmed today"
                            icon={ReceiptText}
                            tone="blue"
                        />
                    </div>
                </section>

                {/* WHAT NEEDS ATTENTION */}
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
                            <h2 className="text-lg font-black text-slate-900">
                                Waiting for Payment
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Student orders that may
                                require cashier action.
                            </p>
                        </div>

                        <Link
                            href={cashier.orders.index.url()}
                            className="
                                hidden
                                items-center
                                gap-1
                                text-sm
                                font-bold
                                text-blue-600
                                hover:text-blue-800
                                sm:flex
                            "
                        >
                            View all

                            <ArrowRight
                                size={16}
                            />
                        </Link>
                    </div>

                    {pendingOrders.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {pendingOrders
                                .slice(0, 5)
                                .map(
                                    (
                                        order,
                                    ) => (
                                        <CashierOrderRow
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
                        <div className="px-6 py-14 text-center">
                            <CheckCircle2
                                size={38}
                                className="mx-auto text-emerald-400"
                            />

                            <h3 className="mt-4 font-black text-slate-800">
                                No pending payments
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                There are currently no
                                student orders waiting
                                for cashier confirmation.
                            </p>
                        </div>
                    )}
                </section>

                <Link
                    href={cashier.orders.index.url()}
                    className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-slate-700
                        sm:hidden
                    "
                >
                    View Pending Payments

                    <ArrowRight size={16} />
                </Link>
            </div>
        </CashierLayout>
    );
}

type CashierTone =
    | 'amber'
    | 'green'
    | 'blue';

function CashierStatCard({
    title,
    value,
    description,
    icon: Icon,
    tone,
}: {
    title: string;
    value: string;
    description: string;
    icon: typeof Clock3;
    tone: CashierTone;
}) {
    const tones = {
        amber: {
            card:
                'border-amber-200 bg-amber-50/60',

            icon:
                'bg-amber-100 text-amber-700',

            value:
                'text-amber-700',
        },

        green: {
            card:
                'border-emerald-200 bg-emerald-50/60',

            icon:
                'bg-emerald-100 text-emerald-700',

            value:
                'text-emerald-700',
        },

        blue: {
            card:
                'border-blue-200 bg-blue-50/60',

            icon:
                'bg-blue-100 text-blue-700',

            value:
                'text-blue-700',
        },
    };

    const style =
        tones[tone];

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

function CashierOrderRow({
    order,
}: {
    order: RecentOrder;
}) {
    return (
        <Link
            href={cashier.orders.show.url(order.id)}
            className="
                group
                flex
                flex-col
                gap-3
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
                        uppercase
                        tracking-wide
                        text-blue-600
                    "
                >
                    {order.order_number}
                </p>

                <p className="mt-1 font-black text-slate-900">
                    {order.student_name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {order.created_at
                        ?? 'Order date unavailable'}
                </p>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-right">
                    <p className="text-xs text-slate-400">
                        Amount
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                        {formatCurrency(
                            order.total,
                        )}
                    </p>
                </div>

                <span
                    className="
                        rounded-full
                        bg-amber-100
                        px-3
                        py-1
                        text-xs
                        font-bold
                        text-amber-700
                    "
                >
                    Pending
                </span>

                <ArrowRight
                    size={17}
                    className="
                        text-slate-300
                        transition
                        group-hover:translate-x-1
                        group-hover:text-blue-600
                    "
                />
            </div>
        </Link>
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