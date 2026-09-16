import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Loader2,
    Package,
    PlayCircle,
    Search,
    ShoppingBag,
    UserRound,
    X,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type WaitingStatus = 'waiting' | 'ready' | 'paid' | 'expired';

interface WaitingStudent {
    name: string;
    student_id: string;
    course: string | null;
    year_level: string | null;
}

interface WaitingInventory {
    quantity_on_hand: number;
    quantity_reserved: number;
    available_quantity: number;
    reorder_level: number;
}

interface WaitingItem {
    id: number;
    order_id: number;
    order_number: string;

    product_variant_id: number;

    product_code: string;

    product_name: string;

    variant_name: string;

    sku: string;

    program: string | null;

    size: string | null;

    quantity: number;

    unit_price: string;

    line_total: string;

    student: WaitingStudent;

    inventory: WaitingInventory;

    waiting_status: WaitingStatus;

    created_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface WaitingItemsPagination {
    current_page: number;

    data: WaitingItem[];

    first_page_url: string;

    from: number | null;

    last_page: number;

    last_page_url: string;

    links: PaginationLink[];

    next_page_url: string | null;

    path: string;

    per_page: number;

    prev_page_url: string | null;

    to: number | null;

    total: number;
}

interface WaitingListFilters {
    search: string;

    status: string;
}

interface WaitingListSummary {
    total_entries: number;

    waiting: number;

    ready: number;

    paid: number;

    expired: number;

    total_quantity: number;
}

interface WaitingListPageProps {
    waitingItems: WaitingItemsPagination;

    filters: WaitingListFilters;

