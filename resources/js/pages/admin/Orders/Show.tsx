import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Clock3,
    PackageCheck,
    ReceiptText,
    ShoppingBag,
    UserRound,
    XCircle,
} from 'lucide-react';

import {
    Head,
    Link,
} from '@inertiajs/react';

import AdminLayout from '@/layouts/AdminLayout';

interface StudentInfo {
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
    item_type: string;
    quantity: number;
    unit_price: string;
    line_total: string;
}

interface AdminOrder {
    id: number;
    order_number: string;
    source: string;
    order_type: string;
    payment_status: string;
    fulfillment_status: string;
    subtotal: string;
    total: string;
    created_at: string | null;
    paid_at: string | null;
    released_at: string | null;
    cancelled_at: string | null;
    student: StudentInfo;
    items: OrderItem[];
}

interface ShowPageProps {
    order: AdminOrder;
}

export default function Show({
    order,
}: ShowPageProps) {
    const payment =
        getPaymentStatus(
            order.payment_status,
        );

    const fulfillment =
        getFulfillmentStatus(
            order.fulfillment_status,
        );

    const cancelled =
        order.cancelled_at !== null;

    return (
        <AdminLayout>
            <Head
                title={`Order ${order.order_number}`}
            />

            <div className="mx-auto max-w-6xl space-y-5">
                {/* BACK */}
                <Link
                    href="/admin/orders"
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
                    <ArrowLeft size={17} />

                    Back to Orders
                </Link>

                {/* MAIN ORDER HEADER */}
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
                            flex-col
                            gap-5
                            px-6
                            py-6
                            sm:px-7
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                        "
                    >
                        <div className="min-w-0">
                            <p
                                className="
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-blue-600
                                "
                            >
                                Order Transaction
                            </p>

                            <h1
                                className="
                                    mt-2
                                    break-all
                                    font-mono
                                    text-2xl
                                    font-black
                                    text-slate-900
                                    sm:text-3xl
                                "
                            >
                                {order.order_number}
                            </h1>

                            <div
                                className="
                                    mt-3
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-x-3
                                    gap-y-2
                                    text-sm
                                    text-slate-500
                                "
                            >
                                <span className="font-bold text-slate-800">
                                    {order.student.name}
                                </span>

                                <span className="hidden text-slate-300 sm:inline">
                                    •
                                </span>

                                <span className="font-mono">
                                    {
                                        order.student
                                            .student_id
                                    }
                                </span>

                                {order.student
                                    .course && (
                                    <>
                                        <span className="hidden text-slate-300 sm:inline">
                                            •
                                        </span>

                                        <span>
                                            {
                                                order
                                                    .student
                                                    .course
                                            }
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div
                            className="
                                flex
                                flex-col
                                gap-3
                                sm:flex-row
                                sm:items-center
                                lg:justify-end
                            "
                        >
                            <div className="flex flex-wrap gap-2">
                                <span
                                    className={`
                                        rounded-full
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-black
                                        ${payment.className}
                                    `}
                                >
                                    {payment.label}
                                </span>

                                <span
                                    className={`
                                        rounded-full
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-black
                                        ${fulfillment.className}
                                    `}
                                >
                                    {
                                        fulfillment.label
                                    }
                                </span>
                            </div>

                            <div
                                className="
                                    border-slate-200
                                    sm:border-l
                                    sm:pl-5
                                    sm:text-right
                                "
                            >
                                <p className="text-xs text-slate-400">
                                    Order Total
                                </p>

                                <p className="mt-1 text-2xl font-black text-slate-950">
                                    {formatCurrency(
                                        order.total,
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-yellow-400" />
                </section>

                {/* ORDER PROGRESS */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        px-6
                        py-5
                        shadow-sm
                        sm:px-7
                    "
                >
                    <div>
                        <h2 className="font-black text-slate-900">
                            Order Progress
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Transaction lifecycle
                            recorded by PROWARE.
                        </p>
                    </div>

                    {cancelled ? (
                        <div
                            className="
                                mt-5
                                flex
                                items-start
                                gap-3
                                rounded-2xl
                                bg-red-50
                                p-4
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-9
                                    w-9
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-red-100
                                    text-red-600
                                "
                            >
                                <XCircle size={18} />
                            </div>

                            <div>
                                <p className="font-black text-red-800">
                                    Order Cancelled
                                </p>

                                <p className="mt-1 text-xs text-red-600">
                                    {order.cancelled_at}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="
                                mt-6
                                grid
                                gap-3
                                md:grid-cols-3
                            "
                        >
                            <ProgressStep
                                number="1"
                                title="Order Created"
                                date={
                                    order.created_at
                                }
                                complete
                            />

                            <ProgressStep
                                number="2"
                                title="Payment Confirmed"
                                date={
                                    order.paid_at
                                }
                                complete={
                                    order.paid_at !==
                                    null
                                }
                            />

                            <ProgressStep
                                number="3"
                                title="Merchandise Released"
                                date={
                                    order.released_at
                                }
                                complete={
                                    order.released_at !==
                                    null
                                }
                            />
                        </div>
                    )}
                </section>

                {/* ORDER ITEMS */}
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
                            px-6
                            py-5
                        "
                    >
                        <div>
                            <h2 className="text-lg font-black text-slate-900">
                                Order Items
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Merchandise included in
                                this transaction.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                h-10
                                w-10
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-50
                                text-blue-600
                            "
                        >
                            <ShoppingBag
                                size={19}
                            />
                        </div>
                    </div>

                    {order.items.length > 0 ? (
                        <>
                            <div className="divide-y divide-slate-100">
                                {order.items.map(
                                    (item) => (
                                        <OrderItemRow
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

                            <div
                                className="
                                    border-t
                                    border-slate-100
                                    bg-slate-50/70
                                    px-6
                                    py-5
                                "
                            >
                                <div
                                    className="
                                        ml-auto
                                        max-w-sm
                                        space-y-3
                                    "
                                >
                                    <AmountRow
                                        label="Subtotal"
                                        value={
                                            order.subtotal
                                        }
                                    />

                                    <div className="border-t border-slate-200 pt-3">
                                        <AmountRow
                                            label="Total"
                                            value={
                                                order.total
                                            }
                                            emphasized
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="px-6 py-14 text-center">
                            <ShoppingBag
                                size={36}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-4 font-bold text-slate-700">
                                No order items found
                            </p>
                        </div>
                    )}
                </section>

                {/* DETAILS */}
                <section
                    className="
                        grid
                        gap-5
                        lg:grid-cols-2
                    "
                >
                    {/* STUDENT */}
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
                        <div className="flex items-center gap-3">
                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-blue-100
                                    text-blue-700
                                "
                            >
                                <UserRound
                                    size={19}
                                />
                            </div>

                            <div>
                                <h2 className="font-black text-slate-900">
                                    Student Information
                                </h2>

                                <p className="text-xs text-slate-500">
                                    Owner of this order
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                mt-5
                                grid
                                gap-x-5
                                gap-y-4
                                sm:grid-cols-2
                            "
                        >
                            <Detail
                                label="Name"
                                value={
                                    order.student.name
                                }
                            />

                            <Detail
                                label="Student ID"
                                value={
                                    order.student
                                        .student_id
                                }
                            />

                            <Detail
                                label="Course"
                                value={
                                    order.student
                                        .course
                                    ?? 'N/A'
                                }
                            />

                            <Detail
                                label="Year Level"
                                value={
                                    order.student
                                        .year_level
                                    ?? 'N/A'
                                }
                            />
                        </div>
                    </article>

                    {/* TRANSACTION */}
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
                        <div className="flex items-center gap-3">
                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-slate-100
                                    text-slate-700
                                "
                            >
                                <ReceiptText
                                    size={19}
                                />
                            </div>

                            <div>
                                <h2 className="font-black text-slate-900">
                                    Transaction Information
                                </h2>

                                <p className="text-xs text-slate-500">
                                    Recorded order details
                                </p>
                            </div>
                        </div>

                        <div
                            className="
                                mt-5
                                grid
                                gap-x-5
                                gap-y-4
                                sm:grid-cols-2
                            "
                        >
                            <Detail
                                label="Order Type"
                                value={formatValue(
                                    order.order_type,
                                )}
                            />

                            <Detail
                                label="Source"
                                value={formatValue(
                                    order.source,
                                )}
                            />

                            <Detail
                                label="Created"
                                value={
                                    order.created_at
                                    ?? 'N/A'
                                }
                            />

                            <Detail
                                label="Paid"
                                value={
                                    order.paid_at
                                    ?? 'Not paid yet'
                                }
                            />

                            <Detail
                                label="Released"
                                value={
                                    order.released_at
                                    ?? 'Not released yet'
                                }
                            />

                            <Detail
                                label="Status"
                                value={
                                    fulfillment.label
                                }
                            />
                        </div>
                    </article>
                </section>

                {/* ADMIN ROLE NOTE */}
                <section
                    className="
                        flex
                        items-start
                        gap-3
                        rounded-2xl
                        border
                        border-slate-200
                        bg-slate-50
                        px-5
                        py-4
                    "
                >
                    <CheckCircle2
                        size={18}
                        className="
                            mt-0.5
                            shrink-0
                            text-blue-600
                        "
                    />

                    <p className="text-xs leading-5 text-slate-500">
                        This is a read-only Admin
                        transaction record. Payment
                        confirmation is performed by
                        the Cashier and merchandise
                        release is performed by the
                        PROWARE Specialist.
                    </p>
                </section>
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Progress Step
|--------------------------------------------------------------------------
*/

function ProgressStep({
    number,
    title,
    date,
    complete,
}: {
    number: string;
    title: string;
    date: string | null;
    complete: boolean;
}) {
    return (
        <div
            className={`
                flex
                items-start
                gap-3
                rounded-2xl
                border
                p-4

                ${
                    complete
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-slate-50'
                }
            `}
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
                    text-sm
                    font-black

                    ${
                        complete
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                    }
                `}
            >
                {complete ? (
                    <Check size={17} />
                ) : (
                    number
                )}
            </div>

            <div>
                <p
                    className={`
                        text-sm
                        font-black

                        ${
                            complete
                                ? 'text-slate-900'
                                : 'text-slate-500'
                        }
                    `}
                >
                    {title}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    {date
                        ?? 'Not completed yet'}
                </p>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Order Item
|--------------------------------------------------------------------------
*/

function OrderItemRow({
    item,
}: {
    item: OrderItem;
}) {
    return (
        <div
            className="
                grid
                gap-4
                px-6
                py-5
                sm:grid-cols-[minmax(0,1fr)_auto]
                sm:items-center
            "
        >
            <div className="min-w-0">
                <div
                    className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                    "
                >
                    <p className="font-black text-slate-900">
                        {item.product_name}
                    </p>

                    <span
                        className="
                            rounded-full
                            bg-blue-50
                            px-2.5
                            py-1
                            font-mono
                            text-[10px]
                            font-black
                            text-blue-600
                        "
                    >
                        {item.product_code}
                    </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-600">
                    {item.variant_name}
                </p>

                <div
                    className="
                        mt-2
                        flex
                        flex-wrap
                        gap-x-3
                        gap-y-1
                        text-xs
                        text-slate-400
                    "
                >
                    <span>
                        SKU: {item.sku}
                    </span>

                    {item.program && (
                        <span>
                            Program:{' '}
                            {item.program}
                        </span>
                    )}

                    {item.size && (
                        <span>
                            Size: {item.size}
                        </span>
                    )}
                </div>
            </div>

            <div
                className="
                    flex
                    items-center
                    justify-between
                    gap-6
                    sm:justify-end
                "
            >
                <div className="text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                        Qty
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                        {item.quantity}
                    </p>
                </div>

                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                        Unit Price
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatCurrency(
                            item.unit_price,
                        )}
                    </p>
                </div>

                <div className="min-w-24 text-right">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                        Total
                    </p>

                    <p className="mt-1 font-black text-slate-950">
                        {formatCurrency(
                            item.line_total,
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Detail
|--------------------------------------------------------------------------
*/

function Detail({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="min-w-0">
            <p
                className="
                    text-[10px]
                    font-black
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
                    break-words
                    text-sm
                    font-bold
                    text-slate-800
                "
            >
                {value}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Amount
|--------------------------------------------------------------------------
*/

function AmountRow({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: string;
    emphasized?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-5">
            <span
                className={
                    emphasized
                        ? 'font-black text-slate-900'
                        : 'text-sm text-slate-500'
                }
            >
                {label}
            </span>

            <span
                className={
                    emphasized
                        ? 'text-xl font-black text-slate-950'
                        : 'font-bold text-slate-800'
                }
            >
                {formatCurrency(
                    value,
                )}
            </span>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Status Helpers
|--------------------------------------------------------------------------
*/

function getPaymentStatus(
    status: string,
): {
    label: string;
    className: string;
} {
    if (status === 'paid') {
        return {
            label: 'Paid',
            className:
                'bg-emerald-100 text-emerald-700',
        };
    }

    if (status === 'cancelled') {
        return {
            label: 'Cancelled',
            className:
                'bg-red-100 text-red-700',
        };
    }

    return {
        label: 'Pending Payment',
        className:
            'bg-amber-100 text-amber-700',
    };
}

function getFulfillmentStatus(
    status: string,
): {
    label: string;
    className: string;
} {
    if (status === 'released') {
        return {
            label: 'Released',
            className:
                'bg-emerald-100 text-emerald-700',
        };
    }

    if (
        status ===
        'ready_for_release'
    ) {
        return {
            label:
                'Ready for Release',
            className:
                'bg-blue-100 text-blue-700',
        };
    }

    if (status === 'preparing') {
        return {
            label: 'Preparing',
            className:
                'bg-blue-100 text-blue-700',
        };
    }

    if (status === 'cancelled') {
        return {
            label: 'Cancelled',
            className:
                'bg-red-100 text-red-700',
        };
    }

    return {
        label: formatValue(
            status,
        ),
        className:
            'bg-slate-100 text-slate-700',
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
            style: 'currency',
            currency: 'PHP',
        },
    ).format(
        Number(amount),
    );
}

function formatValue(
    value: string,
): string {
    return value
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase(),
        );
}