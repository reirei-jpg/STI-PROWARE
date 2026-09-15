import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    PackageOpen,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    WalletCards,
} from 'lucide-react';

import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';

import { useState } from 'react';

import StudentLayout from '@/layouts/StudentLayout';

import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';

interface CheckoutStudent {
    name: string;
    email: string;
    student_id: string;
    course: string | null;
    year_level: string | null;
}

interface CheckoutCategory {
    id: number;
    name: string;
}

interface CheckoutProduct {
    id: number;
    code: string;
    name: string;
    preorder_early_bird_slots: number | null;
    preorder_early_bird_discount_percent: string | null;
    image_url: string | null;
    category: CheckoutCategory;
}

interface CheckoutVariant {
    id: number;
    sku: string;
    program: string | null;
    size: string | null;
    variant_name: string;
}

interface CheckoutItem {
    id: number;
    item_type: 'order' | 'preorder';
    quantity: number;
    unit_price: string;
    line_total: string;
    variant: CheckoutVariant;
    product: CheckoutProduct;
}

interface CheckoutCart {
    id: number;
    total_quantity: number;
    subtotal: string;
    items: CheckoutItem[];
}

interface CheckoutIndexProps {
    student: CheckoutStudent;
    cart: CheckoutCart;
}

export default function Index({
    student,
    cart,
}: CheckoutIndexProps) {


    const {
    notification,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

const [
    confirmOrderOpen,
    setConfirmOrderOpen,
] = useState(false);
    
    
    interface CheckoutFormData {
        confirmed: boolean;
        payment_method:
            | 'cash'
            | 'gcash'
            | 'maya';
        payment_reference: string;
        item_ids: number[];
        checkout: string;
        cart: string;
    }

const isPreorderOnly =
    cart.items.length > 0
    && cart.items.every(
        (item) =>
            item.item_type ===
            'preorder',
    );

            const form =
            useForm<CheckoutFormData>({
                confirmed: false,
                payment_method:
                    'cash',
                payment_reference:
                    '',
                item_ids:
                    cart.items.map(
                        (item) =>
                            item.id,
                    ),
                checkout: '',
                cart: '',
            });

    const submitOrder =
        () => {
            if (
                !isPreorderOnly
                && form.data.payment_method !== 'cash'
                && !form.data.payment_reference.trim()
            ) {
                form.setError(
                    'payment_reference',
                    'Enter the GCash/Maya transaction reference number before placing your order.',
                );

                return;
            }

            form.clearErrors(
                'payment_reference',
            );

            form.transform(
                (data) => {
                    if (isPreorderOnly) {
                        return {
                            confirmed:
                                data.confirmed,

                            item_ids:
                                data.item_ids,
                        };
                    }

                    return {
                        confirmed:
                            data.confirmed,

                        payment_method:
                            data.payment_method,

                        payment_reference:
                            data.payment_method === 'cash'
                                ? ''
                                : data.payment_reference.trim(),

                        item_ids:
                            data.item_ids,
                    };
                },
            );

            form.post(
                '/checkout',
                {
                    preserveScroll: true,

                    onSuccess: () => {
                        showSuccess(
                            isPreorderOnly
                                ? 'Your preorder was submitted successfully.'
                                : 'Your order was placed successfully.',
                        );
                    },

                    onError: () => {
                        showError(
                            isPreorderOnly
                                ? 'Your preorder could not be submitted. Please review the information and try again.'
                                : 'Your order could not be placed. Please review the checkout information and try again.',
                        );
                    },
                },
            );
        };



    return (
        <StudentLayout>
            <Head title="Checkout" />

            {notification && (
        <ActionNotification
            type={notification.type}
            message={notification.message}
            onClose={clearNotification}
        />
    )}

                <ActionConfirmModal
                    open={confirmOrderOpen}
                    title={
                        isPreorderOnly
                            ? 'Submit Preorder?'
                            : 'Place Order?'
                    }
                    message={
                        isPreorderOnly
                            ? 'Submit this preorder request? Your final preorder price, including any eligible early-bird discount, will be confirmed when the preorder is submitted. No payment is required yet.'
                            : `Confirm placing this order for ${formatCurrency(cart.subtotal)} using ${formatPaymentMethod(form.data.payment_method)}.`
                    }
                    confirmText={
                        isPreorderOnly
                            ? 'Submit Preorder'
                            : 'Place Order'
                    }
                    processingText={
                        isPreorderOnly
                            ? 'Submitting Preorder...'
                            : 'Placing Order...'
                    }
                    processing={form.processing}
                    tone="primary"
                    onCancel={() =>
                        setConfirmOrderOpen(false)
                    }
                    onConfirm={submitOrder}
                />


            <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/cart"
                        aria-label="Back to cart"
                        className="
                            flex h-12 w-12 shrink-0
                            items-center justify-center
                            rounded-2xl border
                            border-slate-200
                            bg-white text-slate-600
                            shadow-sm transition
                            hover:border-blue-300
                            hover:bg-blue-50
                            hover:text-blue-700
                        "
                    >
                        <ArrowLeft size={21} />
                    </Link>

                    <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            {isPreorderOnly
                                ? 'Review Preorder'
                                : 'Checkout'}
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            {isPreorderOnly
                                ? 'Review your preorder request before submitting it.'
                                : 'Review your order before placing it.'}
                        </p>
                    </div>
                </div>

                <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-black text-slate-900">
                                Student Information
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                This order will be recorded under this student account.
                            </p>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <InfoBox
                                    label="Student Name"
                                    value={student.name}
                                />

                                <InfoBox
                                    label="Student ID"
                                    value={student.student_id}
                                />

                                <InfoBox
                                    label="Course"
                                    value={
                                        student.course
                                        ?? 'Not assigned'
                                    }
                                />

                                <InfoBox
                                    label="Year Level"
                                    value={
                                        student.year_level
                                        ?? 'Not assigned'
                                    }
                                />

                                <InfoBox
                                    label="Email"
                                    value={student.email}
                                    fullWidth
                                />
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Order Items
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Final merchandise selection before checkout.
                                    </p>
                                </div>

                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <ShoppingBag size={20} />
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                {cart.items.map(
                                    (item) => (
                                        <CheckoutItemCard
                                            key={item.id}
                                            item={item}
                                        />
                                    ),
                                )}
                            </div>
                        </section>

                                {/* PAYMENT METHOD */}
                                {!isPreorderOnly && (
                                    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                                Payment
                                            </p>

                                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                                Choose Payment Method
                                            </h2>

                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                                Choose how you will pay for this order.
                                                Cash is paid to the cashier. For GCash
                                                or Maya, enter the transaction reference
                                                number from your payment.
                                            </p>
                                        </div>

                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <WalletCards size={21} />
                                        </div>
                                    </div>

                            <div className="mt-6 grid gap-3 md:grid-cols-3">
                                <PaymentOption
                                    icon={Banknote}
                                    title="Cash"
                                    description="Pay directly to the PROWARE cashier."
                                    selected={
                                        form.data.payment_method
                                        === 'cash'
                                    }
                                    onClick={() => {
                                        form.setData(
                                            'payment_method',
                                            'cash',
                                        );
                                        form.setData(
                                            'payment_reference',
                                            '',
                                        );
                                        form.clearErrors(
                                            'payment_reference',
                                        );
                                    }}
                                />

                                <PaymentOption
                                    icon={Smartphone}
                                    title="GCash"
                                    description="Pay online and provide your GCash reference number."
                                    selected={
                                        form.data.payment_method
                                        === 'gcash'
                                    }
                                    onClick={() => {
                                        form.setData(
                                            'payment_method',
                                            'gcash',
                                        );
                                        form.clearErrors(
                                            'payment_reference',
                                        );
                                    }}
                                />

                                <PaymentOption
                                    icon={WalletCards}
                                    title="Maya"
                                    description="Pay online and provide your Maya reference number."
                                    selected={
                                        form.data.payment_method
                                        === 'maya'
                                    }
                                    onClick={() => {
                                        form.setData(
                                            'payment_method',
                                            'maya',
                                        );
                                        form.clearErrors(
                                            'payment_reference',
                                        );
                                    }}
                                />
                            </div>
                                    

{form.data.payment_method !== 'cash' && (
                                <div className="mt-6">

                                    {/* SCHOOL PAYMENT QR */}
                                    <div className="mb-6 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
                                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                            School Payment QR
                                        </p>

                                        <h3 className="mt-1 text-lg font-black text-slate-900">
                                            {form.data.payment_method === 'gcash'
                                                ? 'Pay with GCash'
                                                : 'Pay with Maya'}
                                        </h3>

                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            Scan the school QR using your{' '}
                                            {form.data.payment_method === 'gcash'
                                                ? 'GCash'
                                                : 'Maya'}{' '}
                                            app, then enter the transaction reference number below.
                                        </p>

                                        <div className="mx-auto mt-5 w-fit rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                            <img
                                                src={
                                                    form.data.payment_method === 'gcash'
                                                        ? '/images/payments/gcash-qr.png'
                                                        : '/images/payments/maya-qr.png'
                                                }
                                                alt={
                                                    form.data.payment_method === 'gcash'
                                                        ? 'STI PROWARE GCash payment QR'
                                                        : 'STI PROWARE Maya payment QR'
                                                }
                                                className="h-64 w-64 object-contain"
                                            />
                                        </div>

                                        <div className="mt-5 rounded-2xl bg-white p-4">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                Amount to Pay
                                            </p>

                                            <p className="mt-1 text-2xl font-black text-slate-950">
                                                {formatCurrency(
                                                    cart.subtotal,
                                                )}
                                            </p>
                                        </div>

                                        <div className="mt-5 text-left">
                                            <p className="text-sm font-black text-slate-900">
                                                Before placing your order:
                                            </p>

                                            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
                                                <li>
                                                    Open your{' '}
                                                    {form.data.payment_method === 'gcash'
                                                        ? 'GCash'
                                                        : 'Maya'}{' '}
                                                    app.
                                                </li>

                                                <li>
                                                    Scan the school QR code above.
                                                </li>

                                                <li>
                                                    Pay exactly{' '}
                                                    <strong>
                                                        {formatCurrency(
                                                            cart.subtotal,
                                                        )}
                                                    </strong>
                                                    .
                                                </li>

                                                <li>
                                                    Copy the transaction/reference number after payment.
                                                </li>

                                                <li>
                                                    Enter the reference number below.
                                                </li>
                                            </ol>
                                        </div>
                                    </div>
        

                                    {/* PAYMENT REFERENCE */}
                                    <label
                                        htmlFor="payment_reference"
                                        className="block text-sm font-black text-slate-800"
                                    >
                                        {form.data.payment_method === 'gcash'
                                            ? 'GCash'
                                            : 'Maya'}{' '}
                                        Transaction / Reference Number
                                    </label>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Enter the exact reference number from your completed online payment.
                                    </p>

                                    <input
                                        id="payment_reference"
                                        type="text"
                                        value={
                                            form.data.payment_reference
                                        }
                                        onChange={(event) => {
                                            form.setData(
                                                'payment_reference',
                                                event.target.value,
                                            );

                                            form.clearErrors(
                                                'payment_reference',
                                            );
                                        }}
                                        placeholder={
                                            form.data.payment_method === 'gcash'
                                                ? 'Enter GCash reference number'
                                                : 'Enter Maya reference number'
                                        }
                                        autoComplete="off"
                                        className={`
                                            mt-3 w-full rounded-xl border bg-white px-4 py-3
                                            text-sm font-semibold text-slate-900 outline-none transition
                                            placeholder:text-slate-400 focus:ring-4 focus:ring-blue-500/10
                                            ${
                                                form.errors.payment_reference
                                                    ? 'border-red-400 focus:border-red-500'
                                                    : 'border-slate-300 focus:border-blue-500'
                                            }
                                        `}
                                    />

                                    {form.errors.payment_reference && (
                                        <p className="mt-2 text-sm font-semibold text-red-600">
                                            {form.errors.payment_reference}
                                        </p>
                                    )}

                                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                        <p className="text-sm font-black text-amber-900">
                                            Reference number required
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-amber-700">
                                            The cashier will verify this reference number before confirming your payment.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-sm text-slate-500">
                                        Selected Method
                                    </span>

                                    <span className="font-black text-slate-900">
                                        {formatPaymentMethod(
                                            form.data.payment_method,
                                        )}
                                    </span>
                                </div>

                                {form.data.payment_method !== 'cash' && (
                                    <div className="mt-3 flex items-start justify-between gap-4">
                                        <span className="text-sm text-slate-500">
                                            Reference
                                        </span>

                                        <span className="max-w-[65%] break-all text-right font-mono text-sm font-black text-slate-900">
                                            {form.data.payment_reference.trim() || 'Required'}
                                        </span>
                                    </div>
                                )}

                                <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
                                    <span className="font-black text-slate-900">
                                        Amount
                                    </span>

                                    <span className="text-xl font-black text-slate-950">
                                        {formatCurrency(
                                            cart.subtotal,
                                        )}
                                    </span>
                                </div>
                            </div>
                        </section>
)}

<section className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                                    <ShieldCheck size={20} />
                                </div>

                                <div>
                                    <h2 className="font-black text-slate-900">
                                        Final validation happens at checkout
                                    </h2>

                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        PROWARE will recheck product availability,
                                        selected variants, stock, preorder rules,
                                        and current prices before creating the order.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                <CheckCircle2 size={22} />
                            </div>

                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Order Summary
                                </h2>

                                <p className="mt-1 text-xs text-slate-500">
                                    Confirm before placing order
                                </p>
                            </div>
                        </div>

                        <dl className="mt-7 space-y-5">
                            <SummaryRow
                                label="Different items"
                                value={String(
                                    cart.items.length,
                                )}
                            />

                            <SummaryRow
                                label="Total quantity"
                                value={String(
                                    cart.total_quantity,
                                )}
                            />

                            <div className="border-t border-slate-100 pt-5">
                                <SummaryRow
                                    label="Subtotal"
                                    value={formatCurrency(
                                        cart.subtotal,
                                    )}
                                    emphasized
                                />
                            </div>
                        </dl>

                        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={
                                        form.data.confirmed
                                    }
                                    onChange={(event) =>
                                        form.setData(
                                            'confirmed',
                                            event.target.checked,
                                        )
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />

                                <span className="text-sm leading-6 text-slate-600">
                                    I confirm that I reviewed the
                                    selected products, variants,
                                    quantities, and total amount.
                                </span>
                            </label>

                            {form.errors.confirmed && (
                                <p className="mt-3 text-sm font-semibold text-red-600">
                                    {
                                        form.errors
                                            .confirmed
                                    }
                                </p>
                            )}
                        </div>

                        {form.errors.checkout && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {form.errors.checkout}
                            </div>
                        )}

                        {form.errors.cart && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {form.errors.cart}
                            </div>
                        )}

            <ActionProcessingButton
                type="button"
                processing={form.processing}
                disabled={
                    !form.data.confirmed
                    || (
                        !isPreorderOnly
                        && form.data.payment_method !== 'cash'
                        && !form.data.payment_reference.trim()
                    )
                }
                onClick={() =>
                    setConfirmOrderOpen(true)
                }
                idleText={
                    isPreorderOnly
                        ? 'Submit Preorder'
                        : 'Place Order'
                }
                processingText={
                    isPreorderOnly
                        ? 'Submitting Preorder...'
                        : 'Placing Order...'
                }
                className="
                    mt-6 w-full
                    bg-[#0D6EFD]
                    px-5 py-4
                    text-white
                    hover:bg-blue-700
                "
            />

                        <Link
                            href="/cart"
                            className="
                                mt-3 flex w-full
                                items-center justify-center
                                gap-2 rounded-xl
                                border border-slate-200
                                bg-white px-5 py-4
                                text-sm font-bold
                                text-slate-700 transition
                                hover:border-blue-300
                                hover:bg-blue-50
                                hover:text-blue-700
                            "
                        >
                            <ArrowLeft size={18} />

                            Back to Cart
                        </Link>

                        <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                            Your stock will only be reserved after the order is successfully created.
                        </p>
                    </aside>
                </div>
            </div>
        </StudentLayout>
    );
}

interface CheckoutItemCardProps {
    item: CheckoutItem;
}

function CheckoutItemCard({
    item,
}: CheckoutItemCardProps) {
    return (
        <article className="flex flex-col gap-5 rounded-2xl border border-slate-200 p-4 sm:flex-row">
            <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 sm:w-28">
                {item.product.image_url ? (
                    <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-full w-full object-contain p-2"
                    />
                ) : (
                    <PackageOpen
                        size={34}
                        className="text-slate-300"
                    />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="font-mono text-xs font-bold uppercase tracking-wide text-blue-600">
                            {item.product.code}
                        </p>

                        <h3 className="mt-1 font-black text-slate-900">
                            {item.product.name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                            {
                                item.product
                                    .category.name
                            }
                        </p>
                    </div>

                    <span
                        className={`
                            inline-flex w-fit rounded-full
                            px-3 py-1 text-xs font-bold

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

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniInfo
                        label="Variant"
                        value={
                            item.variant
                                .variant_name
                        }
                    />

                    <MiniInfo
                        label="SKU"
                        value={
                            item.variant.sku
                        }
                    />

                    {item.variant.program && (
                        <MiniInfo
                            label="Program"
                            value={
                                item.variant
                                    .program
                            }
                        />
                    )}

                    {item.variant.size && (
                        <MiniInfo
                            label="Size"
                            value={
                                item.variant.size
                            }
                        />
                    )}
                </div>

                    {item.item_type === 'preorder'
                        && Number(
                            item.product.preorder_early_bird_slots,
                        ) > 0
                        && Number(
                            item.product
                                .preorder_early_bird_discount_percent,
                        ) > 0 && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-black text-amber-800">
                                    Early Bird Discount
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    You may receive{' '}
                                    <span className="font-black">
                                        {Number(
                                            item.product
                                                .preorder_early_bird_discount_percent,
                                        )}%
                                    </span>{' '}
                                    off if your preorder qualifies for one of the first{' '}
                                    <span className="font-black">
                                        {item.product.preorder_early_bird_slots}
                                    </span>{' '}
                                    early-bird slots. Final eligibility and price are
                                    confirmed when you submit the preorder.
                                </p>
                            </div>
                        )}

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                        <p className="text-xs text-slate-400">
                            Quantity
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                            {item.quantity}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-slate-400">
                            Unit price
                        </p>

                        <p className="mt-1 font-bold text-slate-700">
                            {formatCurrency(
                                item.unit_price,
                            )}
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-slate-400">
                            Line total
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-900">
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

interface InfoBoxProps {
    label: string;
    value: string;
    fullWidth?: boolean;
}

function InfoBox({
    label,
    value,
    fullWidth = false,
}: InfoBoxProps) {
    return (
        <div
            className={`
                rounded-2xl bg-slate-50
                px-4 py-3

                ${
                    fullWidth
                        ? 'sm:col-span-2'
                        : ''
                }
            `}
        >
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {value}
            </p>
        </div>
    );
}

interface MiniInfoProps {
    label: string;
    value: string;
}

function MiniInfo({
    label,
    value,
}: MiniInfoProps) {
    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-700">
                {value}
            </p>
        </div>
    );
}

interface SummaryRowProps {
    label: string;
    value: string;
    emphasized?: boolean;
}

function SummaryRow({
    label,
    value,
    emphasized = false,
}: SummaryRowProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt
                className={
                    emphasized
                        ? 'font-bold text-slate-800'
                        : 'text-sm font-semibold text-slate-600'
                }
            >
                {label}
            </dt>

            <dd
                className={
                    emphasized
                        ? 'text-xl font-black text-slate-900'
                        : 'text-sm font-black text-slate-900'
                }
            >
                {value}
            </dd>
        </div>
    );
}


interface PaymentOptionProps {
    icon: typeof Banknote;
    title: string;
    description: string;
    selected: boolean;
    onClick: () => void;
}

function PaymentOption({
    icon: Icon,
    title,
    description,
    selected,
    onClick,
}: PaymentOptionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                rounded-2xl border p-4 text-left transition
                ${
                    selected
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                }
            `}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`
                        flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                        ${
                            selected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                        }
                    `}
                >
                    <Icon size={19} />
                </div>

                <div>
                    <p className="font-black text-slate-900">
                        {title}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {description}
                    </p>
                </div>
            </div>
        </button>
    );
}

function formatPaymentMethod(
    method:
        | 'cash'
        | 'gcash'
        | 'maya',
): string {
    switch (method) {
        case 'gcash':
            return 'GCash';
        case 'maya':
            return 'Maya';
        default:
            return 'Cash';
    }
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