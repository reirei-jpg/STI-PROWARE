import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    History,
    Loader2,
    PackageCheck,
    Search,
    ShoppingBag,
    UserRound,
    X,
} from 'lucide-react';
import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import SpecialistLayout from '@/layouts/SpecialistLayout';

import specialist from '@/routes/specialist';

interface ReleaseItem {
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

interface StudentInfo {
    name: string;
    student_id: string;
}

interface ReleasedBy {
    name: string;
    email: string | null;
    role: string;
}

interface ReleaseOrder {
    id: number;
    order_number: string;
    order_type: string;
    released_at: string | null;
    release_qr_used_at: string | null;
    student: StudentInfo;
    released_by: ReleasedBy;
    items: ReleaseItem[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedOrders {
    data: ReleaseOrder[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Filters {
    search: string;
    date: string;
    type: string;
}

interface ReleaseSummary {
    total: number;
    today: number;
    week: number;
}

interface PageProps {
    orders: PaginatedOrders;
    filters: Filters;
    summary: ReleaseSummary;
}

export default function Index({ orders, filters, summary }: PageProps) {
    const [search, setSearch] = useState(filters.search ?? '');

    const [date, setDate] = useState(filters.date ?? 'all');

    const [type, setType] = useState(filters.type ?? 'all');

    /*
    |--------------------------------------------------------------------------
    | Filters
    |--------------------------------------------------------------------------
    */

    const applyFilters = (
        nextSearch: string,
        nextDate: string,
        nextType: string,
        onSuccess?: () => void,
        onFinish?: () => void,
    ): void => {
        router.get(
            specialist.releases.index.url(),
            {
                search: nextSearch || undefined,
                date: nextDate !== 'all' ? nextDate : undefined,
                type: nextType !== 'all' ? nextType : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onSuccess,
                onFinish,
            },
        );
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            applyFilters(search, date, type);
        }, 400);

        return () => window.clearTimeout(timer);
    }, [search, date, type, filters.search]);

    const changeDate = (value: string) => {
        setDate(value);
        applyFilters(search, value, type);
    };

    const changeType = (value: string) => {
        setType(value);
        applyFilters(search, date, value);
    };

    const clearFilters = () => {
        setSearch('');
        setDate('all');
        setType('all');

        router.get(
            specialist.releases.index.url(),
            {},
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const hasFilters = search !== '' || date !== 'all' || type !== 'all';

    /*
    |--------------------------------------------------------------------------
    | Summary Card Shortcut
    |--------------------------------------------------------------------------
    |
    | Clicking a summary card is a shortcut for its date filter. The
    | list is server-paginated, so — like the Waiting List page — the
    | popup only opens once the filtered page has actually loaded,
    | never showing the previous selection's entries first.
    */

    const [pendingCard, setPendingCard] = useState<string | null>(null);

    const [cardPreview, setCardPreview] = useState<{
        label: string;
    } | null>(null);

    const openCardPreview = (value: string, label: string): void => {
        setPendingCard(value);
        setDate(value);

        applyFilters(
            search,
            value,
            type,
            () => setCardPreview({ label }),
            () => setPendingCard(null),
        );
    };

    return (
        <SpecialistLayout>
            <Head title="Release History" />

            <div className="mx-auto w-full max-w-7xl space-y-6">
                {/* HEADER */}
                <section>
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#0D6EFD]">
                            <History size={22} />
                        </div>

                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                Release History
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Trace merchandise that has been physically
                                released to students.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SUMMARY */}
                <section className="grid gap-4 sm:grid-cols-3">
                    <SummaryCard
                        label="Total Released"
                        value={summary.total}
                        description="All merchandise released to students"
                        icon={History}
                        tone="blue"
                        active={date === 'all'}
                        loading={pendingCard === 'all'}
                        onClick={() => openCardPreview('all', 'Total Released')}
                    />

                    <SummaryCard
                        label="Released Today"
                        value={summary.today}
                        description="Released so far today"
                        icon={CalendarDays}
                        tone="amber"
                        active={date === 'today'}
                        loading={pendingCard === 'today'}
                        onClick={() =>
                            openCardPreview('today', 'Released Today')
                        }
                    />

                    <SummaryCard
                        label="Released This Week"
                        value={summary.week}
                        description="Released since the start of this week"
                        icon={Clock3}
                        tone="green"
                        active={date === 'week'}
                        loading={pendingCard === 'week'}
                        onClick={() =>
                            openCardPreview('week', 'Released This Week')
                        }
                    />
                </section>

                {/* INFORMATION */}
                <section className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <PackageCheck
                            size={20}
                            className="mt-0.5 shrink-0 text-blue-600"
                        />

                        <div>
                            <p className="text-sm font-black text-slate-900">
                                Released Merchandise Records
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                Only completed releases are shown here. Open a
                                record to see the merchandise, verification
                                time, and Specialist who performed the release.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SEARCH + FILTERS */}
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <div className="relative flex-1">
                            <Search
                                size={18}
                                className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search order, student, ID, product or SKU..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 pl-11 text-sm font-medium text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                            />
                        </div>

                        <select
                            value={date}
                            onChange={(event) => changeDate(event.target.value)}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>

                        <select
                            value={type}
                            onChange={(event) => changeType(event.target.value)}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"
                        >
                            <option value="all">All Types</option>
                            <option value="order">Normal Order</option>
                            <option value="preorder">Preorder</option>
                        </select>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="h-11 rounded-xl px-4 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </section>

                {/* RESULT HEADER */}
                <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Released Orders
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Newest releases are shown first.
                        </p>
                    </div>

                    <p className="text-sm font-bold text-slate-500">
                        {orders.total}{' '}
                        {orders.total === 1 ? 'record' : 'records'}
                    </p>
                </section>

                {/* HISTORY */}
                {orders.data.length > 0 ? (
                    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {orders.data.map((order) => (
                            <ReleaseCard key={order.id} order={order} />
                        ))}
                    </section>
                ) : (
                    <EmptyState filtered={hasFilters} />
                )}

                {/* PAGINATION */}
                {orders.last_page > 1 && <ReleasePagination orders={orders} />}
            </div>

            <ReleasePreviewModal
                preview={cardPreview}
                orders={orders}
                onClose={() => setCardPreview(null)}
            />
        </SpecialistLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Release Card
|--------------------------------------------------------------------------
*/

function ReleaseCard({ order }: { order: ReleaseOrder }) {
    const [imageFailed, setImageFailed] = useState(false);

    const isPreorder = order.order_type === 'preorder';

    const totalQuantity = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
    );

    const firstItem = order.items[0];

    const firstItemName = firstItem?.product_name ?? 'Merchandise';

    const extraItemCount = Math.max(order.items.length - 1, 0);

    return (
        <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-md">
            <div className="flex-1 p-5">
                <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-black text-blue-600">
                        {order.order_number}
                    </p>

                    <span
                        className={`rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-violet-700 uppercase ${isPreorder ? '' : 'invisible'}`}
                    >
                        Preorder
                    </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <CalendarDays size={13} />
                    Released{' '}
                    <span className="font-bold text-slate-700">
                        {order.released_at ?? 'Date unavailable'}
                    </span>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <UserRound size={18} className="shrink-0 text-blue-600" />

                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                            {order.student.name}
                        </p>

                        <p className="text-xs text-slate-500">
                            {order.student.student_id}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        {firstItem?.image_url && !imageFailed ? (
                            <img
                                src={firstItem.image_url}
                                alt={firstItemName}
                                className="h-full w-full object-contain p-0.5"
                                onError={() => setImageFailed(true)}
                            />
                        ) : (
                            <ShoppingBag size={18} className="text-slate-300" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                            Merchandise
                        </p>

                        <p className="mt-1 truncate text-sm font-bold text-slate-800">
                            {firstItemName}
                            {extraItemCount > 0 &&
                                ` + ${extraItemCount} more item${extraItemCount === 1 ? '' : 's'}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            {totalQuantity}{' '}
                            {totalQuantity === 1 ? 'unit' : 'units'} released
                        </p>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-100 p-5">
                <Link
                    href={specialist.releases.show.url(order.id)}
                    className="flex w-full items-center justify-center rounded-xl bg-[#0D6EFD] px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
                >
                    View Details
                </Link>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Release Preview Modal
|--------------------------------------------------------------------------
|
| Clicking a summary card is a shortcut for its date filter. It opens
| this popup with the matching releases, scrollable inside its own
| fixed-height container.
*/

function ReleasePreviewModal({
    preview,
    orders,
    onClose,
}: {
    preview: { label: string } | null;
    orders: PaginatedOrders;
    onClose: () => void;
}) {
    if (!preview) {
        return null;
    }

    const visitPage = (url: string | null): void => {
        if (!url) {
            return;
        }

        router.visit(url, { preserveScroll: true, preserveState: true });
    };

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
                            {orders.total} record
                            {orders.total === 1 ? '' : 's'}
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
                    {orders.data.length > 0 ? (
                        orders.data.map((order) => (
                            <ReleasePreviewRow key={order.id} order={order} />
                        ))
                    ) : (
                        <p className="py-10 text-center text-sm text-slate-500">
                            No releases in this category.
                        </p>
                    )}
                </div>

                {orders.last_page > 1 && (
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
                        <button
                            type="button"
                            disabled={!orders.prev_page_url}
                            onClick={() => visitPage(orders.prev_page_url)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>

                        <p className="text-sm font-bold text-slate-500">
                            Page {orders.current_page} of {orders.last_page}
                        </p>

                        <button
                            type="button"
                            disabled={!orders.next_page_url}
                            onClick={() => visitPage(orders.next_page_url)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                )}

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

function ReleasePreviewRow({ order }: { order: ReleaseOrder }) {
    const isPreorder = order.order_type === 'preorder';

    const totalQuantity = order.items.reduce(
        (total, item) => total + item.quantity,
        0,
    );

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
                    {totalQuantity} {totalQuantity === 1 ? 'unit' : 'units'}
                </span>
            </div>

            <Link
                href={specialist.releases.show.url(order.id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
            >
                Details
            </Link>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function ReleasePagination({ orders }: { orders: PaginatedOrders }) {
    return (
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">
                Showing {orders.from ?? 0}
                {' – '}
                {orders.to ?? 0}
                {' of '}
                {orders.total}
            </p>

            <div className="flex items-center gap-2">
                {orders.prev_page_url ? (
                    <Link
                        href={orders.prev_page_url}
                        preserveScroll
                        preserveState
                        className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        <ChevronLeft size={15} />
                        Previous
                    </Link>
                ) : (
                    <button
                        disabled
                        className="flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs font-bold text-slate-300"
                    >
                        <ChevronLeft size={15} />
                        Previous
                    </button>
                )}

                <span className="px-2 text-xs font-black text-slate-600">
                    {orders.current_page}
                    {' / '}
                    {orders.last_page}
                </span>

                {orders.next_page_url ? (
                    <Link
                        href={orders.next_page_url}
                        preserveScroll
                        preserveState
                        className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                        Next
                        <ChevronRight size={15} />
                    </Link>
                ) : (
                    <button
                        disabled
                        className="flex h-9 cursor-not-allowed items-center gap-1 rounded-lg border border-slate-100 px-3 text-xs font-bold text-slate-300"
                    >
                        Next
                        <ChevronRight size={15} />
                    </button>
                )}
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone = 'blue' | 'amber' | 'green';

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    tone,
    active = false,
    loading = false,
    onClick,
}: {
    label: string;
    value: number;
    description: string;
    icon: typeof History;
    tone: SummaryTone;
    active?: boolean;
    loading?: boolean;
    onClick?: () => void;
}) {
    const styles: Record<
        SummaryTone,
        { card: string; icon: string; value: string }
    > = {
        blue: {
            card: 'border-blue-100 bg-blue-50/40',
            icon: 'bg-blue-100 text-blue-600',
            value: 'text-blue-700',
        },
        amber: {
            card: 'border-amber-100 bg-amber-50/40',
            icon: 'bg-amber-100 text-amber-600',
            value: 'text-amber-700',
        },
        green: {
            card: 'border-emerald-100 bg-emerald-50/40',
            icon: 'bg-emerald-100 text-emerald-600',
            value: 'text-emerald-700',
        },
    };

    const style = styles[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait ${style.card} ${active ? 'ring-2 ring-blue-500' : ''}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black tracking-wide text-slate-500 uppercase">
                        {label}
                    </p>

                    <p className={`mt-3 text-3xl font-black ${style.value}`}>
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.icon}`}
                >
                    {loading ? (
                        <Loader2 size={21} className="animate-spin" />
                    ) : (
                        <Icon size={21} />
                    )}
                </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({ filtered }: { filtered: boolean }) {
    return (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <PackageCheck size={34} className="mx-auto text-slate-300" />

            <h3 className="mt-4 font-black text-slate-800">
                {filtered ? 'No matching releases' : 'No release history yet'}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {filtered
                    ? 'Try changing your search or filters.'
                    : 'Orders will appear here after merchandise has been physically released to a student.'}
            </p>
        </section>
    );
}
