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
} from '@inertiajs/react';

import { QRCodeSVG } from 'qrcode.react';

import {
    useEffect,
    useState,
} from 'react';

import type {
    LucideIcon,
} from 'lucide-react';

import StudentLayout from '@/layouts/StudentLayout';

import ActionNotification from '@/components/action-feedback/ActionNotification';

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

    preorder_status:
        | 'waiting'
        | 'ready'
        | 'paid'
        | 'expired'
        | null;

    preorder_ready_at:
        string | null;

    preorder_notified_at:
        string | null;

    preorder_payment_deadline_at:
        string | null;

    quantity: number;

    unit_price: string;

    line_total: string;

    image_url: string | null;
}

interface StudentOrder {
    id: number;

    order_number: string;

    order_type: string;

    payment_status: string;

    fulfillment_status: string;

    subtotal: string;

    total: string;

    qr_token: string | null;

    release_qr_token: string | null;

    release_qr_used: boolean;

    transaction_number: string | null;

    total_quantity: number;

    created_at: string | null;

    paid_at: string | null;

    ready_for_release_at:
        string | null;

    released_at: string | null;

    cancelled_at: string | null;

    /*
     * Retained because backend still provides it.
     * We don't need to show a large Student
     * Information card to the logged-in student.
     */
    student: OrderStudent;

    items: OrderItem[];
}

interface ShowProps {
    order: StudentOrder;

    flash?: {
        success?: string;
        error?: string;
    };
}

interface OverallStatus {
    label: string;

    description: string;

    badgeClass: string;

    iconClass: string;

    icon: LucideIcon;
}

type ProgressState =
    | 'completed'
    | 'current'
    | 'waiting';

/*
|--------------------------------------------------------------------------
| Show Order
|--------------------------------------------------------------------------
*/

