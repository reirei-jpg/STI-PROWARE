import {
    ArrowRight,
    Banknote,
    Clock3,
    QrCode,
    ReceiptText,
} from 'lucide-react';

import {
    Head,
    Link,
} from '@inertiajs/react';

import { useState } from 'react';

import DetailPopup from '@/components/action-feedback/DetailPopup';
import TrendBadge from '@/components/cashier/TrendBadge';

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';

interface TodaySales {
    total: string;
    transactions: number;
    trend: number | null;
}

interface PendingOrder {
    id: number;
    order_number: string;
    student_name: string;
    total: string;
    created_at: string | null;
}

interface ConfirmedOrder {
    id: number;
    order_number: string;
    student_name: string;
    total: string;
    paid_at: string | null;
}

interface CashierDashboardProps {
    pendingPayments: number;
    todaySales: TodaySales;
    pendingOrders: PendingOrder[];
    recentlyConfirmed: ConfirmedOrder[];
}

type ActivePopup =
    | 'pending'
    | 'sales'
    | null;

export default function Dashboard({
    pendingPayments = 0,
    todaySales,
    pendingOrders = [],
    recentlyConfirmed = [],
}: CashierDashboardProps) {
    const [activePopup, setActivePopup] =
        useState<ActivePopup>(null);

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
                            Click a card for more detail.
                        </p>
                    </div>

                    <div
                        className="
                            mt-4
                            grid
                            gap-4
                            sm:grid-cols-2
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
                            onClick={() =>
                                setActivePopup('pending')
                            }
                        />

                        <CashierStatCard
                            title="Today's Sales"
                            value={formatCurrency(
                                todaySales.total,
                            )}
                            description={`${todaySales.transactions} transaction${todaySales.transactions === 1 ? '' : 's'} confirmed today`}
                            icon={ReceiptText}
                            tone="blue"
                            onClick={() =>
                                setActivePopup('sales')
                            }
                        />
                    </div>
                </section>

                {/* RECENTLY CONFIRMED PAYMENTS */}
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
                                Recently Confirmed Payments
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                The last payments you
                                confirmed.
                            </p>
                        </div>

                        <Link
                            href={cashier.payments.index.url()}
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

                    {recentlyConfirmed.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {recentlyConfirmed.map(
                                (order) => (
                                    <ConfirmedOrderRow
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
                            <ReceiptText
                                size={38}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 font-black text-slate-800">
                                No confirmed payments yet
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Payments you confirm will
                                appear here.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            {/* WAITING FOR PAYMENT POPUP */}
            <DetailPopup
                open={activePopup === 'pending'}
                title="Waiting for Payment"
                icon={Clock3}
                onClose={() => setActivePopup(null)}
                actionHref={cashier.orders.index.url()}
                actionLabel="View All Pending"
            >
                {pendingOrders.length > 0 ? (
                    <div className="-mx-2 divide-y divide-slate-100">
                        {pendingOrders.map(
                            (order) => (
                                <PendingOrderRow
                                    key={order.id}
                                    order={order}
                                />
                            ),
                        )}
                    </div>
                ) : (
                    <p className="py-6 text-center text-sm text-slate-500">
                        No pending payments right now.
                    </p>
                )}
            </DetailPopup>

            {/* TODAY'S SALES POPUP */}
            <DetailPopup
                open={activePopup === 'sales'}
                title="Today's Sales"
                icon={ReceiptText}
                onClose={() => setActivePopup(null)}
                actionHref={cashier.sales.index.url()}
                actionLabel="View Full Sales Report"
            >
                <p className="text-3xl font-black text-slate-900">
                    {formatCurrency(todaySales.total)}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    {todaySales.transactions} transaction{todaySales.transactions === 1 ? '' : 's'} confirmed today
                </p>

                <div className="mt-4">
                    <TrendBadge
                        trend={todaySales.trend}
                        compareLabel="yesterday"
                    />
                </div>
            </DetailPopup>
        </CashierLayout>
    );
}

type CashierTone =
    | 'amber'
    | 'blue';

function CashierStatCard({
    title,
    value,
    description,
    icon: Icon,
    tone,
    onClick,
}: {
    title: string;
    value: string;
    description: string;
    icon: typeof Clock3;
    tone: CashierTone;
    onClick: () => void;
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
        <button
            type="button"
            onClick={onClick}
            className={`
                block
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
        </button>
    );
}

function PendingOrderRow({
    order,
}: {
    order: PendingOrder;
}) {
    return (
        <Link
            href={cashier.orders.show.url(order.id)}
            className="
                group
                flex
                items-center
                justify-between
                gap-4
                px-2
                py-4
                transition
                hover:bg-slate-50
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

                <p className="mt-1 truncate font-black text-slate-900">
                    {order.student_name}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {order.created_at
                        ?? 'Order date unavailable'}
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
                <p className="font-black text-slate-900">
                    {formatCurrency(
                        order.total,
                    )}
                </p>

                <ArrowRight
                    size={16}
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

function ConfirmedOrderRow({
    order,
}: {
    order: ConfirmedOrder;
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
                    {order.paid_at
                        ?? 'Payment date unavailable'}
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
                        bg-emerald-100
                        px-3
                        py-1
                        text-xs
                        font-bold
                        text-emerald-700
                    "
                >
                    Confirmed
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