    summary: WaitingListSummary;
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({
    waitingItems,
    filters,
    summary,
}: WaitingListPageProps) {
    const { flash, auth } = usePage<{
        flash?: {
            success?: string;
            error?: string;
        };
        auth?: {
            user?: {
                role?: string;
            };
        };
    }>().props;

    const currentRole = auth?.user?.role ?? null;

    const Layout =
        currentRole === 'specialist' ? SpecialistLayout : AdminLayout;

    const [notification, setNotification] = useState<string | null>(null);

    /*
    |--------------------------------------------------------------------------
    | Modal View
    |--------------------------------------------------------------------------
    |
    | A single popup with two views sharing the same shell: 'list'
    | (the Quick View opened from a summary card) and 'details' (a
    | single preorder). Switching between them happens in place —
    | via the back arrow, not by closing one differently-styled
    | popup and opening another — so it stays one continuous window.
    */

    const [modalView, setModalView] = useState<
        | { type: 'list'; status: string; label: string }
        | {
              type: 'details';
              item: WaitingItem;
              backTo: { status: string; label: string } | null;
          }
        | null
    >(null);

    // Which summary card's request is in flight, so it can show a
    // spinner instead of leaving the click feeling unresponsive
    // while the popup waits for the real data before it opens.
    const [pendingCard, setPendingCard] = useState<string | null>(null);

    useEffect(() => {
        if (flash?.success) {
            setNotification(flash.success);

            const timeout = window.setTimeout(() => {
                setNotification(null);
            }, 4000);

            return () => {
                window.clearTimeout(timeout);
            };
        }
    }, [flash?.success]);

    const [search, setSearch] = useState(filters.search ?? '');

    const status = filters.status ?? '';

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            const cleaned = search.trim();

            if (cleaned === (filters.search ?? '')) {
                return;
            }

            router.get(
                '/staff/waiting-list',
                {
                    search: cleaned || undefined,

                    status: status || undefined,
                },
                {
                    preserveState: true,

                    preserveScroll: true,

                    replace: true,
                },
            );
        }, 350);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [search, filters.search, status]);

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    const changeStatus = (
        value: string,
        onSuccess?: () => void,
        onFinish?: () => void,
    ): void => {
        router.get(
            '/staff/waiting-list',
            {
                search: search.trim() || undefined,

                status: value || undefined,
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

    /*
    |--------------------------------------------------------------------------
    | Summary Card Shortcut
    |--------------------------------------------------------------------------
    |
    | Clicking a status card is a shortcut for the equivalent filter
    | button — it applies the filter and opens a self-contained,
    | scrollable preview popup right where you are, instead of
    | jumping or scrolling the page down to the table. The popup only
    | opens once the filtered data has actually arrived, so it never
    | flashes the previous selection's entries first.
    */

    const openCardPreview = (value: string, label: string): void => {
        setPendingCard(value);

        changeStatus(
            value,
            () => {
                setModalView({
                    type: 'list',
                    status: value,
                    label,
                });
            },
            () => {
                setPendingCard(null);
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Details View
    |--------------------------------------------------------------------------
    |
    | Opening details from the Quick View list keeps a "back to list"
    | link; opening it directly from the main table does not, since
    | there is no list to go back to.
    */

    const openDetails = (item: WaitingItem): void => {
        setModalView((previous) =>
            previous?.type === 'list'
                ? {
                      type: 'details',
                      item,
                      backTo: {
                          status: previous.status,
                          label: previous.label,
                      },
                  }
                : { type: 'details', item, backTo: null },
        );
    };

    const backToList = (): void => {
        setModalView((previous) =>
            previous?.type === 'details' && previous.backTo
                ? {
                      type: 'list',
                      status: previous.backTo.status,
                      label: previous.backTo.label,
                  }
                : null,
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const visitPage = (url: string | null): void => {
        if (!url) {
            return;
        }

        router.visit(url, {
            preserveScroll: true,

            preserveState: true,
        });
    };

    return (
        <Layout>
            {notification && (
                <div className="fixed top-6 right-6 z-50">
                    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-lg">
                        <CheckCircle2
                            size={22}
                            className="mt-0.5 shrink-0 text-emerald-600"
                        />

                        <div>
                            <p className="font-black text-emerald-800">
                                Success
                            </p>

                            <p className="mt-1 text-sm font-medium text-emerald-700">
                                {notification}
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <Head title="Waiting List" />

            <div className="mx-auto max-w-7xl space-y-7">
                {/* HEADER */}
                <section>
                    <p className="text-sm font-black tracking-wide text-blue-600 uppercase">
                        STI PROWARE
                    </p>

                    <h1 className="mt-1 text-3xl font-black text-slate-900">
                        Waiting List
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                        Monitor preorder merchandise, student requests, current
                        inventory availability, and entries that are already
                        ready for processing.
                    </p>
                </section>

                {/* SUMMARY */}
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <SummaryCard
                        label="Total Preorders"
                        value={summary.total_entries}
                        description="All preorder entries currently recorded"
                        icon={ShoppingBag}
                        tone="blue"
                        active={status === ''}
                        loading={pendingCard === ''}
                        onClick={() => openCardPreview('', 'All Preorders')}
                    />

                    <SummaryCard
                        label="Waiting"
                        value={summary.waiting}
                        description="Still waiting for enough stock"
                        icon={Clock3}
                        tone="amber"
                        active={status === 'waiting'}
                        loading={pendingCard === 'waiting'}
                        onClick={() => openCardPreview('waiting', 'Waiting')}
                    />

                    <SummaryCard
                        label="Ready"
                        value={summary.ready}
                        description="Stock reserved, not yet paid"
                        icon={CheckCircle2}
                        tone="green"
                        active={status === 'ready'}
                        loading={pendingCard === 'ready'}
                        onClick={() => openCardPreview('ready', 'Ready')}
                    />

                    <SummaryCard
                        label="Paid"
                        value={summary.paid}
                        description="Paid, awaiting release conversion"
                        icon={PlayCircle}
                        tone="blue"
                        active={status === 'paid'}
                        loading={pendingCard === 'paid'}
                        onClick={() => openCardPreview('paid', 'Paid')}
                    />

                    <SummaryCard
                        label="Expired"
                        value={summary.expired}
                        description="Reservation released after the deadline passed"
                        icon={AlertCircle}
                        tone="slate"
                        active={status === 'expired'}
                        loading={pendingCard === 'expired'}
                        onClick={() => openCardPreview('expired', 'Expired')}
                    />

                    <SummaryCard
                        label="Requested Units"
                        value={summary.total_quantity}
                        description="Total quantity requested across all preorders"
                        icon={Package}
                        tone="purple"
                    />
                </section>

                {/* INFO */}
                <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-5">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <Clock3 size={20} />
                        </div>

                        <div>
                            <h2 className="font-black text-blue-950">
                                Preorder Lifecycle
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-blue-800">
                                <strong>Waiting</strong> — not enough stock yet.{' '}
                                <strong>Ready</strong> — stock reserved
                                automatically, student notified to pay.{' '}
                                <strong>Paid</strong> — payment confirmed; it is
                                converted to a normal order automatically, so
                                this should rarely be seen for long.{' '}
                                <strong>Expired</strong> — the payment deadline
                                passed and its reservation was released.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FILTERS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <Search
                                size={18}
                                className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search student, order, product, SKU..."
                                className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <FilterButton
                                active={status === ''}
                                onClick={() => changeStatus('')}
                            >
                                All
                            </FilterButton>

                            <FilterButton
                                active={status === 'waiting'}
                                onClick={() => changeStatus('waiting')}
                            >
                                Waiting
                            </FilterButton>

                            <FilterButton
                                active={status === 'ready'}
                                onClick={() => changeStatus('ready')}
                            >
                                Ready
                            </FilterButton>

                            <FilterButton
                                active={status === 'paid'}
                                onClick={() => changeStatus('paid')}
                            >
                                Paid
                            </FilterButton>

                            <FilterButton
                                active={status === 'expired'}
                                onClick={() => changeStatus('expired')}
                            >
                                Expired
                            </FilterButton>
                        </div>
                    </div>
                </section>

                {/* TABLE */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-black text-slate-900">
                                    Preorder Entries
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {waitingItems.total} record
                                    {waitingItems.total === 1 ? '' : 's'} found
                                </p>
                            </div>

                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ShoppingBag size={20} />
                            </div>
                        </div>
                    </div>

                    {waitingItems.data.length > 0 ? (
                        <>
                            <div className="max-h-140 overflow-x-auto overflow-y-auto">
                                <table className="w-full">
                                    <thead className="sticky top-0 z-10 bg-slate-50">
                                        <tr>
                                            <TableHeader>Student</TableHeader>

                                            <TableHeader>
                                                Product / Variant
                                            </TableHeader>

                                            <TableHeader align="center">
                                                Requested
                                            </TableHeader>

                                            <TableHeader>Status</TableHeader>

                                            <TableHeader align="center">
                                                Actions
                                            </TableHeader>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {waitingItems.data.map((item) => (
                                            <WaitingRow
                                                key={item.id}
                                                item={item}
                                                onDetails={() =>
                                                    openDetails(item)
                                                }
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            <div className="border-t border-slate-100 px-6 py-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-500">
                                        Showing{' '}
                                        <span className="font-bold text-slate-700">
                                            {waitingItems.from ?? 0}
                                        </span>{' '}
                                        to{' '}
                                        <span className="font-bold text-slate-700">
                                            {waitingItems.to ?? 0}
                                        </span>{' '}
                                        of{' '}
                                        <span className="font-bold text-slate-700">
                                            {waitingItems.total}
                                        </span>{' '}
                                        entries
                                    </p>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={
                                                !waitingItems.prev_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    waitingItems.prev_page_url,
                                                )
                                            }
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Previous
                                        </button>

                                        <div className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700">
                                            Page {waitingItems.current_page} of{' '}
                                            {waitingItems.last_page}
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                !waitingItems.next_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    waitingItems.next_page_url,
                                                )
                                            }
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <AlertCircle
                                size={42}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 font-black text-slate-800">
                                No preorder entries found
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Try changing the search or status filter.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <WaitingListModal
                view={modalView}
                waitingItems={waitingItems}
                onClose={() => setModalView(null)}
                onBack={backToList}
                onOpenDetails={openDetails}
                onPageChange={visitPage}
            />
        </Layout>
    );
}

/*
|--------------------------------------------------------------------------
| Waiting Row
|--------------------------------------------------------------------------
*/

function WaitingRow({
    item,
    onDetails,
}: {
    item: WaitingItem;

    onDetails: () => void;
}) {
    return (
        <tr className="align-top transition hover:bg-slate-50/70">
            {/* STUDENT */}
            <td className="px-6 py-5">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <UserRound size={18} />
                    </div>

                    <div>
                        <p className="font-black text-slate-900">
                            {item.student.name}
                        </p>

                        <p className="mt-1 font-mono text-xs text-blue-600">
                            {item.student.student_id}
                        </p>
                    </div>
                </div>
            </td>

            {/* PRODUCT / VARIANT */}
            <td className="px-6 py-5">
                <p className="font-black text-slate-900">{item.product_name}</p>

                <p className="mt-1 text-sm text-slate-600">
                    {item.variant_name}
                </p>

                <p className="mt-1 font-mono text-xs text-slate-400">
                    {item.sku}
                </p>
            </td>

            {/* REQUESTED */}
            <td className="px-6 py-5 text-center whitespace-nowrap">
                <span className="inline-flex min-w-12 items-center justify-center rounded-xl bg-violet-50 px-3 py-2 text-sm font-black text-violet-700">
                    {item.quantity}
                </span>
            </td>

            {/* STATUS */}
            <td className="px-6 py-5 whitespace-nowrap">
                <WaitingStatusBadge status={item.waiting_status} />
            </td>

            {/* ACTIONS */}
            <td className="px-6 py-5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-2">
                    {(item.waiting_status === 'ready' ||
                        item.waiting_status === 'paid') && (
                        <ProcessPreorderButton item={item} />
                    )}

                    <button
                        type="button"
                        onClick={onDetails}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        Details
                    </button>
                </div>
            </td>
        </tr>
    );
}

/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

function WaitingStatusBadge({ status }: { status: WaitingStatus }) {
    if (status === 'paid') {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700">
                <PlayCircle size={14} />
                Paid
            </span>
        );
    }

    if (status === 'expired') {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-600">
                <AlertCircle size={14} />
                Expired
            </span>
        );
    }

    if (status === 'ready') {
        return (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
                <CheckCircle2 size={14} />
                Ready
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-700">
            <Clock3 size={14} />
            Waiting
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone = 'blue' | 'green' | 'amber' | 'purple' | 'slate';

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

    icon: typeof ShoppingBag;

    tone: SummaryTone;

    active?: boolean;

    loading?: boolean;

    onClick?: () => void;
}) {
    const styles: Record<
        SummaryTone,
        {
            card: string;

            icon: string;

            value: string;
        }
    > = {
        blue: {
            card: 'border-blue-100 bg-blue-50/40',

            icon: 'bg-blue-100 text-blue-600',

            value: 'text-blue-700',
        },

        green: {
            card: 'border-emerald-100 bg-emerald-50/40',

            icon: 'bg-emerald-100 text-emerald-600',

            value: 'text-emerald-700',
        },

        amber: {
            card: 'border-amber-100 bg-amber-50/40',

            icon: 'bg-amber-100 text-amber-600',

            value: 'text-amber-700',
        },

        purple: {
            card: 'border-violet-100 bg-violet-50/40',

            icon: 'bg-violet-100 text-violet-600',

            value: 'text-violet-700',
        },

        slate: {
            card: 'border-slate-200 bg-slate-50',

            icon: 'bg-slate-200 text-slate-600',

            value: 'text-slate-700',
        },
    };

    const style = styles[tone];

    const content = (
        <>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black tracking-wide text-slate-500 uppercase">
                        {label}
                    </p>

                    <p className={`mt-3 text-3xl font-black ${style.value} `}>
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.icon} `}
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
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                className={`rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait ${style.card} ${active ? 'ring-2 ring-blue-500' : ''} `}
            >
                {content}
            </button>
        );
    }

    return (
        <article className={`rounded-3xl border p-5 shadow-sm ${style.card} `}>
            {content}
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Filter Button
|--------------------------------------------------------------------------
*/

function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;

    onClick: () => void;

    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                active
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } `}
        >
            {children}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Table Header
|--------------------------------------------------------------------------
*/

function TableHeader({
    children,
    align = 'left',
}: {
    children: React.ReactNode;

    align?: 'left' | 'center';
}) {
    return (
        <th
            className={`px-6 py-4 text-xs font-black tracking-wide text-slate-400 uppercase ${
                align === 'center' ? 'text-center' : 'text-left'
            } `}
        >
            {children}
        </th>
    );
}

/*
|--------------------------------------------------------------------------
| Process Preorder Button
|--------------------------------------------------------------------------
*/

function ProcessPreorderButton({ item }: { item: WaitingItem }) {
    const [processing, setProcessing] = useState(false);

    const processPreorder = (): void => {
        if (processing) {
            return;
        }

        const confirmed = window.confirm(
            `Process preorder ${item.order_number}?\n\n` +
                `${item.product_name} — ${item.variant_name}\n` +
                `Requested quantity: ${item.quantity}\n\n` +
                'Its stock is already reserved. This converts it into a normal order item so it can be released.',
        );

        if (!confirmed) {
            return;
        }

        setProcessing(true);

        router.patch(
            `/staff/waiting-list/${item.id}/process`,
            {},
            {
                preserveScroll: true,

                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    return (
        <button
            type="button"
            onClick={processPreorder}
            disabled={processing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
            <PlayCircle size={15} />

            {processing ? 'Processing...' : 'Process'}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Waiting List Modal
|--------------------------------------------------------------------------
|
| One popup shell for both the Quick View (opened from a summary
| card) and a single preorder's Details — same size, same header and
| footer treatment. Going from the list to a details view (and back)
| swaps the content in place instead of closing one differently
| designed popup and opening another, so it reads as one window.
*/

function WaitingListModal({
    view,
    waitingItems,
    onClose,
    onBack,
    onOpenDetails,
    onPageChange,
}: {
    view:
        | { type: 'list'; status: string; label: string }
        | {
              type: 'details';
              item: WaitingItem;
              backTo: { status: string; label: string } | null;
          }
        | null;
    waitingItems: WaitingItemsPagination;
    onClose: () => void;
    onBack: () => void;
    onOpenDetails: (item: WaitingItem) => void;
    onPageChange: (url: string | null) => void;
}) {
    if (!view) {
        return null;
    }

    const item = view.type === 'details' ? view.item : null;

    const listLabel = view.type === 'list' ? view.label : null;

    const canProcess =
        item !== null &&
        (item.waiting_status === 'ready' || item.waiting_status === 'paid');

    // Ready/paid items already have their own stock set aside —
    // "available" only describes stock nobody has claimed yet, so
    // comparing it against this item's own request would be
    // misleading (it can read 0 purely because this item's own
    // reservation used it up, not because the order lacks stock).
    const hasEnoughStock =
        item !== null && item.inventory.available_quantity >= item.quantity;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-8 py-6">
                    <div className="flex items-center gap-3">
                        {item && view.type === 'details' && view.backTo && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        <div>
                            <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                                {item ? 'Preorder Details' : 'Quick View'}
                            </p>

                            <h2 className="mt-1 text-2xl font-black text-slate-900">
                                {item ? item.order_number : listLabel}
                            </h2>

                            <div className="mt-2">
                                {item ? (
                                    <WaitingStatusBadge
                                        status={item.waiting_status}
                                    />
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        {waitingItems.total} record
                                        {waitingItems.total === 1 ? '' : 's'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                    {item ? (
                        <>
                            {/* PROCESS SUMMARY — everything needed to decide */}
                            <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-6">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                                            <UserRound size={22} />
                                        </div>

                                        <div>
                                            <p className="text-xs font-black tracking-wide text-blue-700 uppercase">
                                                Student
                                            </p>

                                            <p className="mt-1 text-lg font-black text-slate-900">
                                                {item.student.name}
                                            </p>

                                            <p className="font-mono text-xs text-blue-700">
                                                {item.student.student_id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                                            <Package size={22} />
                                        </div>

                                        <div>
                                            <p className="text-xs font-black tracking-wide text-blue-700 uppercase">
                                                Product
                                            </p>

                                            <p className="mt-1 text-lg font-black text-slate-900">
                                                {item.product_name}
                                            </p>

                                            <p className="text-sm text-slate-600">
                                                {item.variant_name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <StatBlock
                                            label="Requested"
                                            value={item.quantity}
                                            tone="violet"
                                        />

                                        {canProcess ? (
                                            <StatBlock
                                                label="Reserved"
                                                value={item.quantity}
                                                tone="green"
                                            />
                                        ) : (
                                            <StatBlock
                                                label="Available"
                                                value={
                                                    item.inventory
                                                        .available_quantity
                                                }
                                                tone={
                                                    hasEnoughStock
                                                        ? 'green'
                                                        : 'amber'
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SECONDARY DETAILS */}
                            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <DetailSection title="Order">
                                    <DetailRow
                                        label="Order ID"
                                        value={`#${item.order_id}`}
                                    />
                                    <DetailRow
                                        label="Date"
                                        value={item.created_at ?? '—'}
                                    />
                                    <DetailRow
                                        label="Course"
                                        value={
                                            item.student.course
                                                ? `${item.student.course}${item.student.year_level ? ` • ${item.student.year_level}` : ''}`
                                                : '—'
                                        }
                                    />
                                </DetailSection>

                                <DetailSection title="Product Codes">
                                    <DetailRow
                                        label="Product code"
                                        value={item.product_code}
                                    />
                                    <DetailRow label="SKU" value={item.sku} />
                                    {item.program && (
                                        <DetailRow
                                            label="Program"
                                            value={item.program}
                                        />
                                    )}
                                    {item.size && (
                                        <DetailRow
                                            label="Size"
                                            value={item.size}
                                        />
                                    )}
                                </DetailSection>

                                <DetailSection title="Inventory">
                                    <DetailRow
                                        label="On hand"
                                        value={String(
                                            item.inventory.quantity_on_hand,
                                        )}
                                    />
                                    <DetailRow
                                        label="Reserved (all orders)"
                                        value={String(
                                            item.inventory.quantity_reserved,
                                        )}
                                    />
                                    <DetailRow
                                        label="Unclaimed"
                                        value={String(
                                            item.inventory.available_quantity,
                                        )}
                                    />
                                    <DetailRow
                                        label="Reorder threshold"
                                        value={String(
                                            item.inventory.reorder_level,
                                        )}
                                    />
                                </DetailSection>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3">
                            {waitingItems.data.length > 0 ? (
                                waitingItems.data.map((row) => (
                                    <CardPreviewRow
                                        key={row.id}
                                        item={row}
                                        onDetails={() => onOpenDetails(row)}
                                    />
                                ))
                            ) : (
                                <p className="py-10 text-center text-sm text-slate-500">
                                    No entries in this category.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-8 py-6">
                    {item ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                            >
                                Close
                            </button>

                            {canProcess && (
                                <ProcessPreorderButton item={item} />
                            )}
                        </>
                    ) : waitingItems.last_page > 1 ? (
                        <div className="flex w-full items-center justify-between gap-4">
                            <button
                                type="button"
                                disabled={!waitingItems.prev_page_url}
                                onClick={() =>
                                    onPageChange(waitingItems.prev_page_url)
                                }
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>

                            <p className="text-sm font-bold text-slate-500">
                                Page {waitingItems.current_page} of{' '}
                                {waitingItems.last_page}
                            </p>

                            <button
                                type="button"
                                disabled={!waitingItems.next_page_url}
                                onClick={() =>
                                    onPageChange(waitingItems.next_page_url)
                                }
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function CardPreviewRow({
    item,
    onDetails,
}: {
    item: WaitingItem;
    onDetails: () => void;
}) {
    const canProcess =
        item.waiting_status === 'ready' || item.waiting_status === 'paid';

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <UserRound size={18} />
                </div>

                <div>
                    <p className="font-black text-slate-900">
                        {item.student.name}
                    </p>

                    <p className="font-mono text-xs text-blue-600">
                        {item.student.student_id}
                    </p>
                </div>
            </div>

            <div className="sm:flex-1 sm:px-4">
                <p className="font-bold text-slate-800">{item.product_name}</p>

                <p className="text-sm text-slate-500">{item.variant_name}</p>
            </div>

            <div className="flex items-center gap-3">
                <span className="inline-flex min-w-10 items-center justify-center rounded-xl bg-violet-50 px-3 py-2 text-sm font-black text-violet-700">
                    {item.quantity}
                </span>

                <WaitingStatusBadge status={item.waiting_status} />
            </div>

            <div className="flex items-center gap-2">
                {canProcess && <ProcessPreorderButton item={item} />}

                <button
                    type="button"
                    onClick={onDetails}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                    Details
                </button>
            </div>
        </div>
    );
}

function StatBlock({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'violet' | 'green' | 'amber';
}) {
    const styles: Record<typeof tone, { box: string; text: string }> = {
        violet: { box: 'bg-violet-50', text: 'text-violet-700' },
        green: { box: 'bg-emerald-50', text: 'text-emerald-700' },
        amber: { box: 'bg-amber-50', text: 'text-amber-700' },
    };

    const style = styles[tone];

    return (
        <div
            className={`flex min-w-20 flex-col items-center rounded-2xl px-5 py-3 ${style.box}`}
        >
            <p
                className={`text-xs font-black tracking-wide uppercase ${style.text}`}
            >
                {label}
            </p>

            <p className={`mt-1 text-2xl font-black ${style.text}`}>{value}</p>
        </div>
    );
}

function DetailSection({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                {title}
            </p>

            <div className="mt-3 space-y-2">{children}</div>
        </div>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-bold text-slate-800">{value}</span>
        </div>
    );
}
