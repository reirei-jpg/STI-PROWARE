import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowLeft,
    CalendarClock,
    CalendarDays,
    Clock4,
    LoaderCircle,
    Package,
    PackageCheck,
    ReceiptText,
    Search,
    Truck,
    X,
} from 'lucide-react';


import {   useState } from 'react';
import type {FormEvent, ReactNode} from 'react';

import AwaitingItemsPicker from '@/components/admin/stock-receipts/AwaitingItemsPicker';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

import type { StockReceiptPurchaseOrder } from '@/types/stock-receipt';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface SharedPageProps {
    [key: string]: unknown;

    auth: {
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        } | null;
    };
}

interface ReceiptItem {
    id: number;

    receipt_number: string | null;

    supplier_reference_number: string | null;

    movement_type: string;

    quantity_received: number;

    quantity_before: number;

    quantity_after: number;

    notes: string | null;

    created_at: string | null;

    product: {
        id: number | null;
        code: string;
        name: string;
    };

    variant: {
        id: number | null;
        sku: string;
        program: string | null;
        size: string | null;
        variant_name: string;
    };

    performed_by: {
        id: number | null;
        name: string;
        email: string | null;
    };
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface ReceiptPagination {
    data: ReceiptItem[];

    links: PaginationLink[];

    current_page: number;

    last_page: number;

    from: number | null;

    to: number | null;

    total: number;
}

interface SummaryData {
    total_receipts: number;

    total_units_received: number;

    received_today: number;

    units_received_today: number;
}

interface FilterData {
    search: string;

    date: string;
}

interface PageProps {
    receipts: ReceiptPagination;

    summary: SummaryData;

    filters: FilterData;

