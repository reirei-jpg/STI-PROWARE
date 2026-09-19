import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    PackageCheck,
    QrCode,
    ShoppingBag,
    XCircle,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
} from '@inertiajs/react';



import type {
    LucideIcon,
} from 'lucide-react';

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';


import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import CancelOrderModal from '@/components/action-feedback/CancelOrderModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

import { useState } from 'react';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface OrderStudent {
    name: string;
    student_id: string;
    course: string | null;
    year_level: string | null;
}

interface OrderItem {
    id: number;

    product_code: string;

    product_name: string;

    variant_name: string;

    sku: string;

    program: string | null;

    size: string | null;

    item_type:
        | 'order'
        | 'preorder';

    quantity: number;

    unit_price: string;

    line_total: string;

    image_url: string | null;
}

interface CashierOrder {
    id: number;

    order_number: string;

    order_type: string;

    payment_status: string;

    fulfillment_status: string;

    subtotal: string;

    total: string;

    payment_qr_verified: boolean;

    payment_method: string | null;

    payment_reference: string | null;

    transaction_number: string | null;

    total_quantity: number;

    created_at: string | null;

    paid_at: string | null;

    ready_for_release_at:
        string | null;

    released_at: string | null;

    cancelled_at: string | null;

    can_cancel: boolean;

    cancel_url: string;

    cancellation: {
        reason: string | null;
        note: string | null;
        cancelled_by: string;
        refunded_at: string | null;
    } | null;

    student: OrderStudent;

    items: OrderItem[];
}

interface ShowProps {
    order: CashierOrder;
}

interface OverallStatus {
    label: string;

    description: string;

    badgeClass: string;

    iconClass: string;

    icon: LucideIcon;
}

/*
|--------------------------------------------------------------------------
| Show Order
|--------------------------------------------------------------------------
*/

export default function Show({
    order,
}: ShowProps) {

    const [
        confirmPaymentOpen,
        setConfirmPaymentOpen,
    ] = useState(false);

    const [cancelOpen, setCancelOpen] = useState(false);

    const {
        processing,
        notification,
        startProcessing,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();

    const status =
        getOverallStatus(
            order,
        );

    const StatusIcon =
        status.icon;

    const isCancelled =
        order.payment_status ===
            'cancelled'
        ||
        order.fulfillment_status ===
            'cancelled';

    const canConfirmPayment =
    order.payment_status === 'pending'
    && order.payment_qr_verified
    && !isCancelled;

    const confirmPayment = (): void => {
        if (!canConfirmPayment || processing) {
            return;
        }

        setConfirmPaymentOpen(true);
    };

    const processPaymentConfirmation = (): void => {
        if (!canConfirmPayment || processing) {
            return;
        }

        startProcessing();

        router.patch(
            cashier.orders.payment.confirm.url(order.id),
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setConfirmPaymentOpen(false);

                    showSuccess(
                        `Payment for ${order.order_number} was confirmed successfully.`,
                    );
                },

                onError: () => {
                    setConfirmPaymentOpen(false);

                    showError(
                        'Payment could not be confirmed. Please try again.',
                    );
                },
            },
        );
    };

    
    return (
        <CashierLayout>
            <Head
                title={`Order ${order.order_number}`}
            />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/* Header */}
                <div
                    className="
                        flex
                        items-center
                        gap-4
                    "
                >
                        <Link
                            href={cashier.orders.index.url()}
                            aria-label="Back to pending orders"
                        className="
                            flex
                            h-12
                            w-12
                            shrink-0
                            items-center
                            justify-center
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            text-slate-600
                            shadow-sm
                            transition
                            hover:border-blue-300
                            hover:bg-blue-50
                            hover:text-blue-700
                        "
                    >
                        <ArrowLeft
                            size={21}
                        />
                    </Link>

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
                            Order Details
                        </h1>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Review payment verification,
                            transaction details, and
                            order status.
                        </p>
                    </div>
                </div>

                {/* Main Summary */}
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
                            p-6
                            sm:p-7
                        "
                    >
                        <div
                            className="
                                flex
                                flex-col
                                gap-5
                                lg:flex-row
                                lg:items-center
                                lg:justify-between
                            "
                        >
                            <div
                                className="
                                    flex
                                    items-start
                                    gap-4
                                "
                            >
                                <div
                                    className={`
                                        flex
                                        h-14
                                        w-14
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        ${status.iconClass}
                                    `}
                                >
                                    <StatusIcon
                                        size={27}
                                    />
                                </div>

                                <div>
                                    <span
                                        className={`
                                            inline-flex
                                            rounded-full
                                            px-3
                                            py-1
                                            text-xs
                                            font-bold
                                            ${status.badgeClass}
                                        `}
                                    >
                                        {
                                            status.label
                                        }
                                    </span>

                                    <h2
                                        className="
                                            mt-3
                                            text-2xl
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        {
                                            order.order_number
                                        }
                                    </h2>

                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            text-slate-500
                                        "
                                    >
                                        {order
                                            .created_at
                                            ??
                                            'Order date unavailable'}
                                    </p>

                                    <p
                                        className="
                                            mt-3
                                            max-w-2xl
                                            text-sm
                                            leading-6
                                            text-slate-600
                                        "
                                    >
                                        {
                                            status.description
                                        }
                                    </p>
                                </div>
                            </div>

                            <div
                                className="
                                    rounded-2xl
                                    bg-slate-50
                                    px-5
                                    py-4
                                    lg:text-right
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
                                    Total Amount
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-2xl
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
                </section>

