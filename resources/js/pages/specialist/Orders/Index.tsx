import {
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Clock3,
    PackageCheck,
    QrCode,
    Search,
    ShieldCheck,
    ShoppingBag,
    UserRound,
    X,
} from 'lucide-react';

import { Head, Link } from '@inertiajs/react';

import { useMemo, useState } from 'react';

import SpecialistLayout from '@/layouts/SpecialistLayout';

import specialist from '@/routes/specialist';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface StudentInfo {
    name: string;
    student_id: string;
    course: string;
}

interface FulfillmentItem {
    id: number;
    product_name: string | null;
    product_code: string | null;
    variant_name: string | null;
    sku: string | null;
    program: string | null;
    size: string | null;
    quantity: number;
    item_type: string | null;
    image_url: string | null;
}

interface FulfillmentOrder {
    id: number;

    order_number: string;

    order_type: string;

    payment_status: string;

    fulfillment_status: string;

    total: string;

    total_quantity: number;

    release_qr_token: string | null;

    release_qr_used: boolean;

    paid_at: string | null;

    student: StudentInfo;

    items: FulfillmentItem[];
}

interface OrdersIndexProps {
    orders: FulfillmentOrder[];
}

/*
|--------------------------------------------------------------------------
| Specialist Order Fulfillment
|--------------------------------------------------------------------------
*/