    outstandingPurchaseOrders: StockReceiptPurchaseOrder[];
}

type ReceiptTab = 'history' | 'to_be_received';

function todayDateString(): string {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({
    receipts,
    summary,
    filters,
    outstandingPurchaseOrders,
}: PageProps) {
    const [search, setSearch] = useState(filters.search);

    const page = usePage<SharedPageProps>();

    const userRole = page.props.auth.user?.role;

    const isSpecialist = userRole === 'specialist';

    /*
    |--------------------------------------------------------------------------
    | Role-aware Layout
    |--------------------------------------------------------------------------
    */

    const Layout = isSpecialist ? SpecialistLayout : AdminLayout;

    /*
    |--------------------------------------------------------------------------
    | Role-aware Page Content
    |--------------------------------------------------------------------------
    |
    | Admin:
    |
    | - Monitoring only
    | - No Receive Stock action
    |
    | Specialist:
    |
    | - Can monitor receipts
    | - Can start the receiving operation
    |
    */

    const pageTitle = isSpecialist
        ? 'Stock Receipt History'
        : 'Receiving Monitoring';

    const pageDescription = isSpecialist
        ? 'Review previously received merchandise, supplier references, quantity changes, and receiving activity.'
        : 'Monitor merchandise receiving activity, supplier references, stock changes, and the employee responsible for each receipt.';

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    const [date, setDate] = useState(filters.date);

    const applyFilters = (
        nextSearch: string,
        nextDate: string,
        onSuccess?: () => void,
        onFinish?: () => void,
    ): void => {
        router.get(
            '/staff/stock-receipts',
            {
                search: nextSearch.trim() || undefined,

                date: nextDate !== 'all' ? nextDate : undefined,
            },
            {
                preserveScroll: true,

                preserveState: true,

                replace: true,

                onSuccess,

                onFinish,
            },
        );
    };

    const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();

        applyFilters(search, date);
    };

    const clearSearch = (): void => {
        setSearch('');
        setDate('all');

        router.get(
            '/staff/stock-receipts',
            {},
            {
                preserveScroll: true,

                preserveState: true,

                replace: true,
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Summary Card Shortcut
    |--------------------------------------------------------------------------
    |
    | Clicking a summary card is a shortcut for the date filter — it
    | applies immediately and opens a popup with the matching receipts
    | once they've actually loaded, so it never flashes the previous
    | selection's data first.
    */

    const [pendingCard, setPendingCard] = useState<string | null>(null);

    const [receiptModalView, setReceiptModalView] = useState<
        | { type: 'list'; label: string }
        | { type: 'details'; receipt: ReceiptItem; backLabel: string | null }
        | null
    >(null);

    const openCardPreview = (value: string, label: string): void => {
        setPendingCard(value);
        setDate(value);

        applyFilters(
            search,
            value,
            () => setReceiptModalView({ type: 'list', label }),
            () => setPendingCard(null),
        );
    };

    const openReceiptDetails = (receipt: ReceiptItem): void => {
        setReceiptModalView((previous) =>
            previous?.type === 'list'
                ? { type: 'details', receipt, backLabel: previous.label }
                : { type: 'details', receipt, backLabel: null },
        );
    };

    const backToReceiptList = (): void => {
        setReceiptModalView((previous) =>
            previous?.type === 'details' && previous.backLabel
                ? { type: 'list', label: previous.backLabel }
                : null,
        );
    };

    /*
    |--------------------------------------------------------------------------
    | To Be Received Tab
    |--------------------------------------------------------------------------
    |
    | A read-only look at the exact same outstanding-PO data the Receive
    | Stock picker uses, for checking what's still expected without
    | risking navigating into the actual receiving flow. Clicking an item
    | opens a details popup built entirely from data already on this
    | page (no navigation, no extra request), since Specialists don't
    | have permission to open a Purchase Order's own detail page.
    */

    const [activeTab, setActiveTab] = useState<ReceiptTab>(
        () =>
            (typeof window !== 'undefined'
            && new URLSearchParams(window.location.search).get('tab') ===
                'to_be_received'
                ? 'to_be_received'
                : 'history'),
    );

    const today = todayDateString();

    const outstandingSummary = outstandingPurchaseOrders.reduce(
        (totals, purchaseOrder) => {
            for (const item of purchaseOrder.items) {
                if (item.quantity_remaining <= 0) {
                    continue;
                }

                if (!purchaseOrder.expected_delivery_date) {
                    totals.noDate += 1;
                } else if (purchaseOrder.expected_delivery_date < today) {
                    totals.overdue += 1;
                } else if (purchaseOrder.expected_delivery_date === today) {
                    totals.dueToday += 1;
                } else {
                    totals.upcoming += 1;
                }
            }

            return totals;
        },
        { overdue: 0, dueToday: 0, upcoming: 0, noDate: 0 },
    );

    const [
        detailPurchaseOrder,
        setDetailPurchaseOrder,
    ] = useState<StockReceiptPurchaseOrder | null>(null);

    const openPurchaseOrderDetails = (purchaseOrderId: string): void => {
        const purchaseOrder = outstandingPurchaseOrders.find(
            (candidate) => String(candidate.id) === purchaseOrderId,
        );

        setDetailPurchaseOrder(purchaseOrder ?? null);
    };

    return (
        <Layout>
            <Head title={pageTitle} />

            <div className="mx-auto max-w-7xl space-y-7">
                {/*
                |--------------------------------------------------------------------------
                | Header
                |--------------------------------------------------------------------------
                */}

                <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            {pageTitle}
                        </h1>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                            {pageDescription}
                        </p>
                    </div>

                    {/*
                    |--------------------------------------------------------------------------
                    | Specialist Receiving Action
                    |--------------------------------------------------------------------------
                    |
                    | This button is intentionally hidden from Admin.
                    |
                    */}

                    {isSpecialist ? (
                        <Link
                            href="/staff/stock-receipts/create"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                        >
                            <Truck size={18} />
                            Receive Stock
                        </Link>
                    ) : (
                        <Link
                            href="/staff/inventory/movements"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                        >
                            <ArrowDownToLine size={18} />
                            View Stock Movements
                        </Link>
                    )}
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Tabs
                |--------------------------------------------------------------------------
                */}

                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <TabButton
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                    >
                        Receipt History
                    </TabButton>

                    <TabButton
                        active={activeTab === 'to_be_received'}
                        onClick={() => setActiveTab('to_be_received')}
                    >
                        To Be Received
                        {outstandingSummary.overdue
                            + outstandingSummary.dueToday
                            + outstandingSummary.upcoming
                            + outstandingSummary.noDate >
                            0 && (
                            <span className="ml-2 rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-black text-white">
                                {outstandingSummary.overdue
                                    + outstandingSummary.dueToday
                                    + outstandingSummary.upcoming
                                    + outstandingSummary.noDate}
                            </span>
                        )}
                    </TabButton>
                </div>

                {activeTab === 'history' && (
                <>
                {/*
                |--------------------------------------------------------------------------
                | Admin Monitoring Notice
                |--------------------------------------------------------------------------
                */}

                {!isSpecialist && (
                    <section className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                <ReceiptText size={19} />
                            </div>

                            <div>
                                <p className="text-sm font-black text-blue-900">
                                    Receiving Monitoring
                                </p>

                                <p className="mt-1 text-xs leading-5 text-blue-700">
                                    Admin can review receiving records, stock
                                    changes, and employee activity. Physical
                                    merchandise receiving is handled by the
                                    Specialist department.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/*
                |--------------------------------------------------------------------------
                | Summary
                |--------------------------------------------------------------------------
                */}

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title="Total Receipts"
                        value={summary.total_receipts}
                        description="Recorded stock receipt entries"
                        icon={ReceiptText}
                        active={date === 'all'}
                        loading={pendingCard === 'all'}
                        onClick={() => openCardPreview('all', 'All Receipts')}
                    />

                    <SummaryCard
                        title="Units Received"
                        value={summary.total_units_received}
                        description="Total merchandise units received"
                        icon={PackageCheck}
                    />

                    <SummaryCard
                        title="Receipts Today"
                        value={summary.received_today}
                        description="Stock receipt entries created today"
                        icon={CalendarDays}
                        active={date === 'today'}
                        loading={pendingCard === 'today'}
                        onClick={() =>
                            openCardPreview('today', 'Receipts Today')
                        }
                    />

                    <SummaryCard
                        title="Units Today"
                        value={summary.units_received_today}
                        description="Merchandise units received today"
                        icon={ArrowDownToLine}
                    />
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Search
                |--------------------------------------------------------------------------
                */}

                <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-black text-slate-900">
                                Receipt Records
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {receipts.total} receipt record
                                {receipts.total === 1 ? '' : 's'}
                            </p>
                        </div>

                        <form
                            onSubmit={submitSearch}
                            className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"
                        >
                            <div className="relative w-full sm:w-96">
                                <Search
                                    size={18}
                                    className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search receipt, product, variant, supplier, staff..."
                                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />
                            </div>

                            <button
                                type="submit"
                                className="rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                            >
                                Search
                            </button>

                            {filters.search !== '' && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                                >
                                    Clear
                                </button>
                            )}
                        </form>
                    </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Receipt Table
                |--------------------------------------------------------------------------
                */}

                {receipts.data.length > 0 ? (
                    <>
                        <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-slate-100 bg-slate-50 text-left">
                                        <tr>
                                            <TableHeading>Receipt</TableHeading>

                                            <TableHeading>
                                                Merchandise
                                            </TableHeading>

                                            <TableHeading>
                                                Quantity
                                            </TableHeading>

                                            <TableHeading>Date</TableHeading>

                                            <TableHeading>Action</TableHeading>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {receipts.data.map((receipt) => (
                                            <ReceiptRow
                                                key={receipt.id}
                                                receipt={receipt}
                                                onDetails={() =>
                                                    openReceiptDetails(receipt)
                                                }
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <Pagination links={receipts.links} />
                    </>
                ) : (
                    <EmptyState
                        hasSearch={filters.search !== ''}
                        canReceiveStock={isSpecialist}
                    />
                )}
                </>
                )}

                {/*
                |--------------------------------------------------------------------------
                | To Be Received Tab
                |--------------------------------------------------------------------------
                */}

                {activeTab === 'to_be_received' && (
                    <>
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <OutstandingSummaryCard
                                label="Overdue"
                                value={outstandingSummary.overdue}
                                icon={AlertTriangle}
                                tone="red"
                            />

                            <OutstandingSummaryCard
                                label="Due Today"
                                value={outstandingSummary.dueToday}
                                icon={Clock4}
                                tone="amber"
                            />

                            <OutstandingSummaryCard
                                label="Upcoming"
                                value={outstandingSummary.upcoming}
                                icon={CalendarClock}
                                tone="blue"
                            />

                            <OutstandingSummaryCard
                                label="No Date Set"
                                value={outstandingSummary.noDate}
                                icon={CalendarDays}
                                tone="slate"
                            />
                        </section>

                        <AwaitingItemsPicker
                            purchaseOrders={outstandingPurchaseOrders}
                            selectedPurchaseOrderId=""
                            selectedPurchaseOrderItemId=""
                            onSelectItem={(purchaseOrderId) =>
                                openPurchaseOrderDetails(purchaseOrderId)
                            }
                            title="Browse What's Coming"
                            description="A read-only look at everything still awaiting delivery — click any item to see its full purchase order. Nothing here starts a stock receipt; that only happens from Receive Stock."
                            itemActionHint="View details"
                        />
                    </>
                )}
            </div>

            <ReceiptPreviewModal
                view={receiptModalView}
                receipts={receipts}
                onClose={() => setReceiptModalView(null)}
                onBack={backToReceiptList}
                onOpenDetails={openReceiptDetails}
            />

            <PurchaseOrderDetailModal
                purchaseOrder={detailPurchaseOrder}
                onClose={() => setDetailPurchaseOrder(null)}
            />
        </Layout>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

interface SummaryCardProps {
    title: string;

    value: number;

    description: string;

    icon: typeof ReceiptText;

    active?: boolean;

    loading?: boolean;

    onClick?: () => void;
}

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
    active = false,
    loading = false,
    onClick,
}: SummaryCardProps) {
    const content = (
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                    {title}
                </p>

                <p className="mt-3 text-3xl font-black text-slate-900">
                    {value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                    {description}
                </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                {loading ? (
                    <LoaderCircle size={20} className="animate-spin" />
                ) : (
                    <Icon size={20} />
                )}
            </div>
        </div>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                className={`rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait ${active ? 'ring-2 ring-blue-500' : ''} `}
            >
                {content}
            </button>
        );
    }

    return (
        <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            {content}
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Receipt Row
|--------------------------------------------------------------------------
*/

function ReceiptRow({
    receipt,
    onDetails,
}: {
    receipt: ReceiptItem;

    onDetails: () => void;
}) {
    return (
        <tr className="align-top transition hover:bg-slate-50/70">
            {/* Receipt */}
            <td className="px-5 py-5">
                <p className="font-mono text-sm font-black text-blue-700">
                    {receipt.receipt_number ?? 'N/A'}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                    Movement #{receipt.id}
                </p>
            </td>

            {/* Product */}
            <td className="px-5 py-5">
                <p className="text-sm font-black text-slate-900">
                    {receipt.product.name}
                </p>

                <p className="mt-2 text-xs font-semibold text-blue-600">
                    {receipt.variant.variant_name}
                </p>

                <p className="mt-1 font-mono text-[11px] text-slate-400">
                    {receipt.variant.sku}
                </p>
            </td>

            {/* Quantity */}
            <td className="px-5 py-5">
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-black text-emerald-700">
                    +{receipt.quantity_received}
                </span>
            </td>

            {/* Date */}
            <td className="px-5 py-5">
                <p className="text-sm whitespace-nowrap text-slate-600">
                    {receipt.created_at ?? '—'}
                </p>
            </td>

            {/* Details */}
            <td className="px-5 py-5">
                <button
                    type="button"
                    onClick={onDetails}
                    className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                >
                    Details
                </button>
            </td>
        </tr>
    );
}

/*
|--------------------------------------------------------------------------
| Table Heading
|--------------------------------------------------------------------------
*/

function TableHeading({ children }: { children: ReactNode }) {
    return (
        <th className="px-5 py-4 text-xs font-black tracking-wide text-slate-500 uppercase">
            {children}
        </th>
    );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({
    hasSearch,
    canReceiveStock,
}: {
    hasSearch: boolean;

    canReceiveStock: boolean;
}) {
    return (
        <section className="rounded-3xl border border-slate-100 bg-white px-6 py-16 text-center shadow-sm">
            <ReceiptText size={42} className="mx-auto text-slate-300" />

            <h2 className="mt-5 text-xl font-black text-slate-800">
                {hasSearch ? 'No matching receipts' : 'No stock receipts yet'}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {hasSearch
                    ? 'Try another receipt number, product, variant, supplier reference, or staff name.'
                    : canReceiveStock
                      ? 'Stock receipt records will appear here after merchandise is received.'
                      : 'Receiving records will appear here after merchandise is received by the Specialist department.'}
            </p>

            {/*
            |--------------------------------------------------------------------------
            | Specialist-only Receive Stock
            |--------------------------------------------------------------------------
            */}

            {!hasSearch && canReceiveStock && (
                <Link
                    href="/staff/stock-receipts/create"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                >
                    <Truck size={18} />
                    Receive Stock
                </Link>
            )}
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function Pagination({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <div className="flex flex-wrap justify-center gap-2 rounded-3xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
            {links.map((link, index) => {
                const label = link.label
                    .replace('&laquo;', '«')
                    .replace('&raquo;', '»');

                if (!link.url) {
                    return (
                        <span
                            key={index}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-300"
                        >
                            {label}
                        </span>
                    );
                }

                return (
                    <Link
                        key={index}
                        href={link.url}
                        preserveScroll
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                            link.active
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        } `}
                    >
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Receipt Preview Modal
|--------------------------------------------------------------------------
|
| One popup shell for both the Quick View (opened from a summary
| card) and a single receipt's Details — going from the list to a
| details view (and back) swaps the content in place instead of
| closing one popup and opening another. List rows are grouped by
| product, so it is always clear which product/variant a receipt
| belongs to.
*/

function ReceiptPreviewModal({
    view,
    receipts,
    onClose,
    onBack,
    onOpenDetails,
}: {
    view:
        | { type: 'list'; label: string }
        | {
              type: 'details';
              receipt: ReceiptItem;
              backLabel: string | null;
          }
        | null;
    receipts: ReceiptPagination;
    onClose: () => void;
    onBack: () => void;
    onOpenDetails: (receipt: ReceiptItem) => void;
}) {
    if (!view) {
        return null;
    }

    const receipt = view.type === 'details' ? view.receipt : null;

    const listLabel = view.type === 'list' ? view.label : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        {receipt &&
                            view.type === 'details' &&
                            view.backLabel && (
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
                                {receipt ? 'Receipt Details' : 'Quick View'}
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                {receipt
                                    ? (receipt.receipt_number ??
                                      `Movement #${receipt.id}`)
                                    : listLabel}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {receipt
                                    ? (receipt.created_at ?? 'Date unavailable')
                                    : `${receipts.total} record${receipts.total === 1 ? '' : 's'}`}
                            </p>
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
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                    {receipt ? (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                <ReceiptStatBlock
                                    label="Before"
                                    value={receipt.quantity_before}
                                />

                                <ReceiptStatBlock
                                    label="Received"
                                    value={receipt.quantity_received}
                                />

                                <ReceiptStatBlock
                                    label="After"
                                    value={receipt.quantity_after}
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                                    Merchandise
                                </p>

                                <div className="mt-2 space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Product
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {receipt.product.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Product code
                                        </span>
                                        <span className="font-mono font-bold text-slate-800">
                                            {receipt.product.code}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Variant
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {receipt.variant.variant_name}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            SKU
                                        </span>
                                        <span className="font-mono font-bold text-slate-800">
                                            {receipt.variant.sku}
                                        </span>
                                    </div>

                                    {(receipt.variant.program ||
                                        receipt.variant.size) && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-slate-500">
                                                Program / Size
                                            </span>
                                            <span className="font-bold text-slate-800">
                                                {[
                                                    receipt.variant.program,
                                                    receipt.variant.size,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                                    Receiving Information
                                </p>

                                <div className="mt-2 space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Supplier Reference
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {receipt.supplier_reference_number ??
                                                '—'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Received By
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {receipt.performed_by.name}
                                        </span>
                                    </div>

                                    {receipt.performed_by.email && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-slate-500">
                                                Staff Email
                                            </span>
                                            <span className="font-bold text-slate-800">
                                                {receipt.performed_by.email}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between gap-4">
                                        <span className="shrink-0 text-slate-500">
                                            Notes
                                        </span>
                                        <span className="text-right font-bold text-slate-800">
                                            {receipt.notes ?? '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : receipts.data.length > 0 ? (
                        groupReceiptsByProduct(receipts.data).map((group) => (
                            <div key={group.product.code} className="space-y-2">
                                <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5">
                                    <Package
                                        size={16}
                                        className="shrink-0 text-blue-600"
                                    />

                                    <p className="text-lg font-black text-blue-900">
                                        {group.product.name}
                                    </p>

                                    <p className="font-mono text-xs text-blue-500">
                                        {group.product.code}
                                    </p>
                                </div>

                                <div className="space-y-2 pl-2">
                                    {group.rows.map((item) => (
                                        <ReceiptPreviewRow
                                            key={item.id}
                                            receipt={item}
                                            onDetails={() =>
                                                onOpenDetails(item)
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="py-10 text-center text-sm text-slate-500">
                            No receipts in this category.
                        </p>
                    )}
                </div>

                {/* FOOTER */}
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

function ReceiptPreviewRow({
    receipt,
    onDetails,
}: {
    receipt: ReceiptItem;
    onDetails: () => void;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                    {receipt.variant.variant_name}
                    {receipt.variant.size ? ` • ${receipt.variant.size}` : ''}
                </p>

                <p className="mt-0.5 font-mono text-xs text-blue-600">
                    {receipt.variant.sku}
                </p>
            </div>

            <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-700 sm:w-24">
                +{receipt.quantity_received}
            </span>

            <span className="shrink-0 text-xs text-slate-500 sm:w-32 sm:text-right">
                {receipt.created_at ?? '—'}
            </span>

            <button
                type="button"
                onClick={onDetails}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 sm:w-24"
            >
                Details
            </button>
        </div>
    );
}

function ReceiptStatBlock({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                {label}
            </p>

            <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Group By Product
|--------------------------------------------------------------------------
|
| The receipt list is sorted newest-first (not by product), so this
| groups by folding matching products together regardless of their
| position in the list.
*/

function groupReceiptsByProduct(
    rows: ReceiptItem[],
): { product: ReceiptItem['product']; rows: ReceiptItem[] }[] {
    const groups: { product: ReceiptItem['product']; rows: ReceiptItem[] }[] =
        [];

    for (const row of rows) {
        const existingGroup = groups.find(
            (group) => group.product.code === row.product.code,
        );

        if (existingGroup) {
            existingGroup.rows.push(row);
        } else {
            groups.push({ product: row.product, rows: [row] });
        }
    }

    return groups;
}

/*
|--------------------------------------------------------------------------
| Tab Button
|--------------------------------------------------------------------------
*/

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-bold transition ${
                active
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
            }`}
        >
            {children}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Outstanding Summary Card
|--------------------------------------------------------------------------
*/

type OutstandingTone = 'red' | 'amber' | 'blue' | 'slate';

const OUTSTANDING_TONES: Record<
    OutstandingTone,
    { card: string; icon: string; value: string }
> = {
    red: {
        card: 'border-red-200 bg-red-50/60',
        icon: 'bg-red-100 text-red-700',
        value: 'text-red-700',
    },
    amber: {
        card: 'border-amber-200 bg-amber-50/60',
        icon: 'bg-amber-100 text-amber-700',
        value: 'text-amber-700',
    },
    blue: {
        card: 'border-blue-200 bg-blue-50/60',
        icon: 'bg-blue-100 text-blue-700',
        value: 'text-blue-700',
    },
    slate: {
        card: 'border-slate-200 bg-slate-50/60',
        icon: 'bg-slate-100 text-slate-600',
        value: 'text-slate-700',
    },
};

function OutstandingSummaryCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: typeof AlertTriangle;
    tone: OutstandingTone;
}) {
    const style = OUTSTANDING_TONES[tone];

    return (
        <article
            className={`rounded-3xl border p-5 shadow-sm ${style.card}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                        {label}
                    </p>

                    <p className={`mt-3 text-3xl font-black ${style.value}`}>
                        {value}
                    </p>
                </div>

                <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                >
                    <Icon size={20} />
                </div>
            </div>
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Purchase Order Detail Modal
|--------------------------------------------------------------------------
|
| Built entirely from data already loaded on this page — no navigation,
| no extra request — since Specialists don't have permission to open a
| Purchase Order's own detail page (that's an Admin-only screen), and
| this tab is meant to work identically for both roles.
*/

function PurchaseOrderDetailModal({
    purchaseOrder,
    onClose,
}: {
    purchaseOrder: StockReceiptPurchaseOrder | null;
    onClose: () => void;
}) {
    if (!purchaseOrder) {
        return null;
    }

    const outstandingItems = purchaseOrder.items.filter(
        (item) => item.quantity_remaining > 0,
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                            Purchase Order
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-900">
                            {purchaseOrder.po_number}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {purchaseOrder.supplier_name}
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

                {/* BODY */}
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                Expected Delivery
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                                {purchaseOrder.expected_delivery_date
                                    ?? 'Not set'}
                            </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                                Supplier Reference
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">
                                {purchaseOrder.supplier_reference_number
                                    ?? '—'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {outstandingItems.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-slate-100 p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <p className="font-black text-slate-900">
                                        {item.product_name
                                            ?? item.manual_name
                                            ?? 'Purchase Order Item'}
                                    </p>

                                    {item.merchandise_origin === 'new' && (
                                        <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-black tracking-wide text-white uppercase">
                                            New Product
                                        </span>
                                    )}
                                </div>

                                {(item.sku
                                    || item.variant_name
                                    || item.program
                                    || item.size) && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {[
                                            item.sku,
                                            item.variant_name,
                                            item.program,
                                            item.size,
                                        ]
                                            .filter(Boolean)
                                            .join(' • ')}
                                    </p>
                                )}

                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                            Ordered
                                        </p>

                                        <p className="mt-0.5 text-sm font-black text-slate-900">
                                            {item.quantity_ordered}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                            Received
                                        </p>

                                        <p className="mt-0.5 text-sm font-black text-slate-900">
                                            {item.quantity_received}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                                            Remaining
                                        </p>

                                        <p className="mt-0.5 text-sm font-black text-blue-700">
                                            {item.quantity_remaining}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FOOTER */}
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
