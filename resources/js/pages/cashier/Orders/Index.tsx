import {
    Banknote,
    Clock3,
    Eye,
    Search,
    ShoppingBag,
} from 'lucide-react';

import {
    Head,
    Link,
} from '@inertiajs/react';

import {
    useMemo,
    useState,
} from 'react';

import CashierLayout from '@/layouts/CashierLayout';

import cashier from '@/routes/cashier';

interface OrderStudent {
    name: string;
    student_id: string;
    course: string | null;
}

interface CashierOrder {
    id: number;
    order_number: string;
    order_type: string;
    payment_status: string;
    fulfillment_status: string;
    total: string;
    total_quantity: number;
    created_at: string | null;
    image_url: string | null;
    student: OrderStudent;
}

interface OrdersIndexProps {
    orders: CashierOrder[];
}

export default function Index({
    orders,
}: OrdersIndexProps) {
    const [
        search,
        setSearch,
    ] = useState('');

    const filteredOrders =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return orders;
            }

            return orders.filter(
                (order) =>
                    order.order_number
                        .toLowerCase()
                        .includes(value)
                    || order.student.name
                        .toLowerCase()
                        .includes(value)
                    || order.student.student_id
                        .toLowerCase()
                        .includes(value),
            );
        }, [
            orders,
            search,
        ]);

    return (
        <CashierLayout>
            <Head title="Pending Payments" />

            <div className="space-y-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Pending Payments
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Verify student orders before confirming payment.
                        </p>
                    </div>

                    <div className="relative w-full lg:w-96">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Order number, student name or ID..."
                            className="
                                w-full rounded-xl
                                border border-slate-200
                                bg-white py-3
                                pl-11 pr-4
                                text-sm text-slate-900
                                outline-none transition
                                focus:border-blue-500
                                focus:ring-4
                                focus:ring-blue-100
                            "
                        />
                    </div>
                </div>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                                <Clock3 size={20} />
                            </div>

                            <div>
                                <p className="font-black text-slate-900">
                                    Waiting for Payment
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {filteredOrders.length}{' '}
                                    order
                                    {filteredOrders.length === 1
                                        ? ''
                                        : 's'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {filteredOrders.length > 0 ? (
                    <section className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                        {filteredOrders.map(
                            (order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                />
                            ),
                        )}
                    </section>
                ) : (
                    <EmptyOrders
                        searching={
                            search.trim() !== ''
                        }
                    />
                )}
            </div>
        </CashierLayout>
    );
}

interface OrderCardProps {
    order: CashierOrder;
}

function OrderCard({
    order,
}: OrderCardProps) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="font-mono text-lg font-black uppercase tracking-wide text-blue-600">
                        {order.order_number}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        {order.created_at
                            ?? 'Order date unavailable'}
                    </p>
                </div>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                    Pending Payment
                </span>
            </div>

            <div className="mt-5 flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                {order.image_url ? (
                    <img
                        src={order.image_url}
                        alt={order.order_number}
                        className="h-full w-full object-contain p-3"
                    />
                ) : (
                    <ShoppingBag
                        size={36}
                        className="text-slate-300"
                    />
                )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoBox
                    label="Quantity"
                    value={String(
                        order.total_quantity,
                    )}
                />

                <InfoBox
                    label="Order Type"
                    value={formatStatus(
                        order.order_type,
                    )}
                />
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs text-slate-400">
                            Payment
                        </p>

                        <p className="mt-1 text-sm font-bold text-amber-700">
                            {formatStatus(
                                order.payment_status,
                            )}
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-slate-400">
                            Amount Due
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                            {formatCurrency(
                                order.total,
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <Link
                href={cashier.orders.show.url(order.id)}
                className="
                    mt-5 flex w-full
                    items-center justify-center
                    gap-2 rounded-xl
                    bg-[#0D6EFD]
                    px-4 py-3
                    text-sm font-bold
                    text-white transition
                    hover:bg-blue-700
                "
            >
                <Eye size={17} />

                Review Payment
            </Link>
        </article>
    );
}

interface InfoBoxProps {
    label: string;
    value: string;
}

function InfoBox({
    label,
    value,
}: InfoBoxProps) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-black text-slate-900">
                {value}
            </p>
        </div>
    );
}

interface EmptyOrdersProps {
    searching: boolean;
}

function EmptyOrders({
    searching,
}: EmptyOrdersProps) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            {searching ? (
                <Search
                    size={44}
                    className="mx-auto text-slate-300"
                />
            ) : (
                <Banknote
                    size={44}
                    className="mx-auto text-slate-300"
                />
            )}

            <h2 className="mt-5 text-xl font-black text-slate-800">
                {searching
                    ? 'No matching orders'
                    : 'No pending payments'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {searching
                    ? 'Try another order number, student name, or student ID.'
                    : 'All submitted student orders have been processed for payment.'}
            </p>
        </section>
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

function formatStatus(
    status: string,
): string {
    return status
        .replace(/_/g, ' ')
        .replace(
            /\b\w/g,
            (character) =>
                character.toUpperCase(),
        );
}