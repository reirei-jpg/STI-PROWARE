import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    Clock3,
    LoaderCircle,
    PackageCheck,
    ShieldCheck,
    ShoppingBag,
    UserRound,
    X,
} from 'lucide-react';

import { Head, Link, router } from '@inertiajs/react';

import { useRef, useState } from 'react';

import SpecialistLayout from '@/layouts/SpecialistLayout';

import specialist from '@/routes/specialist';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

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
    item_type: 'order' | 'preorder';
    quantity: number;
    unit_price: string;
    line_total: string;
}

interface VerifiedOrder {
    id: number;
    order_number: string;
    order_type: string;
    payment_status: string;
    fulfillment_status: string;
    subtotal: string;
    total: string;
    created_at: string | null;
    student: OrderStudent;
    items: OrderItem[];
}

interface VerifyProps {
    order: VerifiedOrder;
}

export default function Verify({ order }: VerifyProps) {
    const [showReleaseModal, setShowReleaseModal] = useState(false);

    const [showReadyModal, setShowReadyModal] = useState(false);

    const [processing, setProcessing] = useState(false);

    const { notification, showSuccess, showError, clearNotification } =
        useActionFeedback();

    const releaseRequestLocked = useRef(false);

    const isPaid = order.payment_status === 'paid';

    const isReleased = order.fulfillment_status === 'released';

    const isReadyForPickup = order.fulfillment_status === 'ready_for_release';

    const totalQuantity = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
    );

    const releaseMerchandise = () => {
        if (
            !isPaid ||
            isReleased ||
            processing ||
            releaseRequestLocked.current
        ) {
            return;
        }

        /*
    |--------------------------------------------------------------------------
    | Prevent Duplicate Release Requests
    |--------------------------------------------------------------------------
    |
    | useRef changes immediately, unlike React state.
    | This prevents two PATCH requests from being sent
    | if Confirm Release is clicked more than once.
    |
    */

        releaseRequestLocked.current = true;

        setProcessing(true);

        router.patch(
            specialist.orders.release.url(order.id),
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setShowReleaseModal(false);

                    showSuccess(
                        `${order.order_number} has been released successfully.`,
                    );
                },

                onError: () => {
                    /*
                     * Allow retry only when the
                     * original request actually failed.
                     */
                    releaseRequestLocked.current = false;

                    setShowReleaseModal(false);

                    showError(
                        'The merchandise could not be released. Please try again.',
                    );
                },

                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    const markReadyForPickup = (): void => {
        if (!isPaid || isReadyForPickup || isReleased || processing) {
            return;
        }

        setShowReadyModal(true);
    };

    const processMarkReadyForPickup = (): void => {
        if (!isPaid || isReadyForPickup || isReleased || processing) {
            return;
        }

        setProcessing(true);

        router.patch(
            specialist.orders.ready.url(order.id),
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setShowReadyModal(false);

                    showSuccess(
                        `${order.order_number} is now ready for pickup.`,
                    );
                },

                onError: () => {
                    setShowReadyModal(false);

                    showError(
                        'The order could not be marked ready for pickup. Please try again.',
                    );
                },

                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    return (
        <SpecialistLayout>
            <Head title={`Verify ${order.order_number}`} />

            <div className="space-y-7">
                <Link
                    href={specialist.orders.index.url()}
                    className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600"
                >
                    <ArrowLeft size={16} />
                    Back to Order Fulfillment
                </Link>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0D6EFD] text-white">
                                <ShieldCheck size={27} />
                            </div>

                            <div>
                                <p className="text-sm font-bold tracking-wide text-blue-600 uppercase">
                                    QR Order Verification
                                </p>

                                <h1 className="mt-1 text-2xl font-black text-slate-900">
                                    {order.order_number}
                                </h1>

                                <p className="mt-1 text-sm text-slate-500">
                                    {order.created_at ??
                                        'Order date unavailable'}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-5 py-4">
                            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                Order Total
                            </p>

                            <p className="mt-1 text-2xl font-black text-slate-900">
                                {formatCurrency(order.total)}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Fulfillment Status */}
                <section
                    className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
                        isReleased
                            ? 'border-emerald-200 bg-emerald-50'
                            : isReadyForPickup
                              ? 'border-emerald-200 bg-emerald-50'
                              : isPaid
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-amber-200 bg-amber-50'
                    } `}
                >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                    isReleased
                                        ? 'bg-emerald-600 text-white'
                                        : isReadyForPickup
                                          ? 'bg-emerald-600 text-white'
                                          : isPaid
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-amber-100 text-amber-700'
                                } `}
                            >
                                {isReleased ? (
                                    <CheckCircle2 size={22} />
                                ) : isReadyForPickup ? (
                                    <PackageCheck size={22} />
                                ) : isPaid ? (
                                    <PackageCheck size={22} />
                                ) : (
                                    <Clock3 size={22} />
                                )}
                            </div>

                            <div>
                                <p className="text-xs font-black tracking-wide text-slate-500 uppercase">
                                    Fulfillment Status
                                </p>

                                <h2 className="mt-1 text-xl font-black text-slate-900">
                                    {isReleased
                                        ? 'Merchandise Released'
                                        : isReadyForPickup
                                          ? 'Ready for Pickup'
                                          : isPaid
                                            ? 'Payment Confirmed'
                                            : 'Waiting for Payment'}
                                </h2>

                                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                    {isReleased
                                        ? 'This order is complete and the merchandise has already been released.'
                                        : isReadyForPickup
                                          ? 'Merchandise is prepared. Release it only after physically handing the items to the student.'
                                          : isPaid
                                            ? 'Payment is confirmed. Prepare the merchandise and mark it ready for pickup.'
                                            : 'Wait for Cashier payment confirmation before preparing merchandise for release.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                            <span
                                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                                    isPaid
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                } `}
                            >
                                Payment {isPaid ? 'Paid' : 'Pending'}
                            </span>

                            <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-black text-slate-700">
                                {formatStatus(order.fulfillment_status)}
                            </span>
                        </div>
                    </div>
                </section>

                <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_350px]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Order Items
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Verify the merchandise requested by the
                                    student.
                                </p>
                            </div>

                            <ShoppingBag size={22} className="text-blue-600" />
                        </div>

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            {order.items.map((item) => (
                                <OrderItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    </section>

                    <aside className="space-y-5 xl:sticky xl:top-28">
                        {/* Pickup Verification */}
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <UserRound size={19} />
                                </div>

                                <div>
                                    <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                                        Pickup Verification
                                    </p>

                                    <h2 className="mt-0.5 font-black text-slate-900">
                                        Student
                                    </h2>
                                </div>
                            </div>

                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <p className="font-black text-slate-900">
                                    {order.student.name}
                                </p>

                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    {order.student.student_id}
                                </p>

                                <p className="mt-1 text-sm text-slate-500">
                                    {order.student.course ??
                                        'Course not assigned'}

                                    {order.student.year_level
                                        ? ` • Year ${order.student.year_level}`
                                        : ''}
                                </p>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-100 p-3">
                                    <p className="text-xs font-semibold text-slate-400">
                                        Items
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                        {totalQuantity}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 p-3">
                                    <p className="text-xs font-semibold text-slate-400">
                                        Total
                                    </p>

                                    <p className="mt-1 font-black text-slate-900">
                                        {formatCurrency(order.total)}
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Release Action */}
                        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                                Fulfillment Action
                            </p>

                            <div className="mt-4 space-y-3">
                                <InfoRow
                                    label="Order Type"
                                    value={formatStatus(order.order_type)}
                                />

                                <InfoRow
                                    label="Payment"
                                    value={formatStatus(order.payment_status)}
                                />

                                <InfoRow
                                    label="Fulfillment"
                                    value={formatStatus(
                                        order.fulfillment_status,
                                    )}
                                />
                            </div>

                            {!isPaid && !isReleased && (
                                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                    <div className="flex gap-3">
                                        <Banknote
                                            size={20}
                                            className="shrink-0 text-amber-700"
                                        />

                                        <div>
                                            <p className="font-black text-amber-900">
                                                Payment Required
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-amber-800">
                                                Wait for Cashier confirmation
                                                before continuing.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isPaid && !isReadyForPickup && !isReleased && (
                                <button
                                    type="button"
                                    onClick={markReadyForPickup}
                                    disabled={processing}
                                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <PackageCheck size={18} />

                                    {processing
                                        ? 'Updating...'
                                        : 'Mark Ready for Pickup'}
                                </button>
                            )}

                            {isPaid && isReadyForPickup && !isReleased && (
                                <div className="mt-5">
                                    <div className="mb-4 rounded-2xl bg-emerald-50 p-4">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2
                                                size={20}
                                                className="shrink-0 text-emerald-700"
                                            />

                                            <p className="text-sm font-bold text-emerald-800">
                                                Merchandise ready for physical
                                                release.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowReleaseModal(true)
                                        }
                                        disabled={processing}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-4 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <PackageCheck size={18} />
                                        Release Merchandise
                                    </button>

                                    <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                                        Release only after the student has
                                        physically received all items.
                                    </p>
                                </div>
                            )}

                            {isReleased && (
                                <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle2
                                            size={20}
                                            className="text-emerald-700"
                                        />

                                        <p className="text-sm font-black text-emerald-800">
                                            Release Completed
                                        </p>
                                    </div>
                                </div>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
            {showReleaseModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                                <PackageCheck size={23} />
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowReleaseModal(false)}
                                disabled={processing}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <h2 className="mt-5 text-xl font-black text-slate-900">
                            Release merchandise?
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Confirm that the student has received all
                            merchandise for{' '}
                            <strong>{order.order_number}</strong>.
                        </p>

                        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-slate-500">
                                    Student
                                </span>

                                <span className="text-sm font-black text-slate-900">
                                    {order.student.name}
                                </span>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold text-slate-500">
                                    Total Amount
                                </span>

                                <span className="text-lg font-black text-slate-900">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>
                        </div>

                        <p className="mt-4 text-xs leading-5 text-red-600">
                            This action finalizes the physical release. Reserved
                            inventory will be deducted from stock on hand.
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setShowReleaseModal(false)}
                                disabled={processing}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={releaseMerchandise}
                                disabled={processing}
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processing ? (
                                    <LoaderCircle
                                        size={17}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <PackageCheck size={17} />
                                )}

                                <span>
                                    {processing
                                        ? 'Releasing...'
                                        : 'Confirm Release'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ActionConfirmModal
                open={showReadyModal}
                title="Mark Order Ready for Pickup?"
                message={`Confirm that the merchandise for ${order.order_number} has been prepared and is ready for student pickup.`}
                confirmText="Mark Ready"
                processingText="Marking Ready..."
                processing={processing}
                tone="primary"
                onCancel={() => setShowReadyModal(false)}
                onConfirm={processMarkReadyForPickup}
            />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}
        </SpecialistLayout>
    );
}

interface OrderItemCardProps {
    item: OrderItem;
}

function OrderItemCard({ item }: OrderItemCardProps) {
    return (
        <article className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="font-mono text-xs font-bold text-blue-600">
                        {item.product_code}
                    </p>

                    <h3 className="mt-1 font-black text-slate-900">
                        {item.product_name}
                    </h3>
                </div>

                <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.item_type === 'preorder'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                    } `}
                >
                    {item.item_type === 'preorder' ? 'Preorder' : 'Order'}
                </span>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <InfoRow label="Variant" value={item.variant_name} />

                <InfoRow label="SKU" value={item.sku} />

                {item.program && (
                    <InfoRow label="Program" value={item.program} />
                )}

                {item.size && <InfoRow label="Size" value={item.size} />}
            </div>

            <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                <div>
                    <p className="text-xs text-slate-400">Quantity</p>

                    <p className="mt-1 font-black text-slate-900">
                        {item.quantity}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-xs text-slate-400">Line Total</p>

                    <p className="mt-1 font-black text-slate-900">
                        {formatCurrency(item.line_total)}
                    </p>
                </div>
            </div>
        </article>
    );
}

interface InfoRowProps {
    label: string;
    value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
    return (
        <div className="flex items-start justify-between gap-4 py-1.5">
            <span className="text-xs font-semibold text-slate-400">
                {label}
            </span>

            <span className="text-right text-sm font-bold text-slate-700">
                {value}
            </span>
        </div>
    );
}

function formatCurrency(amount: string): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(Number(amount));
}

function formatStatus(status: string): string {
    return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}
