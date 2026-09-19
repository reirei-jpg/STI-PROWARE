import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronRight,
    Clock3,
    PackageCheck,
    PackageOpen,
    ShoppingBag,
    XCircle,
} from 'lucide-react';


import StudentLayout from '@/layouts/StudentLayout';

interface Preorder {
    id: number;
    order_id: number;
    order_number: string;

    preorder_status:
        | 'waiting'
        | 'ready'
        | 'paid'
        | 'expired'
        | 'cancelled'
        | null;

    quantity: number;
    unit_price: string;

    preorder_ready_at: string | null;
    preorder_payment_deadline_at: string | null;

    product: {
        name: string;
        code: string;
        image_url: string | null;
    };

    variant: {
        sku: string;
        variant_name: string | null;
    };
}

interface Props {
    preorders: Preorder[];
}

function getStatus(
    preorder: Preorder,
) {
    switch (preorder.preorder_status) {
        case 'ready':
            return {
                label: 'Ready for Payment',
                icon: PackageCheck,
                badge:
                    'border-emerald-200 bg-emerald-50 text-emerald-700',
                iconBox:
                    'bg-emerald-100 text-emerald-700',
            };

        case 'paid':
            return {
                label: 'Paid',
                icon: CheckCircle2,
                badge:
                    'border-blue-200 bg-blue-50 text-blue-700',
                iconBox:
                    'bg-blue-100 text-blue-700',
            };

        case 'expired':
            return {
                label: 'Expired',
                icon: XCircle,
                badge:
                    'border-red-200 bg-red-50 text-red-700',
                iconBox:
                    'bg-red-100 text-red-700',
            };

        case 'cancelled':
            return {
                label: 'Cancelled',
                icon: XCircle,
                badge:
                    'border-red-200 bg-red-50 text-red-700',
                iconBox:
                    'bg-red-100 text-red-700',
            };

        default:
            return {
                label: 'Waiting for Stock',
                icon: Clock3,
                badge:
                    'border-amber-200 bg-amber-50 text-amber-700',
                iconBox:
                    'bg-amber-100 text-amber-700',
            };
    }
}