export default function Index({ orders }: OrdersIndexProps) {
    const [search, setSearch] = useState('');

    const [typeFilter, setTypeFilter] = useState<'' | 'preorder' | 'regular'>(
        '',
    );

    // Clicking the Preorders or Regular Orders card is a shortcut
    // for its type filter, and opens a compact popup with just that
    // subset. "All Orders" has no popup — it just filters the queue
    // below, since browsing everything belongs in the full list, not
    // a quick-look popup.
    const [cardPreview, setCardPreview] = useState<{
        label: string;
    } | null>(null);

    const openCardPreview = (
        value: 'preorder' | 'regular',
        label: string,
    ): void => {
        setTypeFilter(value);
        setCardPreview({ label });
    };

    const filteredOrders = useMemo(() => {
        const term = search.trim().toLowerCase();

        return orders.filter((order) => {
            if (typeFilter === 'preorder' && order.order_type !== 'preorder') {
                return false;
            }

            if (typeFilter === 'regular' && order.order_type === 'preorder') {
                return false;
            }

            if (!term) {
                return true;
            }

            const merchandise = order.items
                .map((item) =>
                    [
                        item.product_name,
                        item.product_code,
                        item.variant_name,
                        item.sku,
                        item.program,
                        item.size,
                    ]
                        .filter(Boolean)
                        .join(' '),
                )
                .join(' ');

            const haystack = [
                order.order_number,
                order.order_type,
                order.fulfillment_status,
                order.student.name,
                order.student.student_id,
                merchandise,
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(term);
        });
    }, [orders, search, typeFilter]);

    const totalOrders = orders.length;

    const preorderCount = orders.filter(
        (order) => order.order_type === 'preorder',
    ).length;

    const regularCount = totalOrders - preorderCount;

    const totalUnits = orders.reduce(
        (total, order) => total + order.total_quantity,
        0,
    );

    return (
        <SpecialistLayout>
            <Head title="Order Fulfillment" />

            <div className="mx-auto max-w-7xl space-y-7">
                {/* HEADER */}
                <section>
                    <p className="text-sm font-black tracking-wide text-blue-600 uppercase">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Order Fulfillment
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Review paid student orders waiting for merchandise
                        verification and physical release.
                    </p>
                </section>

                {/* SUMMARY */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="All Orders"
                        value={totalOrders}
                        description="Paid orders currently awaiting fulfillment"
                        icon={PackageCheck}
                        tone="blue"
                        active={typeFilter === ''}
                        onClick={() => setTypeFilter('')}
                    />

                    <SummaryCard
                        label="Preorders"
                        value={preorderCount}
                        description="Preorder items ready to be claimed"
                        icon={Clock3}
                        tone="purple"
                        active={typeFilter === 'preorder'}
                        onClick={() => openCardPreview('preorder', 'Preorders')}
                    />

                    <SummaryCard
                        label="Regular Orders"
                        value={regularCount}
                        description="Walk-in or app orders paid in full"
                        icon={ClipboardList}
                        tone="green"
                        active={typeFilter === 'regular'}
                        onClick={() =>
                            openCardPreview('regular', 'Regular Orders')
                        }
                    />

                    <SummaryCard
                        label="Total Units"
                        value={totalUnits}
                        description="Merchandise units waiting to be released"
                        icon={ShoppingBag}
                        tone="amber"
                    />
                </section>

                {/* INFORMATION */}
                <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <ShieldCheck size={20} />
                        </div>

                        <div>
                            <h2 className="font-black text-blue-950">
                                Specialist Release Queue
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-blue-800">
                                These orders have already been paid. Verify the
                                student, order, and merchandise before
                                confirming physical release.
                            </p>

                            <p className="mt-2 text-xs font-bold text-blue-700">
                                Stock Out occurs only after merchandise is
                                physically released.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SEARCH */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="relative w-full lg:max-w-lg">
                        <Search
                            size={18}
                            className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search order, student, product, SKU or size..."
                            className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
                </section>

                {/* ORDER QUEUE */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Paid Orders
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {filteredOrders.length} order
                                    {filteredOrders.length === 1
                                        ? ''
                                        : 's'}{' '}
                                    found
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <PackageCheck size={21} />
                            </div>
                        </div>
                    </div>

                    {filteredOrders.length > 0 ? (
                        <div className="grid gap-5 p-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredOrders.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState hasOrders={orders.length > 0} />
                    )}
                </section>
            </div>

            <OrderPreviewModal
                preview={cardPreview}
                orders={filteredOrders}
                onClose={() => setCardPreview(null)}
            />
        </SpecialistLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Order Preview Modal
|--------------------------------------------------------------------------
|
| Clicking a summary card is a shortcut for its type filter. It opens
| this popup with the matching orders, scrollable inside its own
| fixed-height container, instead of scrolling the page down to the
| queue below.
*/

function OrderPreviewModal({
    preview,
    orders,
    onClose,
}: {
    preview: { label: string } | null;
    orders: FulfillmentOrder[];
    onClose: () => void;
}) {
    if (!preview) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                            Quick View
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-900">
                            {preview.label}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {orders.length} order
                            {orders.length === 1 ? '' : 's'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                    {orders.length > 0 ? (
                        orders.map((order) => (
                            <OrderPreviewRow key={order.id} order={order} />
                        ))
                    ) : (
                        <p className="py-10 text-center text-sm text-slate-500">
                            No orders in this category.
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function OrderPreviewRow({ order }: { order: FulfillmentOrder }) {
    const isPreorder = order.order_type === 'preorder';

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound size={18} />
                </div>

                <div>
                    <p className="font-black text-slate-900">
                        {order.student.name}
                    </p>

                    <p className="font-mono text-xs text-blue-600">
                        {order.order_number}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {isPreorder && (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-violet-700 uppercase">
                        Preorder
                    </span>
                )}

                <span className="inline-flex min-w-10 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
                    {order.total_quantity}{' '}
                    {order.total_quantity === 1 ? 'unit' : 'units'}
                </span>
            </div>

            {order.release_qr_used ? (
                <Link
                    href={specialist.orders.show.url(order.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700"
                >
                    <PackageCheck size={15} />
                    Open
                </Link>
            ) : order.release_qr_token ? (
                <Link
                    href={specialist.orders.scan.url(order.release_qr_token)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
                >
                    <QrCode size={15} />
                    Verify
                </Link>
            ) : (
                <span className="text-xs font-semibold text-slate-400">
                    QR unavailable
                </span>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Order Card
|--------------------------------------------------------------------------
*/

function OrderCard({ order }: { order: FulfillmentOrder }) {
    const isPreorder = order.order_type === 'preorder';

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-md">
            {/* ORDER HEADER */}
            <div className="p-6 pb-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-sm font-black tracking-wide text-blue-600">
                                {order.order_number}
                            </p>

                            <span
                                className={`rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-violet-700 uppercase ${isPreorder ? '' : 'invisible'}`}
                            >
                                Preorder
                            </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            Paid{' '}
                            <span className="font-semibold text-slate-700">
                                {order.paid_at ?? 'Date unavailable'}
                            </span>
                        </p>
                    </div>

                    <StatusBadge
                        label={formatStatus(order.fulfillment_status)}
                        tone="blue"
                    />
                </div>

                {/* STUDENT */}
                <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <UserRound size={18} />
                    </div>

                    <div className="min-w-0">
                        <p className="truncate font-black text-slate-900">
                            {order.student.name}
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            Student ID: {order.student.student_id}
                        </p>
                    </div>
                </div>
            </div>

            {/* MERCHANDISE */}
            <div className="flex-1 border-y border-slate-100 bg-slate-50/60 px-6 py-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-black tracking-wider text-slate-400 uppercase">
                        Merchandise
                    </p>

                    <p className="text-xs font-bold text-slate-500">
                        {order.total_quantity}{' '}
                        {order.total_quantity === 1 ? 'unit' : 'units'}
                    </p>
                </div>

                {order.items.length > 0 ? (
                    <MerchandiseList items={order.items} />
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center">
                        <ShoppingBag
                            size={24}
                            className="mx-auto text-slate-300"
                        />

                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Merchandise details unavailable.
                        </p>
                    </div>
                )}
            </div>

            {/* ACTION */}
            <div className="p-6">
                {order.release_qr_used ? (
                    <Link
                        href={specialist.orders.show.url(order.id)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                    >
                        <PackageCheck size={18} />
                        Open Verified Order
                    </Link>
                ) : order.release_qr_token ? (
                    <Link
                        href={specialist.orders.scan.url(
                            order.release_qr_token,
                        )}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                    >
                        <QrCode size={18} />
                        Verify Release QR
                    </Link>
                ) : (
                    <button
                        type="button"
                        disabled
                        className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500"
                    >
                        <QrCode size={18} />
                        Release QR Unavailable
                    </button>
                )}
            </div>
        </article>
    );
}

function MerchandiseList({ items }: { items: FulfillmentItem[] }) {
    const [expanded, setExpanded] = useState(false);

    const visibleItems = expanded ? items : items.slice(0, 2);

    const hiddenCount = items.length - visibleItems.length;

    return (
        <div className="space-y-4">
            {visibleItems.map((item) => (
                <MerchandiseItem key={item.id} item={item} />
            ))}

            {hiddenCount > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-black text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                >
                    <ChevronDown size={14} />
                    Show {hiddenCount} more{' '}
                    {hiddenCount === 1 ? 'item' : 'items'}
                </button>
            )}

            {expanded && items.length > 2 && (
                <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-xs font-black text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                >
                    <ChevronUp size={14} />
                    Show less
                </button>
            )}
        </div>
    );
}

function MerchandiseItem({ item }: { item: FulfillmentItem }) {
    const [imageFailed, setImageFailed] = useState(false);

    const variantDetails = [item.program, item.size].filter(
        (value, index, values) => value && values.indexOf(value) === index,
    );

    const variantLabel =
        variantDetails.length > 0
            ? variantDetails.join(' • ')
            : item.variant_name || 'Standard';

    return (
        <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-3">
            {/* PRODUCT IMAGE */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                {item.image_url && !imageFailed ? (
                    <img
                        src={item.image_url}
                        alt={item.product_name ?? 'Merchandise'}
                        className="h-full w-full object-contain p-1"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <ShoppingBag size={28} className="text-slate-300" />
                )}
            </div>

            {/* PRODUCT INFO */}
            <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-black text-slate-900">
                    {item.product_name ?? 'Unknown Merchandise'}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-600">
                    {variantLabel}
                </p>

                {item.sku && (
                    <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                        SKU: {item.sku}
                    </p>
                )}

                <div className="mt-3">
                    <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                        Qty {item.quantity}
                    </span>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone = 'blue' | 'amber' | 'green' | 'purple';

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    tone,
    active = false,
    onClick,
}: {
    label: string;

    value: number;

    description: string;

    icon: typeof PackageCheck;

    tone: SummaryTone;

    active?: boolean;

    onClick?: () => void;
}) {
    const styles = {
        blue: {
            card: 'border-blue-100 bg-blue-50/40',

            icon: 'bg-blue-100 text-blue-600',

            label: 'text-blue-700',

            value: 'text-blue-700',
        },

        amber: {
            card: 'border-amber-100 bg-amber-50/40',

            icon: 'bg-amber-100 text-amber-600',

            label: 'text-amber-700',

            value: 'text-amber-700',
        },

        green: {
            card: 'border-emerald-100 bg-emerald-50/40',

            icon: 'bg-emerald-100 text-emerald-600',

            label: 'text-emerald-700',

            value: 'text-emerald-700',
        },

        purple: {
            card: 'border-violet-100 bg-violet-50/40',

            icon: 'bg-violet-100 text-violet-600',

            label: 'text-violet-700',

            value: 'text-violet-700',
        },
    };

    const style = styles[tone];

    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p
                        className={`text-xs font-black tracking-wide uppercase ${style.label} `}
                    >
                        {label}
                    </p>

                    <p className={`mt-3 text-3xl font-black ${style.value} `}>
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.icon} `}
                >
                    <Icon size={21} />
                </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${style.card} ${active ? 'ring-2 ring-blue-500' : ''} `}
            >
                {content}
            </button>
        );
    }

    return (
        <article className={`rounded-3xl border ${style.card} p-5 shadow-sm`}>
            {content}
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

function StatusBadge({
    label,
    tone,
}: {
    label: string;

    tone: 'green' | 'blue';
}) {
    const style =
        tone === 'green'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-blue-100 text-blue-700';

    return (
        <span
            className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-xs font-black tracking-wide whitespace-nowrap uppercase ${style} `}
        >
            {label}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Info Box
|--------------------------------------------------------------------------
*/

function InfoBox({
    label,
    value,
}: {
    label: string;

    value: string;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                {label}
            </p>

            <p className="mt-1 font-black text-slate-800">{value}</p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({ hasOrders }: { hasOrders: boolean }) {
    return (
        <div className="px-6 py-16 text-center">
            <PackageCheck size={46} className="mx-auto text-slate-300" />

            <h3 className="mt-4 text-lg font-black text-slate-800">
                {hasOrders
                    ? 'No matching orders'
                    : 'No orders waiting for release'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasOrders
                    ? 'Try changing your search.'
                    : 'Paid student orders will appear here when they are ready for Specialist fulfillment.'}
            </p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

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