{/* Payment + Order Status */}
{!isCancelled && (
    <section
        className="
            grid
            grid-cols-1
            items-start
            gap-6
            xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]
        "
    >
        {/* Payment Verification */}
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
                    border-b
                    border-slate-100
                    p-5
                    sm:p-6
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
                                text-xs
                                font-black
                                uppercase
                                tracking-wide
                                text-blue-600
                            "
                        >
                            Payment Verification
                        </p>

                        <h2
                            className="
                                mt-1
                                text-xl
                                font-black
                                text-slate-900
                            "
                        >
                            {order.payment_status ===
                            'paid'
                                ? 'Payment Confirmed'
                                : 'Verify Student Payment'}
                        </h2>

                        <p
                            className="
                                mt-2
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            {order.payment_status ===
                            'paid'
                                ? 'Payment was successfully confirmed for this order.'
                                : 'Scan the student Payment QR before confirming payment.'}
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
                        <QrCode size={21} />
                    </div>
                </div>
            </div>

            <div className="p-5 sm:p-6">
                <div
                    className="
                        grid
                        gap-5
                        sm:grid-cols-[140px_minmax(0,1fr)]
                    "
                >
                    {/* QR visual */}
                    <div
                        className="
                            flex
                            min-h-36
                            items-center
                            justify-center
                            rounded-2xl
                            border
                            border-blue-100
                            bg-blue-50/60
                        "
                    >
                        <QrCode
                            size={58}
                            className={
                                order.payment_qr_verified
                                    ? 'text-emerald-600'
                                    : 'text-blue-600'
                            }
                        />
                    </div>

                    {/* Verification information */}
                    <div
                        className="
                            rounded-2xl
                            border
                            border-slate-100
                            bg-slate-50/70
                            p-5
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
                            QR Verification
                        </p>

                        <div
                            className="
                                mt-3
                                flex
                                items-start
                                gap-3
                            "
                        >
                            {order.payment_qr_verified ? (
                                <CheckCircle2
                                    size={22}
                                    className="
                                        mt-0.5
                                        shrink-0
                                        text-emerald-600
                                    "
                                />
                            ) : (
                                <Clock3
                                    size={22}
                                    className="
                                        mt-0.5
                                        shrink-0
                                        text-amber-600
                                    "
                                />
                            )}

                            <div>
                                <p
                                    className={
                                        order.payment_qr_verified
                                            ? 'font-black text-emerald-700'
                                            : 'font-black text-amber-700'
                                    }
                                >
                                    {order.payment_qr_verified
                                        ? 'Payment QR Verified'
                                        : 'Waiting for QR Scan'}
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        leading-5
                                        text-slate-500
                                    "
                                >
                                    {order.payment_qr_verified
                                        ? 'The student Payment QR was successfully scanned.'
                                        : 'Scan the student Payment QR to verify this order.'}
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                mt-5
                                space-y-3
                                border-t
                                border-slate-200
                                pt-4
                            "
                        >
                            <DetailRow
                                label="Payment Method"
                                value={
                                    order.payment_method
                                        ? formatStatus(
                                              order.payment_method,
                                          )
                                        : 'Not provided'
                                }
                            />

                            {order.payment_reference && (
                                <DetailRow
                                    label="Payment Reference"
                                    value={
                                        order.payment_reference
                                    }
                                />
                            )}

                            {order.transaction_number && (
                                <DetailRow
                                    label="Transaction No."
                                    value={
                                        order.transaction_number
                                    }
                                />
                            )}

                            {order.paid_at && (
                                <DetailRow
                                    label="Paid At"
                                    value={order.paid_at}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment action */}
                {order.payment_status ===
                    'pending' && (
                    <div className="mt-5">
                        {order.payment_qr_verified ? (
                            <button
                                type="button"
                                onClick={
                                    confirmPayment
                                }
                                disabled={
                                    !canConfirmPayment
                                }
                                className="
                                    inline-flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-[#0D6EFD]
                                    px-5
                                    py-4
                                    text-sm
                                    font-bold
                                    text-white
                                    transition
                                    hover:bg-blue-700
                                    disabled:cursor-not-allowed
                                    disabled:bg-slate-300
                                    disabled:text-slate-500
                                "
                            >
                                <CheckCircle2
                                    size={18}
                                />

                                Confirm Payment
                            </button>
                        ) : (
                            <Link
                                href="/orders/scanner"
                                className="
                                    inline-flex
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-[#0D6EFD]
                                    px-5
                                    py-4
                                    text-sm
                                    font-bold
                                    text-white
                                    transition
                                    hover:bg-blue-700
                                "
                            >
                                <QrCode size={18} />

                                Scan Payment QR
                            </Link>
                        )}
                    </div>
                )}

                {order.payment_status ===
                    'paid' && (
                    <Link
                        href={cashier.orders.receipt.url(order.id)}
                        className="
                            mt-5
                            inline-flex
                            w-full
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-emerald-200
                            bg-emerald-50
                            px-5
                            py-4
                            text-sm
                            font-bold
                            text-emerald-700
                            transition
                            hover:bg-emerald-100
                        "
                    >
                        <CheckCircle2 size={18} />

                        View Payment Receipt
                    </Link>
                )}
            </div>
        </article>

        {/* Compact Order Status */}
        <article
            className="
                rounded-3xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
                sm:p-6
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
                    Order Status
                </p>

                <h2
                    className="
                        mt-1
                        text-xl
                        font-black
                        text-slate-900
                    "
                >
                    Current Status
                </h2>
            </div>

            <div
                className="
                    mt-6
                    space-y-5
                "
            >
                <StatusRow
                    icon={Clock3}
                    label="Payment"
                    value={formatStatus(
                        order.payment_status,
                    )}
                    tone={
                        order.payment_status ===
                        'paid'
                            ? 'green'
                            : 'yellow'
                    }
                />

                <div
                    className="
                        border-t
                        border-slate-100
                        pt-5
                    "
                >
                    <StatusRow
                        icon={PackageCheck}
                        label="Fulfillment"
                        value={formatStatus(
                            order.fulfillment_status,
                        )}
                        tone={
                            order.fulfillment_status ===
                            'released'
                                ? 'green'
                                : order.fulfillment_status ===
                                    'cancelled'
                                  ? 'red'
                                  : 'blue'
                        }
                    />
                </div>
            </div>

            <div
                className="
                    mt-6
                    rounded-2xl
                    bg-slate-50
                    p-4
                "
            >
                <p
                    className="
                        text-sm
                        leading-6
                        text-slate-600
                    "
                >
                    {order.payment_status ===
                    'paid'
                        ? order.fulfillment_status ===
                          'released'
                            ? 'Payment is complete and the merchandise has been released.'
                            : 'Payment is complete. The order can now proceed to fulfillment.'
                        : order.payment_qr_verified
                          ? 'Payment QR verified. Confirm payment to continue.'
                          : 'Waiting for the student Payment QR to be scanned.'}
                </p>
            </div>
        </article>
    </section>
)}

                {/* Cancelled */}
                {isCancelled && (
                    <section
                        className="
                            rounded-3xl
                            border
                            border-red-200
                            bg-red-50
                            p-6
                        "
                    >
                        <div
                            className="
                                flex
                                items-start
                                gap-4
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-12
                                    w-12
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-red-100
                                    text-red-700
                                "
                            >
                                <XCircle
                                    size={22}
                                />
                            </div>

                            <div>
                                <h2
                                    className="
                                        font-black
                                        text-red-900
                                    "
                                >
                                    Order Cancelled
                                </h2>

                                <p
                                    className="
                                        mt-2
                                        text-sm
                                        leading-6
                                        text-red-700
                                    "
                                >
                                    This order is no
                                    longer active and
                                    cannot continue to
                                    payment or release.
                                </p>

                                {order.cancellation && (
                                    <dl className="mt-3 space-y-1 text-sm text-red-800">
                                        <div>
                                            <dt className="inline font-bold">
                                                Cancelled by:{' '}
                                            </dt>
                                            <dd className="inline">
                                                {order.cancellation.cancelled_by}
                                            </dd>
                                        </div>

                                        {order.cancellation.reason && (
                                            <div>
                                                <dt className="inline font-bold">
                                                    Reason:{' '}
                                                </dt>
                                                <dd className="inline">
                                                    {order.cancellation.reason}
                                                </dd>
                                            </div>
                                        )}

                                        {order.cancellation.note && (
                                            <div>
                                                <dt className="inline font-bold">
                                                    Note:{' '}
                                                </dt>
                                                <dd className="inline">
                                                    {order.cancellation.note}
                                                </dd>
                                            </div>
                                        )}

                                        {order.cancellation.refunded_at && (
                                            <div>
                                                <dt className="inline font-bold">
                                                    Refund recorded:{' '}
                                                </dt>
                                                <dd className="inline">
                                                    {order.cancellation.refunded_at}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* Cancel Order */}
                {order.can_cancel && (
                    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="font-black text-slate-900">
                                Cancel this order
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Use this when the order will not go ahead. Reserved stock goes
                                back on the shelf and the student is notified.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setCancelOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
                        >
                            <XCircle size={17} />
                            Cancel Order
                        </button>
                    </section>
                )}

                {/* Ordered Items */}
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
                            items-start
                            justify-between
                            gap-4
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
                                Ordered Items
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Every merchandise
                                item included in this
                                order.
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
                                size={20}
                            />
                        </div>
                    </div>

                    <div
                        className="
                            mt-6
                            grid
                            gap-5
                            md:grid-cols-2
                            xl:grid-cols-3
                        "
                    >
                        {order.items.map(
                            (item) => (
                                <OrderItemCard
                                    key={
                                        item.id
                                    }
                                    item={
                                        item
                                    }
                                />
                            ),
                        )}
                    </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Order Summary
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
                            gap-5
                            lg:flex-row
                            lg:items-start
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
                                Order Information
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Supporting details for
                                    this transaction.
                            </p>
                        </div>

                        {order
                            .transaction_number && (
                            <div
                                className="
                                    rounded-2xl
                                    bg-blue-50
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
                                        text-blue-500
                                    "
                                >
                                    Transaction No.
                                </p>

                                <p
                                    className="
                                        mt-1
                                        font-mono
                                        text-sm
                                        font-black
                                        text-blue-800
                                    "
                                >
                                    {
                                        order.transaction_number
                                    }
                                </p>
                            </div>
                        )}
                    </div>

                    <div
                        className="
                            mt-6
                            grid
                            gap-x-10
                            lg:grid-cols-2
                        "
                    >
                        <div>
                            <SummaryRow
                                label="Order Type"
                                value={
                                    formatStatus(
                                        order
                                            .order_type,
                                    )
                                }
                            />

                            

                            <SummaryRow
                                label="Total Quantity"
                                value={String(
                                    order
                                        .total_quantity,
                                )}
                            />
                        </div>

                        <div>
                            <SummaryRow
                                label="Order Date"
                                value={
                                    order
                                        .created_at
                                    ??
                                    'Unavailable'
                                }
                            />

                            {order.paid_at && (
                                <SummaryRow
                                    label="Paid"
                                    value={
                                        order.paid_at
                                    }
                                />
                            )}

                            {order
                                .ready_for_release_at && (
                                <SummaryRow
                                    label="Ready for Pickup"
                                    value={
                                        order
                                            .ready_for_release_at
                                    }
                                />
                            )}

                            {order
                                .released_at && (
                                <SummaryRow
                                    label="Released"
                                    value={
                                        order
                                            .released_at
                                    }
                                />
                            )}

                            {order
                                .cancelled_at && (
                                <SummaryRow
                                    label="Cancelled"
                                    value={
                                        order
                                            .cancelled_at
                                    }
                                />
                            )}
                        </div>
                    </div>

                    <div
                        className="
                            mt-6
                            border-t
                            border-slate-100
                            pt-5
                        "
                    >
                        <SummaryRow
                            label="Subtotal"
                            value={
                                formatCurrency(
                                    order.subtotal,
                                )
                            }
                        />

                        <SummaryRow
                            label="Total"
                            value={
                                formatCurrency(
                                    order.total,
                                )
                            }
                            emphasized
                        />
                    </div>
                </section>

                {/* Actions */}
                <div
                    className="
                        flex
                        flex-col
                        gap-3
                        sm:flex-row
                    "
                >
                    <Link
                        href={cashier.orders.index.url()}
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-5
                            py-4
                            text-sm
                            font-bold
                            text-slate-700
                            transition
                            hover:border-blue-300
                            hover:bg-blue-50
                            hover:text-blue-700
                        "
                    >
                        <ArrowLeft
                            size={18}
                        />

                        Back to Pending Orders
                    </Link>

                    <Link
                        href="/orders/scanner"
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-[#0D6EFD]
                            px-5
                            py-4
                            text-sm
                            font-bold
                            text-white
                            transition
                            hover:bg-blue-700
                        "
                    >
                        <QrCode size={18} />

                        Open QR Scanner
                    </Link>
                </div>
            </div>

            <ActionConfirmModal
                open={confirmPaymentOpen}
                title="Confirm Student Payment?"
                message={`Confirm payment for ${order.order_number}? Make sure the payment details have been verified before continuing.`}
                confirmText="Confirm Payment"
                processingText="Confirming Payment..."
                processing={processing}
                tone="primary"
                onCancel={() =>
                    setConfirmPaymentOpen(false)
                }
                onConfirm={
                    processPaymentConfirmation
                }
            />

            <CancelOrderModal
                open={cancelOpen}
                mode="staff"
                orderNumber={order.order_number}
                actionUrl={order.cancel_url}
                isPaid={order.payment_status === 'paid'}
                onClose={() => setCancelOpen(false)}
                onCancelled={() =>
                    showSuccess(
                        `Order ${order.order_number} was cancelled.`,
                    )
                }
            />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

        </CashierLayout>
    );
}



/*
|--------------------------------------------------------------------------
| Order Item
|--------------------------------------------------------------------------
*/

function OrderItemCard({
    item,
}: {
    item: OrderItem;
}) {
    return (
        <article
            className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
            "
        >
            {/* Image */}
            <div
                className="
                    relative
                    h-56
                    overflow-hidden
                    border-b
                    border-slate-100
                    bg-slate-100
                "
            >
                {item.image_url ? (
                    <img
                        src={
                            item.image_url
                        }
                        alt={
                            item.product_name
                        }
                        loading="lazy"
                        className="
                            h-full
                            w-full
                            object-cover
                        "
                    />
                ) : (
                    <div
                        className="
                            flex
                            h-full
                            w-full
                            items-center
                            justify-center
                            text-slate-300
                        "
                    >
                        <ShoppingBag
                            size={48}
                        />
                    </div>
                )}

                <span
                    className={`
                        absolute
                        right-4
                        top-4
                        rounded-full
                        px-3
                        py-1.5
                        text-xs
                        font-black
                        shadow-sm

                        ${
                            item.item_type ===
                            'preorder'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                        }
                    `}
                >
                    {item.item_type ===
                    'preorder'
                        ? 'Preorder'
                        : 'Order'}
                </span>
            </div>

            <div className="p-5">
                <p
                    className="
                        font-mono
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-blue-600
                    "
                >
                    {
                        item.product_code
                    }
                </p>

                <h3
                    className="
                        mt-2
                        text-lg
                        font-black
                        text-slate-900
                    "
                >
                    {
                        item.product_name
                    }
                </h3>

                <p
                    className="
                        mt-2
                        text-sm
                        font-semibold
                        text-slate-500
                    "
                >
                    {
                        item.variant_name
                    }
                </p>

                <div
                    className="
                        mt-5
                        space-y-3
                        rounded-2xl
                        bg-slate-50
                        p-4
                    "
                >
                    <DetailRow
                        label="Variant"
                        value={
                            item.variant_name
                        }
                    />

                    <DetailRow
                        label="SKU"
                        value={
                            item.sku
                        }
                    />

                    {item.program && (
                        <DetailRow
                            label="Program"
                            value={
                                item.program
                            }
                        />
                    )}

                    {item.size && (
                        <DetailRow
                            label="Size"
                            value={
                                item.size
                            }
                        />
                    )}
                </div>

                <div
                    className="
                        mt-5
                        grid
                        grid-cols-3
                        gap-3
                        border-t
                        border-slate-100
                        pt-4
                    "
                >
                    <div>
                        <p className="text-xs text-slate-400">
                            Qty
                        </p>

                        <p
                            className="
                                mt-1
                                text-lg
                                font-black
                                text-slate-800
                            "
                        >
                            {
                                item.quantity
                            }
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-400">
                            Unit
                        </p>

                        <p
                            className="
                                mt-1
                                text-sm
                                font-bold
                                text-slate-700
                            "
                        >
                            {formatCurrency(
                                item.unit_price,
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
                                font-black
                                text-slate-900
                            "
                        >
                            {formatCurrency(
                                item.line_total,
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Detail Row
|--------------------------------------------------------------------------
*/

function DetailRow({
    label,
    value,
}: {
    label: string;

    value: string;
}) {
    return (
        <div
            className="
                flex
                items-start
                justify-between
                gap-4
            "
        >
            <span
                className="
                    text-xs
                    font-semibold
                    text-slate-400
                "
            >
                {label}
            </span>

            <span
                className="
                    text-right
                    text-sm
                    font-bold
                    text-slate-700
                "
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
            "
        >
            <div
                className={`
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${toneClasses[tone]}
                `}
            >
                <Icon size={18} />
            </div>

            <div>
                <p
                    className="
                        text-xs
                        font-semibold
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
| Summary
|--------------------------------------------------------------------------
*/

function SummaryRow({
    label,
    value,
    emphasized = false,
}: {
    label: string;

    value: string;

    emphasized?: boolean;
}) {
    return (
        <div
            className="
                mt-3
                flex
                items-center
                justify-between
                gap-4
            "
        >
            <span
                className={
                    emphasized
                        ? 'font-bold text-slate-800'
                        : 'text-sm text-slate-500'
                }
            >
                {label}
            </span>

            <span
                className={
                    emphasized
                        ? 'text-xl font-black text-slate-900'
                        : 'text-right text-sm font-bold text-slate-800'
                }
            >
                {value}
            </span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Overall Status
|--------------------------------------------------------------------------
*/

function getOverallStatus(
    order: CashierOrder,
): OverallStatus {
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

            iconClass:
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
                'Your merchandise has been successfully released and this order is complete.',

            badgeClass:
                'bg-emerald-100 text-emerald-700',

            iconClass:
                'bg-emerald-600 text-white',

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

            iconClass:
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

            iconClass:
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
                'The cashier confirmed payment. Your order may now proceed to fulfillment.',

            badgeClass:
                'bg-blue-100 text-blue-700',

            iconClass:
                'bg-blue-100 text-blue-700',

            icon:
                CheckCircle2,
        };
    }

    return {
        label:
            'Pending Payment',

        description:
            'Your order was created and the merchandise is reserved. Payment must be confirmed before release.',

        badgeClass:
            'bg-amber-100 text-amber-700',

        iconClass:
            'bg-amber-100 text-amber-700',

        icon:
            Clock3,
    };
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
            style:
                'currency',

            currency:
                'PHP',
        },
    ).format(
        Number(amount),
    );
}

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
            (character) =>
                character
                    .toUpperCase(),
        );
}