export default function Index({
    preorders,
}: Props) {
    const waitingCount =
        preorders.filter(
            (preorder) =>
                preorder.preorder_status ===
                'waiting',
        ).length;

    const readyCount =
        preorders.filter(
            (preorder) =>
                preorder.preorder_status ===
                'ready',
        ).length;

    const activeCount =
        preorders.filter(
            (preorder) =>
                preorder.preorder_status ===
                    'waiting' ||
                preorder.preorder_status ===
                    'ready',
        ).length;

        return (
        <StudentLayout>
            <Head title="My Preorders" />

            <div className="min-h-screen bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-7">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#0D6EFD]">
                            <ShoppingBag size={17} />

                            <span>
                                STI PROWARE
                            </span>
                        </div>

                        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                            My Preorders
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Track your upcoming
                            merchandise and see when
                            stock becomes available for
                            payment.
                        </p>
                    </div>

                    {/* Summary */}
                    <div className="mb-8 grid gap-4 sm:grid-cols-3">
                        <SummaryCard
                            label="Active Preorders"
                            value={activeCount}
                            icon={ShoppingBag}
                        />

                        <SummaryCard
                            label="Waiting for Stock"
                            value={waitingCount}
                            icon={Clock3}
                        />

                        <SummaryCard
                            label="Ready to Pay"
                            value={readyCount}
                            icon={PackageCheck}
                            highlight={
                                readyCount > 0
                            }
                        />
                    </div>

                    {/* Section Header */}
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">
                                Your Preorders
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Preorder requests and
                                their current status.
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">
                            {preorders.length}{' '}
                            {preorders.length === 1
                                ? 'Preorder'
                                : 'Preorders'}
                        </span>
                    </div>

                    {/* Empty State */}
                    {preorders.length === 0 && (
                        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                                <PackageOpen
                                    size={28}
                                />
                            </div>

                            <h2 className="mt-5 text-lg font-black text-slate-900">
                                No preorders yet
                            </h2>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                Merchandise that you
                                preorder will appear here
                                so you can track its stock
                                and payment status.
                            </p>
                        </div>
                    )}

                    {/* Preorder Cards */}
                    <div className="space-y-4">
                        {preorders.map(
                            (preorder) => {
                                const status =
                                    getStatus(
                                        preorder,
                                    );

                                const StatusIcon =
                                    status.icon;

                                return (
                                    <article
                                        key={
                                            preorder.id
                                        }
                                        className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                                    >
                                        <div className="p-5 sm:p-6">
                                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                                                {/* Product */}
                                                <div className="flex min-w-0 flex-1 gap-4">
                                                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                                        {preorder
                                                            .product
                                                            .image_url ? (
                                                            <img
                                                                src={
                                                                    preorder
                                                                        .product
                                                                        .image_url
                                                                }
                                                                alt={
                                                                    preorder
                                                                        .product
                                                                        .name
                                                                }
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                                <PackageOpen
                                                                    size={
                                                                        30
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={`
                                                                    inline-flex
                                                                    items-center
                                                                    gap-1.5
                                                                    rounded-full
                                                                    border
                                                                    px-2.5
                                                                    py-1
                                                                    text-[11px]
                                                                    font-black
                                                                    uppercase
                                                                    tracking-wide
                                                                    ${status.badge}
                                                                `}
                                                            >
                                                                <StatusIcon
                                                                    size={
                                                                        13
                                                                    }
                                                                />

                                                                {
                                                                    status.label
                                                                }
                                                            </span>

                                                            <span className="text-xs font-bold text-slate-400">
                                                                {
                                                                    preorder.order_number
                                                                }
                                                            </span>
                                                        </div>

                                                        <h3 className="truncate text-lg font-black text-slate-900">
                                                            {
                                                                preorder
                                                                    .product
                                                                    .name
                                                            }
                                                        </h3>

                                                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                                                            <span>
                                                                {
                                                                    preorder
                                                                        .product
                                                                        .code
                                                                }
                                                            </span>

                                                            <span>
                                                                •
                                                            </span>

                                                            <span>
                                                                {preorder
                                                                    .variant
                                                                    .variant_name ||
                                                                    'Standard'}
                                                            </span>

                                                            <span>
                                                                •
                                                            </span>

                                                            <span>
                                                                {
                                                                    preorder
                                                                        .variant
                                                                        .sku
                                                                }
                                                            </span>
                                                        </div>

                                                        <div className="mt-4 flex flex-wrap gap-5 text-sm">
                                                            <div>
                                                                <span className="text-slate-400">
                                                                    Quantity
                                                                </span>

                                                                <p className="font-black text-slate-800">
                                                                    {
                                                                        preorder.quantity
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <span className="text-slate-400">
                                                                    Amount
                                                                </span>

                                                                <p className="font-black text-slate-800">
                                                                    ₱
                                                                    {Number(
                                                                        preorder.unit_price,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Status Information */}
                                                <div className="lg:w-[360px]">
                                                    <div
                                                        className={`
                                                            rounded-2xl
                                                            border
                                                            p-4
                                                            ${status.badge}
                                                        `}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div
                                                                className={`
                                                                    flex
                                                                    h-10
                                                                    w-10
                                                                    shrink-0
                                                                    items-center
                                                                    justify-center
                                                                    rounded-xl
                                                                    ${status.iconBox}
                                                                `}
                                                            >
                                                                <StatusIcon
                                                                    size={
                                                                        20
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <p className="text-sm font-black">
                                                                    {
                                                                        status.label
                                                                    }
                                                                </p>

                                                                {preorder.preorder_status ===
                                                                    'waiting' && (
                                                                    <p className="mt-1 text-xs font-medium leading-5">
                                                                        No
                                                                        payment
                                                                        is
                                                                        required
                                                                        yet.
                                                                        We
                                                                        will
                                                                        notify
                                                                        you
                                                                        when
                                                                        stock
                                                                        becomes
                                                                        available.
                                                                    </p>
                                                                )}

                                                                {preorder.preorder_status ===
                                                                    'ready' && (
                                                                    <>
                                                                        <p className="mt-1 text-xs font-medium leading-5">
                                                                            Your
                                                                            merchandise
                                                                            is
                                                                            now
                                                                            available.
                                                                            You
                                                                            may
                                                                            proceed
                                                                            with
                                                                            payment.
                                                                        </p>

                                                                        {preorder.preorder_payment_deadline_at && (
                                                                            <div className="mt-3 rounded-xl bg-white/70 px-3 py-2">
                                                                                <p className="text-[10px] font-black uppercase tracking-wide opacity-70">
                                                                                    Payment
                                                                                    Deadline
                                                                                </p>

                                                                                <p className="mt-0.5 text-xs font-black">
                                                                                    {
                                                                                        preorder.preorder_payment_deadline_at
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}

                                                                {preorder.preorder_status ===
                                                                    'paid' && (
                                                                    <p className="mt-1 text-xs font-medium leading-5">
                                                                        Payment
                                                                        has
                                                                        been
                                                                        confirmed.
                                                                        Your
                                                                        merchandise
                                                                        will
                                                                        continue
                                                                        to
                                                                        fulfillment.
                                                                    </p>
                                                                )}

                                                                {preorder.preorder_status ===
                                                                    'expired' && (
                                                                    <p className="mt-1 text-xs font-medium leading-5">
                                                                        The
                                                                        payment
                                                                        period
                                                                        for
                                                                        this
                                                                        preorder
                                                                        has
                                                                        expired.
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                            <p className="text-xs font-medium text-slate-500">
                                                {preorder.preorder_status ===
                                                'waiting'
                                                    ? 'We will notify you when your preorder is ready for payment.'
                                                    : preorder.preorder_status ===
                                                        'ready'
                                                      ? 'Complete payment before the deadline to keep your reserved merchandise.'
                                                      : 'View the order for complete transaction details.'}
                                            </p>

                                            <Link
                                                href={`/student/orders/${preorder.order_id}`}
                                                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                                            >
                                                {preorder.preorder_status ===
                                                'ready'
                                                    ? 'Proceed to Payment'
                                                    : 'View Details'}

                                                <ChevronRight
                                                    size={
                                                        16
                                                    }
                                                />
                                            </Link>
                                        </div>
                                    </article>
                                );
                            },
                        )}
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
}

function SummaryCard({
    label,
    value,
    icon: Icon,
    highlight = false,
}: {
    label: string;
    value: number;
    icon: typeof ShoppingBag;
    highlight?: boolean;
}) {
    return (
        <div
            className={`
                rounded-2xl border bg-white p-5 shadow-sm
                ${
                    highlight
                        ? 'border-emerald-200'
                        : 'border-slate-200'
                }
            `}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-900">
                        {value}
                    </p>
                </div>

                <div
                    className={`
                        flex h-11 w-11 items-center justify-center rounded-xl
                        ${
                            highlight
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-blue-50 text-[#0D6EFD]'
                        }
                    `}
                >
                    <Icon size={21} />
                </div>
            </div>
        </div>
    );
}