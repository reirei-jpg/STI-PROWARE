
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    ClipboardList,
    Filter,
    PackageCheck,
    RotateCcw,
    Search,
    UserRound,
} from 'lucide-react';

import type {
    FormEvent} from 'react';
import {
    useState,
} from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface ArchivedPurchaseOrder {
    id: number;
    po_number: string;

    supplier_name: string;
    supplier_reference_number: string | null;

    expected_delivery_date: string | null;
    status: string;

    total_ordered: number;
    total_received: number;
    total_remaining: number;

    created_by: string;
    archived_by: string;

    created_at: string | null;
    archived_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPurchaseOrders {
    current_page: number;
    data: ArchivedPurchaseOrder[];

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

interface Filters {
    period: string;
    date_from: string;
    date_to: string;
}

interface Props {
    purchaseOrders: PaginatedPurchaseOrders;
    filters: Filters;
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function ArchiveIndex({
    purchaseOrders,
    filters,
}: Props) {
    const [
        period,
        setPeriod,
    ] =
        useState(
            filters.period
            || '',
        );

    const [
        dateFrom,
        setDateFrom,
    ] =
        useState(
            filters.date_from
            || '',
        );

    const [
        dateTo,
        setDateTo,
    ] =
        useState(
            filters.date_to
            || '',
        );

    const [
        filtering,
        setFiltering,
    ] =
        useState(
            false,
        );

    /*
    |--------------------------------------------------------------------------
    | Restore Purchase Order
    |--------------------------------------------------------------------------
    */

    const {
        notification,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();

    const [
        purchaseOrderToRestore,
        setPurchaseOrderToRestore,
    ] = useState<ArchivedPurchaseOrder | null>(
        null,
    );

    const [
        restoring,
        setRestoring,
    ] = useState(
        false,
    );

    const confirmRestore = (): void => {
        if (
            !purchaseOrderToRestore
            || restoring
        ) {
            return;
        }

        setRestoring(true);

        router.patch(
            `/admin/purchase-orders/${purchaseOrderToRestore.id}/restore`,
            {},
            {
                preserveScroll: true,

                onSuccess: () => {
                    setPurchaseOrderToRestore(null);

                    showSuccess(
                        'Purchase order restored successfully.',
                    );
                },

                onError: () => {
                    showError(
                        'Purchase order could not be restored. Please try again.',
                    );
                },

                onFinish: () => {
                    setRestoring(false);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Apply Filters
    |--------------------------------------------------------------------------
    */

    const applyFilters = (
        event?: FormEvent,
    ): void => {
        event?.preventDefault();

        setFiltering(
            true,
        );

        router.get(
            '/admin/purchase-orders/archive',
            {
                period:
                    period
                    || undefined,

                date_from:
                    dateFrom
                    || undefined,

                date_to:
                    dateTo
                    || undefined,
            },
            {
                preserveScroll:
                    true,

                preserveState:
                    true,

                replace:
                    true,

                onFinish:
                    () => {
                        setFiltering(
                            false,
                        );
                    },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Quick Period Filter
    |--------------------------------------------------------------------------
    */

    const applyPeriod = (
        value:
            string,
    ): void => {
        setPeriod(
            value,
        );

        setDateFrom(
            '',
        );

        setDateTo(
            '',
        );

        setFiltering(
            true,
        );

        router.get(
            '/admin/purchase-orders/archive',
            value
                ? {
                    period:
                        value,
                }
                : {},
            {
                preserveScroll:
                    true,

                preserveState:
                    true,

                replace:
                    true,

                onFinish:
                    () => {
                        setFiltering(
                            false,
                        );
                    },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Clear Filters
    |--------------------------------------------------------------------------
    */

    const clearFilters =
        (): void => {
            setPeriod(
                '',
            );

            setDateFrom(
                '',
            );

            setDateTo(
                '',
            );

            setFiltering(
                true,
            );

            router.get(
                '/admin/purchase-orders/archive',
                {},
                {
                    preserveScroll:
                        true,

                    replace:
                        true,

                    onFinish:
                        () => {
                            setFiltering(
                                false,
                            );
                        },
                },
            );
        };

    const archivedCount =
        purchaseOrders.total;

    const pageOrdered =
        purchaseOrders
            .data
            .reduce(
                (
                    total,
                    purchaseOrder,
                ) =>
                    total
                    + Number(
                        purchaseOrder
                            .total_ordered
                        || 0,
                    ),
                0,
            );

    const pageReceived =
        purchaseOrders
            .data
            .reduce(
                (
                    total,
                    purchaseOrder,
                ) =>
                    total
                    + Number(
                        purchaseOrder
                            .total_received
                        || 0,
                    ),
                0,
            );

    return (
        <AdminLayout>
            <Head title="Archived Purchase Orders" />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

            <ActionConfirmModal
                open={purchaseOrderToRestore !== null}
                title="Restore Purchase Order?"
                message={`Confirm restoring ${purchaseOrderToRestore?.po_number ?? 'this purchase order'}. It will become active again and appear in the main Purchase Orders list.`}
                confirmText="Restore"
                processingText="Restoring..."
                processing={restoring}
                tone="primary"
                onCancel={() =>
                    setPurchaseOrderToRestore(null)
                }
                onConfirm={confirmRestore}
            />

            <div className="space-y-7">
                {/*
                |--------------------------------------------------------------------------
                | Header
                |--------------------------------------------------------------------------
                */}

                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-end
                        lg:justify-between
                    "
                >
                    <div className="flex items-start gap-4">
                        <Link
                            href="/admin/purchase-orders"
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
                                size={20}
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

                            <div
                                className="
                                    mt-1
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-3
                                "
                            >
                                <h1
                                    className="
                                        text-3xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Archived Purchase Orders
                                </h1>

                                <span
                                    className="
                                        inline-flex
                                        items-center
                                        gap-1.5
                                        rounded-full
                                        bg-slate-900
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-black
                                        text-white
                                    "
                                >
                                    <Archive
                                        size={13}
                                    />

                                    History
                                </span>
                            </div>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Historical purchase orders
                                remain available for tracking
                                and audit purposes.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/admin/purchase-orders"
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-[#0D6EFD]
                            px-5
                            py-3
                            text-sm
                            font-black
                            text-white
                            shadow-lg
                            shadow-blue-500/20
                            transition
                            hover:bg-blue-700
                        "
                    >
                        <ClipboardList
                            size={18}
                        />

                        Active Purchase Orders
                    </Link>
                </div>

                {/*
                |--------------------------------------------------------------------------
                | Summary
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        grid
                        gap-4
                        md:grid-cols-3
                    "
                >
                    <SummaryCard
                        label="Archived POs"
                        value={String(
                            archivedCount,
                        )}
                        description="Total archived purchase orders"
                        icon={
                            Archive
                        }
                    />

                    <SummaryCard
                        label="Ordered Units"
                        value={String(
                            pageOrdered,
                        )}
                        description="Ordered units on this page"
                        icon={
                            ClipboardList
                        }
                    />

                    <SummaryCard
                        label="Received Units"
                        value={String(
                            pageReceived,
                        )}
                        description="Received units on this page"
                        icon={
                            PackageCheck
                        }
                    />
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Filters
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
                            gap-4
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                        "
                    >
                        <div>
                            <div
                                className="
                                    flex
                                    items-center
                                    gap-2
                                "
                            >
                                <Filter
                                    size={18}
                                    className="text-blue-600"
                                />

                                <h2
                                    className="
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Archive Date Filter
                                </h2>
                            </div>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Filter records by this week,
                                this month, or a custom date
                                range.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                flex-wrap
                                gap-2
                            "
                        >
                            <PeriodButton
                                label="All"
                                active={
                                    period === ''
                                    && !dateFrom
                                    && !dateTo
                                }
                                disabled={
                                    filtering
                                }
                                onClick={() =>
                                    applyPeriod(
                                        '',
                                    )
                                }
                            />

                            <PeriodButton
                                label="This Week"
                                active={
                                    period
                                    === 'week'
                                }
                                disabled={
                                    filtering
                                }
                                onClick={() =>
                                    applyPeriod(
                                        'week',
                                    )
                                }
                            />

                            <PeriodButton
                                label="This Month"
                                active={
                                    period
                                    === 'month'
                                }
                                disabled={
                                    filtering
                                }
                                onClick={() =>
                                    applyPeriod(
                                        'month',
                                    )
                                }
                            />
                        </div>
                    </div>

                    <form
                        onSubmit={
                            applyFilters
                        }
                        className="
                            mt-6
                            grid
                            gap-4
                            border-t
                            border-slate-100
                            pt-5
                            md:grid-cols-2
                            xl:grid-cols-[1fr_1fr_auto_auto]
                            xl:items-end
                        "
                    >
                        <div>
                            <label
                                className="
                                    mb-2
                                    block
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-slate-500
                                "
                            >
                                From Date
                            </label>

                            <div className="relative">
                                <CalendarDays
                                    size={17}
                                    className="
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-slate-400
                                    "
                                />

                                <input
                                    type="date"
                                    value={
                                        dateFrom
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setDateFrom(
                                            event
                                                .target
                                                .value,
                                        );

                                        setPeriod(
                                            '',
                                        );
                                    }}
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-300
                                        bg-white
                                        py-3
                                        pl-11
                                        pr-4
                                        text-sm
                                        font-semibold
                                        text-slate-800
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                    "
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                className="
                                    mb-2
                                    block
                                    text-xs
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-slate-500
                                "
                            >
                                To Date
                            </label>

                            <div className="relative">
                                <CalendarDays
                                    size={17}
                                    className="
                                        absolute
                                        left-4
                                        top-1/2
                                        -translate-y-1/2
                                        text-slate-400
                                    "
                                />

                                <input
                                    type="date"
                                    value={
                                        dateTo
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setDateTo(
                                            event
                                                .target
                                                .value,
                                        );

                                        setPeriod(
                                            '',
                                        );
                                    }}
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-300
                                        bg-white
                                        py-3
                                        pl-11
                                        pr-4
                                        text-sm
                                        font-semibold
                                        text-slate-800
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-500/10
                                    "
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={
                                filtering
                            }
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                bg-[#0D6EFD]
                                px-5
                                py-3
                                text-sm
                                font-black
                                text-white
                                transition
                                hover:bg-blue-700
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <Search
                                size={17}
                            />

                            {filtering
                                ? 'Filtering...'
                                : 'Apply Dates'}
                        </button>

                        <button
                            type="button"
                            disabled={
                                filtering
                            }
                            onClick={
                                clearFilters
                            }
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
                                py-3
                                text-sm
                                font-black
                                text-slate-700
                                transition
                                hover:bg-slate-50
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <RotateCcw
                                size={17}
                            />

                            Clear
                        </button>
                    </form>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Table
                |--------------------------------------------------------------------------
                */}

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
                            border-b
                            border-slate-100
                            px-6
                            py-5
                        "
                    >
                        <h2
                            className="
                                text-lg
                                font-black
                                text-slate-900
                            "
                        >
                            Archive History
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Archived records are preserved
                            and can still be opened for
                            review.
                        </p>
                    </div>

                    {purchaseOrders
                        .data
                        .length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table
                                    className="
                                        w-full
                                        min-w-[1350px]
                                    "
                                >
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <TableHeading>
                                                PO Number
                                            </TableHeading>

                                            <TableHeading>
                                                Supplier
                                            </TableHeading>

                                            <TableHeading>
                                                Status
                                            </TableHeading>

                                            <TableHeading>
                                                Ordered
                                            </TableHeading>

                                            <TableHeading>
                                                Received
                                            </TableHeading>

                                            <TableHeading>
                                                Remaining
                                            </TableHeading>

                                            <TableHeading>
                                                Archived By
                                            </TableHeading>

                                            <TableHeading>
                                                Archived At
                                            </TableHeading>

                                            <TableHeading>
                                                Created By
                                            </TableHeading>

                                            <th
                                                className="
                                                    px-5
                                                    py-4
                                                    text-right
                                                    text-xs
                                                    font-black
                                                    uppercase
                                                    tracking-wide
                                                    text-slate-400
                                                "
                                            >
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {purchaseOrders
                                            .data
                                            .map(
                                                (
                                                    purchaseOrder,
                                                ) => (
                                                    <tr
                                                        key={
                                                            purchaseOrder.id
                                                        }
                                                        className="
                                                            border-t
                                                            border-slate-100
                                                            transition
                                                            hover:bg-slate-50/60
                                                        "
                                                    >
                                                        <td className="px-5 py-4">
                                                            <p
                                                                className="
                                                                    font-mono
                                                                    text-sm
                                                                    font-black
                                                                    text-blue-700
                                                                "
                                                            >
                                                                {
                                                                    purchaseOrder.po_number
                                                                }
                                                            </p>

                                                            <p
                                                                className="
                                                                    mt-1
                                                                    text-xs
                                                                    text-slate-400
                                                                "
                                                            >
                                                                Created{' '}
                                                                {
                                                                    purchaseOrder.created_at
                                                                    ?? 'Unknown'
                                                                }
                                                            </p>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <p
                                                                className="
                                                                    font-bold
                                                                    text-slate-900
                                                                "
                                                            >
                                                                {
                                                                    purchaseOrder.supplier_name
                                                                }
                                                            </p>

                                                            {purchaseOrder
                                                                .supplier_reference_number && (
                                                                <p
                                                                    className="
                                                                        mt-1
                                                                        text-xs
                                                                        text-slate-400
                                                                    "
                                                                >
                                                                    Ref:{' '}
                                                                    {
                                                                        purchaseOrder.supplier_reference_number
                                                                    }
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <StatusBadge
                                                                status={
                                                                    purchaseOrder.status
                                                                }
                                                            />
                                                        </td>

                                                        <QuantityCell
                                                            value={
                                                                purchaseOrder.total_ordered
                                                            }
                                                        />

                                                        <QuantityCell
                                                            value={
                                                                purchaseOrder.total_received
                                                            }
                                                        />

                                                        <QuantityCell
                                                            value={
                                                                purchaseOrder.total_remaining
                                                            }
                                                            emphasized
                                                        />

                                                        <td className="px-5 py-4">
                                                            <div
                                                                className="
                                                                    flex
                                                                    items-center
                                                                    gap-2
                                                                    text-sm
                                                                    font-bold
                                                                    text-slate-700
                                                                "
                                                            >
                                                                <UserRound
                                                                    size={16}
                                                                    className="text-slate-400"
                                                                />

                                                                {
                                                                    purchaseOrder.archived_by
                                                                }
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <div
                                                                className="
                                                                    flex
                                                                    items-center
                                                                    gap-2
                                                                    text-sm
                                                                    font-semibold
                                                                    text-slate-700
                                                                "
                                                            >
                                                                <CalendarDays
                                                                    size={16}
                                                                    className="text-slate-400"
                                                                />

                                                                {
                                                                    purchaseOrder.archived_at
                                                                    ?? 'Unknown'
                                                                }
                                                            </div>
                                                        </td>

                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                                text-sm
                                                                font-semibold
                                                                text-slate-700
                                                            "
                                                        >
                                                            {
                                                                purchaseOrder.created_by
                                                            }
                                                        </td>

                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                                text-right
                                                            "
                                                        >
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setPurchaseOrderToRestore(
                                                                            purchaseOrder,
                                                                        )
                                                                    }
                                                                    className="
                                                                        inline-flex
                                                                        items-center
                                                                        gap-2
                                                                        rounded-xl
                                                                        bg-emerald-50
                                                                        px-3
                                                                        py-2
                                                                        text-sm
                                                                        font-black
                                                                        text-emerald-700
                                                                        transition
                                                                        hover:bg-emerald-100
                                                                    "
                                                                >
                                                                    <RotateCcw
                                                                        size={15}
                                                                    />

                                                                    Restore
                                                                </button>

                                                                <Link
                                                                    href={`/admin/purchase-orders/${purchaseOrder.id}`}
                                                                    className="
                                                                        inline-flex
                                                                        items-center
                                                                        gap-2
                                                                        rounded-xl
                                                                        bg-blue-50
                                                                        px-3
                                                                        py-2
                                                                        text-sm
                                                                        font-black
                                                                        text-blue-700
                                                                        transition
                                                                        hover:bg-blue-100
                                                                    "
                                                                >
                                                                    View

                                                                    <ArrowRight
                                                                        size={15}
                                                                    />
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                purchaseOrders={
                                    purchaseOrders
                                }
                            />
                        </>
                    ) : (
                        <div
                            className="
                                px-6
                                py-16
                                text-center
                            "
                        >
                            <Archive
                                size={46}
                                className="
                                    mx-auto
                                    text-slate-300
                                "
                            />

                            <h3
                                className="
                                    mt-4
                                    text-lg
                                    font-black
                                    text-slate-800
                                "
                            >
                                No archived purchase
                                orders found
                            </h3>

                            <p
                                className="
                                    mx-auto
                                    mt-2
                                    max-w-lg
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                There are no archived
                                purchase orders matching the
                                selected date filter.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Components
|--------------------------------------------------------------------------
*/

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
}: {
    label: string;
    value: string;
    description: string;
    icon: typeof Archive;
}) {
    return (
        <article
            className="
                rounded-3xl
                border
                border-slate-200
                bg-white
                p-5
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
                            text-sm
                            font-bold
                            text-slate-600
                        "
                    >
                        {label}
                    </p>

                    <p
                        className="
                            mt-2
                            text-3xl
                            font-black
                            text-slate-950
                        "
                    >
                        {value}
                    </p>

                    <p
                        className="
                            mt-2
                            text-xs
                            leading-5
                            text-slate-400
                        "
                    >
                        {description}
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
                    <Icon
                        size={20}
                    />
                </div>
            </div>
        </article>
    );
}

function PeriodButton({
    label,
    active,
    disabled,
    onClick,
}: {
    label: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={
                disabled
            }
            onClick={
                onClick
            }
            className={`
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-black
                transition
                disabled:cursor-not-allowed
                disabled:opacity-60

                ${
                    active
                        ? 'bg-[#0D6EFD] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
            `}
        >
            {label}
        </button>
    );
}

function TableHeading({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <th
            className="
                px-5
                py-4
                text-left
                text-xs
                font-black
                uppercase
                tracking-wide
                text-slate-400
            "
        >
            {children}
        </th>
    );
}

function QuantityCell({
    value,
    emphasized = false,
}: {
    value: number;
    emphasized?: boolean;
}) {
    return (
        <td className="px-5 py-4">
            <span
                className={
                    emphasized
                        ? 'font-black text-blue-700'
                        : 'font-black text-slate-800'
                }
            >
                {value}
            </span>
        </td>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const config =
        getStatusConfig(
            status,
        );

    return (
        <span
            className={`
                inline-flex
                rounded-full
                px-3
                py-1.5
                text-xs
                font-black
                ${config.className}
            `}
        >
            {config.label}
        </span>
    );
}

function getStatusConfig(
    status: string,
): {
    label: string;
    className: string;
} {
    switch (
        status
    ) {
        case 'ordered':
            return {
                label:
                    'Ordered',

                className:
                    'bg-blue-100 text-blue-700',
            };

        case 'partially_received':
            return {
                label:
                    'Partially Received',

                className:
                    'bg-amber-100 text-amber-700',
            };

        case 'completed':
            return {
                label:
                    'Completed',

                className:
                    'bg-emerald-100 text-emerald-700',
            };

        case 'cancelled':
            return {
                label:
                    'Cancelled',

                className:
                    'bg-red-100 text-red-700',
            };

        default:
            return {
                label:
                    'Draft',

                className:
                    'bg-slate-100 text-slate-700',
            };
    }
}

function Pagination({
    purchaseOrders,
}: {
    purchaseOrders:
        PaginatedPurchaseOrders;
}) {
    if (
        purchaseOrders.last_page
        <= 1
    ) {
        return null;
    }

    return (
        <div
            className="
                flex
                flex-col
                gap-4
                border-t
                border-slate-100
                px-6
                py-5
                sm:flex-row
                sm:items-center
                sm:justify-between
            "
        >
            <p
                className="
                    text-sm
                    text-slate-500
                "
            >
                Showing{' '}

                <strong>
                    {
                        purchaseOrders.from
                        ?? 0
                    }
                </strong>

                {' '}to{' '}

                <strong>
                    {
                        purchaseOrders.to
                        ?? 0
                    }
                </strong>

                {' '}of{' '}

                <strong>
                    {
                        purchaseOrders.total
                    }
                </strong>
            </p>

            <div
                className="
                    flex
                    items-center
                    gap-2
                "
            >
                <button
                    type="button"
                    disabled={
                        !purchaseOrders
                            .prev_page_url
                    }
                    onClick={() => {
                        if (
                            purchaseOrders
                                .prev_page_url
                        ) {
                            router.visit(
                                purchaseOrders
                                    .prev_page_url,
                                {
                                    preserveScroll:
                                        true,
                                },
                            );
                        }
                    }}
                    className="
                        rounded-xl
                        border
                        border-slate-200
                        px-4
                        py-2
                        text-sm
                        font-bold
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                    "
                >
                    Previous
                </button>

                <span
                    className="
                        rounded-xl
                        bg-slate-100
                        px-4
                        py-2
                        text-sm
                        font-bold
                        text-slate-700
                    "
                >
                    Page{' '}
                    {
                        purchaseOrders.current_page
                    }{' '}
                    of{' '}
                    {
                        purchaseOrders.last_page
                    }
                </span>

                <button
                    type="button"
                    disabled={
                        !purchaseOrders
                            .next_page_url
                    }
                    onClick={() => {
                        if (
                            purchaseOrders
                                .next_page_url
                        ) {
                            router.visit(
                                purchaseOrders
                                    .next_page_url,
                                {
                                    preserveScroll:
                                        true,
                                },
                            );
                        }
                    }}
                    className="
                        rounded-xl
                        border
                        border-slate-200
                        px-4
                        py-2
                        text-sm
                        font-bold
                        text-slate-700
                        transition
                        hover:bg-slate-50
                        disabled:cursor-not-allowed
                        disabled:opacity-40
                    "
                >
                    Next
                </button>
            </div>
        </div>
    );
}