export default function Show({
    order,
    flash,
}: ShowProps) {


            const [
            flashNotification,
            setFlashNotification,
        ] = useState<{
            type: 'success' | 'error';
            message: string;
        } | null>(
            flash?.success
                ? {
                    type: 'success',
                    message: flash.success,
                }
                : flash?.error
                ? {
                        type: 'error',
                        message: flash.error,
                    }
                : null,
        );

        useEffect(() => {
            if (!flashNotification) {
                return;
            }

            const timeout =
                window.setTimeout(
                    () => {
                        setFlashNotification(null);
                    },
                    4000,
                );

            return () => {
                window.clearTimeout(timeout);
            };
        }, [flashNotification]);

            

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

        const hasWaitingPreorder =
            order.items.some(
                (item) =>
                    item.item_type ===
                        'preorder'
                    &&
                    item.preorder_status ===
                        'waiting',
            );

            const readyPreorder =
                order.items.find(
                    (item) =>
                        item.item_type ===
                            'preorder'
                        &&
                        item.preorder_status ===
                            'ready',
                );

            const hasReadyPreorder =
                readyPreorder !== undefined;

        const activeQrToken =
            order.payment_status ===
            'paid'
                ? order.release_qr_token
                : hasWaitingPreorder
                ? null
                : order.qr_token;

    const isReleaseQr =
        order.payment_status ===
        'paid';

    return (
        <StudentLayout>
            <Head
                title={`Order ${order.order_number}`}
            />

            {flashNotification && (
                <ActionNotification
                    type={flashNotification.type}
                    message={flashNotification.message}
                    onClose={() =>
                        setFlashNotification(null)
                    }
                />
            )}

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
                        href="/student/orders"
                        aria-label="Back to my orders"
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
                            Review your
                            merchandise, order
                            progress, and QR
                            verification.
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

                {/* QR + Progress */}
                {!isCancelled && (
                    <section
                        className="
                            grid
                            items-start
                            gap-6
                            lg:grid-cols-[minmax(0,1fr)_360px]
                        "
                    >
                        {/* QR */}
                        <article
                            className="
                                rounded-3xl
                                border
                                border-blue-200
                                bg-blue-50/70
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
                                    <p
                                        className="
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wide
                                            text-blue-600
                                        "
                                    >
                                            {hasWaitingPreorder
                                                ? 'Preorder Status'
                                                : isReleaseQr
                                                ? 'Release QR'
                                                : 'Payment QR'}
                                    </p>

                                    <h2
                                        className="
                                            mt-1
                                            text-xl
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                                    {hasWaitingPreorder
                                                        ? 'Waiting for Stock'
                                                        : isReleaseQr
                                                        ? 'Show QR to PROWARE Specialist'
                                                        : 'Show QR to Cashier'}
                                    </h2>

                                    <p
                                        className="
                                            mt-2
                                            text-sm
                                            leading-6
                                            text-slate-500
                                        "
                                    >
                                        {hasWaitingPreorder
                                            ? 'Your preorder has been submitted successfully. No payment is required yet. You will be notified once stock is available and your preorder becomes ready for payment.'
                                            : isReleaseQr
                                            ? 'Present this Release QR to the PROWARE Specialist for preparation and merchandise claiming.'
                                            : 'Present this Payment QR to the Cashier when confirming your payment.'}
                                    </p>
                                </div>

                                <div
                                    className="
                                        flex
                                        h-12
                                        w-12
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        bg-white
                                        text-blue-600
                                        shadow-sm
                                    "
                                >
                                    <QrCode
                                        size={23}
                                    />
                                </div>
                            </div>

                            {!hasWaitingPreorder && (
                                <div
                                    className="
                                        mt-5
                                        rounded-2xl
                                        bg-white
                                        p-5
                                        text-center
                                    "
                                >
                                {activeQrToken
                                && !order
                                    .release_qr_used
                                && order
                                    .fulfillment_status
                                    !==
                                    'released' ? (
                                    <div
                                        className="
                                            flex
                                            justify-center
                                        "
                                    >
                                        <div
                                            className="
                                                rounded-2xl
                                                bg-white
                                                p-4
                                                shadow-sm
                                            "
                                        >
                                            <QRCodeSVG
                                                value={
                                                    activeQrToken
                                                }
                                                size={
                                                    260
                                                }
                                                level="H"
                                                includeMargin
                                                title={
                                                    isReleaseQr
                                                        ? `Release QR for ${order.order_number}`
                                                        : `Payment QR for ${order.order_number}`
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="
                                            flex
                                            min-h-64
                                            items-center
                                            justify-center
                                            rounded-2xl
                                            bg-slate-50
                                            p-6
                                        "
                                    >
                                        <div className="text-center">
                                            <QrCode
                                                size={
                                                    44
                                                }
                                                className="
                                                    mx-auto
                                                    text-slate-300
                                                "
                                            />

                                            <p
                                                className="
                                                    mt-3
                                                    text-sm
                                                    font-bold
                                                    text-slate-500
                                                "
                                            >
                                                {order
                                                    .fulfillment_status
                                                    ===
                                                'released'
                                                    ? 'This order has already been released.'
                                                    : order
                                                          .release_qr_used
                                                      ? 'This Release QR has already been used.'
                                                      : 'QR code is not available for this order.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div
                                    className="
                                        mx-auto
                                        mt-5
                                        max-w-md
                                        rounded-2xl
                                        bg-slate-50
                                        px-4
                                        py-4
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
                                        Order Number
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            font-mono
                                            text-sm
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        {
                                            order.order_number
                                        }
                                    </p>

                                    <p
                                        className="
                                            mt-3
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

                                <OrderQrMessage
                                    order={order}
                                />
                                </div>
                                )}
                        </article>

                        {/* Order Progress */}
                        <article
                            className="
                                rounded-3xl
                                border
                                border-slate-200
                                bg-white
                                p-6
                                shadow-sm
                            "
                        >
                            <h2
                                className="
                                    text-xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                Order Status
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Follow your order
                                progress.
                            </p>

                            <div
                                className="
                                    mt-6
                                    space-y-4
                                "
                            >
                                <StatusRow
                                    icon={Clock3}
                                    label={
                                        hasWaitingPreorder
                                            ? 'Preorder'
                                            : 'Payment'
                                    }
                                    value={
                                        hasWaitingPreorder
                                            ? 'Waiting for Stock'
                                            : formatStatus(
                                                order.payment_status,
                                            )
                                    }
                                    tone={
                                        hasWaitingPreorder
                                            ? 'yellow'
                                            : order.payment_status === 'paid'
                                            ? 'green'
                                            : order.payment_status === 'cancelled'
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
                                        ===
                                        'released'
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

                            <div
                                className="
                                    mt-6
                                    border-t
                                    border-slate-100
                                    pt-6
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
                                    Order Progress
                                </p>

                                <div className="mt-5">
                                    <ProgressStep
                                        title="Order Created"
                                        description="Your order was successfully submitted."
                                        state="completed"
                                    />

                                    <ProgressStep
                                        title="Payment Confirmation"
                                        description={
                                            order
                                                .payment_status
                                            === 'paid'
                                                ? 'Payment has been confirmed.'
                                                : 'Waiting for cashier confirmation.'
                                        }
                                        state={
                                            order
                                                .payment_status
                                            === 'paid'
                                                ? 'completed'
                                                : 'current'
                                        }
                                    />

                                    <ProgressStep
                                        title="Preparation"
                                        description={
                                            getPreparationDescription(
                                                order,
                                            )
                                        }
                                        state={
                                            getPreparationState(
                                                order,
                                            )
                                        }
                                    />

                                    <ProgressStep
                                        title="Ready for Pickup"
                                        description={
                                            order
                                                .fulfillment_status
                                                ===
                                                'ready_for_release'
                                            ||
                                            order
                                                .fulfillment_status
                                                ===
                                                'released'
                                                ? 'Your merchandise is ready.'
                                                : 'You will be notified when ready.'
                                        }
                                        state={
                                            order
                                                .fulfillment_status
                                                ===
                                                'ready_for_release'
                                            ||
                                            order
                                                .fulfillment_status
                                                ===
                                                'released'
                                                ? 'completed'
                                                : 'waiting'
                                        }
                                    />

                                    <ProgressStep
                                        title="Released"
                                        description={
                                            order
                                                .fulfillment_status
                                            ===
                                            'released'
                                                ? 'Merchandise released successfully.'
                                                : 'Completed after merchandise handover.'
                                        }
                                        state={
                                            order
                                                .fulfillment_status
                                            ===
                                            'released'
                                                ? 'completed'
                                                : 'waiting'
                                        }
                                        last
                                    />
                                </div>
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
                            </div>
                        </div>
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
                |
                | Student Information removed from this student-facing page.
                | The student already has Profile for personal information.
                |
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
                                Order Summary
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Transaction and
                                order information.
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
                                label="Payment Status"
                                value={
                                    formatStatus(
                                        order
                                            .payment_status,
                                    )
                                }
                            />

                            <SummaryRow
                                label="Fulfillment Status"
                                value={
                                    formatStatus(
                                        order
                                            .fulfillment_status,
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
                        href="/student/orders"
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

                        Back to My Orders
                    </Link>

                    <Link
                        href="/student/dashboard#merchandise"
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
                        <ShoppingBag
                            size={18}
                        />

                        Continue Shopping
                    </Link>
                </div>
            </div>
        </StudentLayout>
    );
}

/*
|--------------------------------------------------------------------------
| QR Message
|--------------------------------------------------------------------------
*/

function OrderQrMessage({
    order,
}: {
    order: StudentOrder;
}) {
    if (
        order.payment_status ===
        'pending'
    ) {
        return (
            <div
                className="
                    mx-auto
                    mt-4
                    max-w-md
                    rounded-2xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-3
                    text-left
                "
            >
                <p
                    className="
                        text-sm
                        font-black
                        text-amber-900
                    "
                >
                    Payment Pending
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        leading-5
                        text-amber-700
                    "
                >
                    Payment must still be
                    confirmed before the
                    merchandise can proceed
                    to release.
                </p>
            </div>
        );
    }

    if (
        order.fulfillment_status ===
        'released'
    ) {
        return (
            <div
                className="
                    mx-auto
                    mt-4
                    max-w-md
                    rounded-2xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-4
                    py-3
                    text-left
                "
            >
                <p
                    className="
                        text-sm
                        font-black
                        text-emerald-900
                    "
                >
                    Order Completed
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        leading-5
                        text-emerald-700
                    "
                >
                    Your merchandise has
                    already been released
                    successfully.
                </p>
            </div>
        );
    }

    return (
        <div
            className="
                mx-auto
                mt-4
                max-w-md
                rounded-2xl
                border
                border-blue-200
                bg-blue-50
                px-4
                py-3
                text-left
            "
        >
            <p
                className="
                    text-sm
                    font-black
                    text-blue-900
                "
            >
                Payment Confirmed
            </p>

            <p
                className="
                    mt-1
                    text-xs
                    leading-5
                    text-blue-700
                "
            >
                Your payment is confirmed.
                PROWARE can continue
                processing your order.
            </p>
        </div>
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
| Progress
|--------------------------------------------------------------------------
*/

function ProgressStep({
    title,
    description,
    state,
    last = false,
}: {
    title: string;

    description: string;

    state: ProgressState;

    last?: boolean;
}) {
    const completed =
        state === 'completed';

    const current =
        state === 'current';

    return (
        <div className="flex gap-4">
            <div
                className="
                    flex
                    flex-col
                    items-center
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
                        rounded-full
                        border-2

                        ${
                            completed
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : current
                                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                                  : 'border-slate-200 bg-white text-slate-300'
                        }
                    `}
                >
                    {completed ? (
                        <CheckCircle2
                            size={17}
                        />
                    ) : (
                        <Clock3
                            size={16}
                        />
                    )}
                </div>

                {!last && (
                    <div
                        className={`
                            min-h-12
                            w-0.5
                            flex-1

                            ${
                                completed
                                    ? 'bg-emerald-200'
                                    : 'bg-slate-200'
                            }
                        `}
                    />
                )}
            </div>

            <div
                className={
                    last
                        ? ''
                        : 'pb-5'
                }
            >
                <p
                    className={`
                        text-sm
                        font-black

                        ${
                            completed
                                ? 'text-slate-900'
                                : current
                                  ? 'text-blue-700'
                                  : 'text-slate-400'
                        }
                    `}
                >
                    {title}
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-500
                    "
                >
                    {description}
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
    order: StudentOrder,
): OverallStatus {

        const hasWaitingPreorder =
            order.items.some(
                (item) =>
                    item.item_type === 'preorder'
                    && item.preorder_status === 'waiting',
            );

            const hasReadyPreorder =
    order.items.some(
        (item) =>
            item.item_type === 'preorder'
            && item.preorder_status === 'ready',
    );

        if (hasReadyPreorder) {
            return {
                label: 'Ready for Payment',

                description:
                    'Your preorder merchandise is now available. Complete your payment before the deadline to keep your reserved merchandise.',

                badgeClass:
                    'bg-blue-100 text-blue-700',

                iconClass:
                    'bg-blue-100 text-blue-700',

                icon: QrCode,
            };
        }

        if (hasWaitingPreorder) {
            return {
                label: 'Waiting for Stock',

                description:
                    'Your preorder has been submitted. No payment is required yet. You will be notified when stock becomes available and your preorder is ready for payment.',

                badgeClass:
                    'bg-amber-100 text-amber-700',

                iconClass:
                    'bg-amber-100 text-amber-700',

                icon: Clock3,
            };
        }


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
| Preparation
|--------------------------------------------------------------------------
*/

function getPreparationState(
    order: StudentOrder,
): ProgressState {
    if (
        order.fulfillment_status ===
        'preparing'
    ) {
        return 'current';
    }

    if (
        order.fulfillment_status ===
            'ready_for_release'
        ||
        order.fulfillment_status ===
            'released'
    ) {
        return 'completed';
    }

    if (
        order.payment_status ===
        'paid'
    ) {
        return 'current';
    }

    return 'waiting';
}

function getPreparationDescription(
    order: StudentOrder,
): string {
    if (
        order.fulfillment_status ===
        'released'
    ) {
        return 'PROWARE completed the merchandise preparation process.';
    }

    if (
        order.fulfillment_status ===
        'ready_for_release'
    ) {
        return 'PROWARE finished preparing your merchandise.';
    }

    if (
        order.fulfillment_status ===
        'preparing'
    ) {
        return 'PROWARE is currently preparing your merchandise.';
    }

    if (
        order.payment_status ===
        'paid'
    ) {
        return 'Payment is confirmed. Your order is waiting for PROWARE processing.';
    }

    return 'Preparation begins after payment confirmation.';
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