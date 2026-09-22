
import {
    Head,
    Link,
    router,
    usePage,
} from '@inertiajs/react';
import {
    Archive,
    ArrowRight,
    CalendarDays,
    ClipboardList,
    LoaderCircle,
    PackageCheck,
    Plus,
    Truck,
    X,
} from 'lucide-react';

import {
    useEffect,
    useState,
} from 'react';


import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface Creator {
    id: number;
    name: string;
}

interface PurchaseOrder {
    id: number;

    po_number: string;

    supplier_name: string;

    supplier_reference_number:
        string | null;

    expected_delivery_date:
        string | null;

    status: string;

    /*
     * The first item's name, and how many more when there is more
     * than one, e.g. "Golden Jacket +4 more" — so a purchase order
     * stays recognizable at a glance without opening it.
     */
    item_summary?:
        string | null;

    /*
    |--------------------------------------------------------------------------
    | Current Controller Sum Fields
    |--------------------------------------------------------------------------
    */

    total_quantity_ordered?:
        number | string | null;

    total_quantity_received?:
        number | string | null;

    /*
    |--------------------------------------------------------------------------
    | Compatibility With Previous Controller Shape
    |--------------------------------------------------------------------------
    */

    total_ordered?:
        number;

    total_received?:
        number;

    total_remaining?:
        number;

    created_by?:
        string | number;

    creator?:
        Creator | null;

    created_at:
        string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPurchaseOrders {
    current_page: number;

    data:
        PurchaseOrder[];

    first_page_url:
        string;

    from:
        number | null;

    last_page:
        number;

    last_page_url:
        string;

    links:
        PaginationLink[];

    next_page_url:
        string | null;

    path:
        string;

    per_page:
        number;

    prev_page_url:
        string | null;

    to:
        number | null;

    total:
        number;
}

interface Filters {
    status: string;
}

interface Props {
    purchaseOrders:
        PaginatedPurchaseOrders
        | PurchaseOrder[];

    filters?: Filters;
}

interface SharedPageProps {
    [key: string]:
        unknown;

    flash?: {
        success?:
            string | null;

        error?:
            string | null;
    };
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({
    purchaseOrders,
    filters,
}: Props) {
    const page =
        usePage<SharedPageProps>();

    const statusFilter =
        filters?.status
        ?? 'all';

    const changeStatusFilter = (
        status: string,
    ): void => {
        router.get(
            '/admin/purchase-orders',
            status === 'all'
                ? {}
                : { status },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const flash =
        page.props.flash;


       const {
    notification,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

        useEffect(() => {
            if (flash?.success) {
                showSuccess(
                    flash.success,
                );

                return;
            }

            if (flash?.error) {
                showError(
                    flash.error,
                );
            }
        }, [
            flash?.success,
            flash?.error,
        ]);

    /*
    |--------------------------------------------------------------------------
    | Support Both Current Pagination + Previous Array Shape
    |--------------------------------------------------------------------------
    */

    const rows:
        PurchaseOrder[] =
        Array.isArray(
            purchaseOrders,
        )
            ? purchaseOrders
            : purchaseOrders.data;

    const pagination =
        Array.isArray(
            purchaseOrders,
        )
            ? null
            : purchaseOrders;

    /*
    |--------------------------------------------------------------------------
    | Archive State
    |--------------------------------------------------------------------------
    */

    const [
        selectedPurchaseOrder,
        setSelectedPurchaseOrder,
    ] =
        useState<
            PurchaseOrder | null
        >(
            null,
        );

    const [
        archiving,
        setArchiving,
    ] =
        useState(
            false,
        );

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    */

    const totalIncoming =
        rows.reduce(
            (
                total,
                purchaseOrder,
            ) =>
                total
                + getRemainingQuantity(
                    purchaseOrder,
                ),
            0,
        );

    const activeOrders =
        rows.filter(
            (
                purchaseOrder,
            ) =>
                purchaseOrder.status
                    === 'ordered'
                || purchaseOrder.status
                    ===
                    'partially_received',
        ).length;

    const completedOrders =
        rows.filter(
            (
                purchaseOrder,
            ) =>
                purchaseOrder.status
                    === 'completed',
        ).length;

    /*
    |--------------------------------------------------------------------------
    | Open Archive Confirmation
    |--------------------------------------------------------------------------
    */

    const openArchiveModal = (
        purchaseOrder:
            PurchaseOrder,
    ): void => {
        if (
            !canArchivePurchaseOrder(
                purchaseOrder,
            )
        ) {
            return;
        }

        setSelectedPurchaseOrder(
            purchaseOrder,
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Close Archive Confirmation
    |--------------------------------------------------------------------------
    */

    const closeArchiveModal =
        (): void => {
            if (
                archiving
            ) {
                return;
            }

            setSelectedPurchaseOrder(
                null,
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Archive Purchase Order
    |--------------------------------------------------------------------------
    */

    const archivePurchaseOrder =
        (): void => {
            if (
                !selectedPurchaseOrder
                || archiving
            ) {
                return;
            }

            setArchiving(
                true,
            );

            router.patch(
                `/admin/purchase-orders/${selectedPurchaseOrder.id}/archive`,
                {},
                {
                    preserveScroll:
                        true,

                    onSuccess:
                        () => {
                            setSelectedPurchaseOrder(
                                null,
                            );
                        },

                    onFinish:
                        () => {
                            setArchiving(
                                false,
                            );
                        },
                },
            );
        };

    return (
        <AdminLayout>
            <Head title="Purchase Orders" />

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
                        sm:flex-row
                        sm:items-end
                        sm:justify-between
                    "
                >
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
                            Purchase Orders
                        </h1>

                        <p
                            className="
                                mt-2
                                text-sm
                                text-slate-500
                            "
                        >
                            Manage supplier
                            purchase orders and
                            monitor incoming
                            merchandise.
                        </p>
                    </div>

                    <div
    className="
        flex
        flex-col
        gap-3
        sm:flex-row
        sm:items-center
    "
>
    <Link
        href="/admin/purchase-orders/archived-items"
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
            shadow-sm
            transition
            hover:border-slate-300
            hover:bg-slate-50
        "
    >
        <Archive
            size={18}
        />

        Archived Items History
    </Link>

    <Link
        href="/admin/purchase-orders/archive"
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
            shadow-sm
            transition
            hover:border-slate-300
            hover:bg-slate-50
        "
    >
        <Archive
            size={18}
        />

        Archived POs
    </Link>

    <Link
        href="/admin/purchase-orders/create"
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
        <Plus
            size={18}
        />

        Create Purchase Order
    </Link>
</div>
                </div>

                {/*
                |--------------------------------------------------------------------------
                | Status Filter
                |--------------------------------------------------------------------------
                */}

                <div
                    className="
                        flex
                        flex-wrap
                        gap-2
                    "
                >
                    <StatusFilterButton
                        active={statusFilter === 'all'}
                        onClick={() => changeStatusFilter('all')}
                    >
                        All
                    </StatusFilterButton>

                    <StatusFilterButton
                        active={statusFilter === 'draft'}
                        onClick={() => changeStatusFilter('draft')}
                    >
                        Draft
                    </StatusFilterButton>

                    <StatusFilterButton
                        active={statusFilter === 'ordered'}
                        onClick={() => changeStatusFilter('ordered')}
                    >
                        Awaiting Delivery
                    </StatusFilterButton>

                    <StatusFilterButton
                        active={statusFilter === 'partially_received'}
                        onClick={() => changeStatusFilter('partially_received')}
                    >
                        Partially Received
                    </StatusFilterButton>

                    <StatusFilterButton
                        active={statusFilter === 'completed'}
                        onClick={() => changeStatusFilter('completed')}
                    >
                        Completed
                    </StatusFilterButton>
                </div>

                {/* Action Notification */}
                    {notification && (
                        <ActionNotification
                            type={notification.type}
                            message={notification.message}
                            onClose={clearNotification}
                        />
                    )}

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
                        label="Active Purchase Orders"
                        value={String(
                            activeOrders,
                        )}
                        description="Ordered or partially received"
                        icon={
                            ClipboardList
                        }
                    />

                    <SummaryCard
                        label="Incoming Units"
                        value={String(
                            totalIncoming,
                        )}
                        description="Units still expected from suppliers"
                        icon={
                            Truck
                        }
                    />

                    <SummaryCard
                        label="Completed POs"
                        value={String(
                            completedOrders,
                        )}
                        description="Fully received purchase orders"
                        icon={
                            PackageCheck
                        }
                    />
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Purchase Order Table
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
                                font-black
                                text-slate-900
                            "
                        >
                            Active Purchase Orders
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Review ordered,
                            received, and remaining
                            quantities. Archived
                            purchase orders are
                            preserved for historical
                            tracking.
                        </p>
                    </div>

                    {rows.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table
                                    className="
                                        w-full
                                        min-w-[1200px]
                                    "
                                >
                                    <thead
                                        className="
                                            bg-slate-50
                                            text-left
                                        "
                                    >
                                        <tr>
                                            <TableHeading>
                                                PO Number
                                            </TableHeading>

                                            <TableHeading>
                                                Supplier
                                            </TableHeading>

                                            <TableHeading>
                                                Expected Delivery
                                            </TableHeading>

                                            <TableHeading>
                                                Ordered
                                            </TableHeading>

                                            <TableHeading>
                                                Received
                                            </TableHeading>

                                            <TableHeading>
                                                Incoming
                                            </TableHeading>

                                            <TableHeading>
                                                Status
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
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map(
                                            (
                                                purchaseOrder,
                                            ) => {
                                                const ordered =
                                                    getOrderedQuantity(
                                                        purchaseOrder,
                                                    );

                                                const received =
                                                    getReceivedQuantity(
                                                        purchaseOrder,
                                                    );

                                                const remaining =
                                                    getRemainingQuantity(
                                                        purchaseOrder,
                                                    );

                                                const canArchive =
                                                    canArchivePurchaseOrder(
                                                        purchaseOrder,
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            purchaseOrder.id
                                                        }
                                                        className="
                                                            border-t
                                                            border-slate-100
                                                        "
                                                    >
                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                            "
                                                        >
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

                                                            {purchaseOrder
                                                                .item_summary && (
                                                                <p
                                                                    className="
                                                                        mt-1
                                                                        text-xs
                                                                        font-semibold
                                                                        text-slate-600
                                                                    "
                                                                >
                                                                    {
                                                                        purchaseOrder.item_summary
                                                                    }
                                                                </p>
                                                            )}

                                                            <p
                                                                className="
                                                                    mt-1
                                                                    text-xs
                                                                    text-slate-400
                                                                "
                                                            >
                                                                {formatDateTime(
                                                                    purchaseOrder.created_at,
                                                                )}
                                                            </p>
                                                        </td>

                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                            "
                                                        >
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
                                                                        purchaseOrder
                                                                            .supplier_reference_number
                                                                    }
                                                                </p>
                                                            )}
                                                        </td>

                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                            "
                                                        >
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
                                                                    size={
                                                                        16
                                                                    }
                                                                    className="text-slate-400"
                                                                />

                                                                {formatDate(
                                                                    purchaseOrder.expected_delivery_date,
                                                                )}
                                                            </div>
                                                        </td>

                                                        <QuantityCell
                                                            value={
                                                                ordered
                                                            }
                                                        />

                                                        <QuantityCell
                                                            value={
                                                                received
                                                            }
                                                        />

                                                        <QuantityCell
                                                            value={
                                                                remaining
                                                            }
                                                            emphasized
                                                        />

                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                            "
                                                        >
                                                            <StatusBadge
                                                                status={
                                                                    purchaseOrder.status
                                                                }
                                                            />
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
                                                            {getCreatorName(
                                                                purchaseOrder,
                                                            )}
                                                        </td>

                                                        <td
                                                            className="
                                                                px-5
                                                                py-4
                                                                text-right
                                                            "
                                                        >
                                                            <div
                                                                className="
                                                                    flex
                                                                    justify-end
                                                                    gap-2
                                                                "
                                                            >
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
                                                                        size={
                                                                            15
                                                                        }
                                                                    />
                                                                </Link>

                                                                <button
                                                                    type="button"
                                                                    disabled={
                                                                        !canArchive
                                                                    }
                                                                    onClick={() =>
                                                                        openArchiveModal(
                                                                            purchaseOrder,
                                                                        )
                                                                    }
                                                                    title={
                                                                        canArchive
                                                                            ? 'Archive purchase order'
                                                                            : getArchiveDisabledReason(
                                                                                purchaseOrder,
                                                                            )
                                                                    }
                                                                    className="
                                                                        inline-flex
                                                                        items-center
                                                                        gap-2
                                                                        rounded-xl
                                                                        bg-red-50
                                                                        px-3
                                                                        py-2
                                                                        text-sm
                                                                        font-black
                                                                        text-red-700
                                                                        transition
                                                                        hover:bg-red-100
                                                                        disabled:cursor-not-allowed
                                                                        disabled:bg-slate-100
                                                                        disabled:text-slate-400
                                                                    "
                                                                >
                                                                    <Archive
                                                                        size={
                                                                            15
                                                                        }
                                                                    />

                                                                    Archive
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {pagination && (
                                <Pagination
                                    pagination={
                                        pagination
                                    }
                                />
                            )}
                        </>
                    ) : (
                        <div
                            className="
                                px-6
                                py-16
                                text-center
                            "
                        >
                            <ClipboardList
                                size={44}
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
                                No active purchase
                                orders
                            </h3>

                            <p
                                className="
                                    mx-auto
                                    mt-2
                                    max-w-md
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                Create a purchase
                                order to begin
                                tracking incoming
                                merchandise.
                            </p>

                            <Link
                                href="/admin/purchase-orders/create"
                                className="
                                    mt-6
                                    inline-flex
                                    items-center
                                    gap-2
                                    rounded-xl
                                    bg-[#0D6EFD]
                                    px-5
                                    py-3
                                    text-sm
                                    font-black
                                    text-white
                                    hover:bg-blue-700
                                "
                            >
                                <Plus
                                    size={17}
                                />

                                Create Purchase Order
                            </Link>
                        </div>
                    )}
                </section>
            </div>

            {/*
            |--------------------------------------------------------------------------
            | Archive Confirmation Modal
            |--------------------------------------------------------------------------
            */}

            {selectedPurchaseOrder && (
                <div
                    className="
                        fixed
                        inset-0
                        z-50
                        flex
                        items-center
                        justify-center
                        bg-slate-950/50
                        p-4
                    "
                >
                    <div
                        className="
                            w-full
                            max-w-lg
                            overflow-hidden
                            rounded-3xl
                            bg-white
                            shadow-2xl
                        "
                    >
                        <div
                            className="
                                flex
                                items-start
                                justify-between
                                gap-4
                                border-b
                                border-slate-100
                                px-6
                                py-5
                            "
                        >
                            <div>
                                <p
                                    className="
                                        text-xs
                                        font-black
                                        uppercase
                                        tracking-wide
                                        text-red-600
                                    "
                                >
                                    Archive Purchase Order
                                </p>

                                <h2
                                    className="
                                        mt-1
                                        text-xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Confirm Archive
                                </h2>
                            </div>

                            <button
                                type="button"
                                disabled={
                                    archiving
                                }
                                onClick={
                                    closeArchiveModal
                                }
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    text-slate-400
                                    transition
                                    hover:bg-slate-100
                                    hover:text-slate-700
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>

                        <div className="p-6">
                            <div
                                className="
                                    flex
                                    h-14
                                    w-14
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-red-100
                                    text-red-600
                                "
                            >
                                <Archive
                                    size={25}
                                />
                            </div>

                            <h3
                                className="
                                    mt-5
                                    text-lg
                                    font-black
                                    text-slate-900
                                "
                            >
                                Archive{' '}
                                {
                                    selectedPurchaseOrder.po_number
                                }
                                ?
                            </h3>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                This purchase order
                                will be removed from
                                the active list, but
                                it will{' '}
                                <strong className="text-slate-700">
                                    not be permanently
                                    deleted
                                </strong>
                                . Its records will
                                remain available for
                                historical tracking.
                            </p>

                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    bg-slate-50
                                    p-4
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
                                    Supplier
                                </p>

                                <p
                                    className="
                                        mt-1
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    {
                                        selectedPurchaseOrder.supplier_name
                                    }
                                </p>
                            </div>

                            <div
                                className="
                                    mt-6
                                    flex
                                    flex-col-reverse
                                    gap-3
                                    sm:flex-row
                                    sm:justify-end
                                "
                            >
                                <button
                                    type="button"
                                    disabled={
                                        archiving
                                    }
                                    onClick={
                                        closeArchiveModal
                                    }
                                    className="
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
                                        disabled:opacity-50
                                    "
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        archiving
                                    }
                                    onClick={
                                        archivePurchaseOrder
                                    }
                                    className="
                                        inline-flex
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        bg-red-600
                                        px-5
                                        py-3
                                        text-sm
                                        font-black
                                        text-white
                                        transition
                                        hover:bg-red-700
                                        disabled:cursor-not-allowed
                                        disabled:opacity-60
                                    "
                                >
                                    {archiving ? (
                                        <>
                                            <LoaderCircle
                                                size={
                                                    17
                                                }
                                                className="animate-spin"
                                            />

                                            Archiving...
                                        </>
                                    ) : (
                                        <>
                                            <Archive
                                                size={
                                                    17
                                                }
                                            />

                                            Archive Purchase Order
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Archive Rules
|--------------------------------------------------------------------------
*/

function canArchivePurchaseOrder(
    purchaseOrder:
        PurchaseOrder,
): boolean {
    if (
        purchaseOrder.status
        === 'partially_received'
    ) {
        return false;
    }

    if (
        purchaseOrder.status
            === 'ordered'
        && getReceivedQuantity(
            purchaseOrder,
        ) > 0
    ) {
        return false;
    }

    return true;
}

function getArchiveDisabledReason(
    purchaseOrder:
        PurchaseOrder,
): string {
    if (
        purchaseOrder.status
        === 'partially_received'
    ) {
        return 'Receiving is still in progress. This PO cannot be archived.';
    }

    if (
        purchaseOrder.status
            === 'ordered'
        && getReceivedQuantity(
            purchaseOrder,
        ) > 0
    ) {
        return 'This PO already has received merchandise.';
    }

    return 'Archive unavailable.';
}

/*
|--------------------------------------------------------------------------
| Quantity Helpers
|--------------------------------------------------------------------------
*/

function getOrderedQuantity(
    purchaseOrder:
        PurchaseOrder,
): number {
    return Number(
        purchaseOrder
            .total_quantity_ordered
        ?? purchaseOrder
            .total_ordered
        ?? 0,
    );
}

function getReceivedQuantity(
    purchaseOrder:
        PurchaseOrder,
): number {
    return Number(
        purchaseOrder
            .total_quantity_received
        ?? purchaseOrder
            .total_received
        ?? 0,
    );
}

function getRemainingQuantity(
    purchaseOrder:
        PurchaseOrder,
): number {
    if (
        purchaseOrder
            .total_remaining
        !== undefined
    ) {
        return Number(
            purchaseOrder
                .total_remaining,
        );
    }

    return Math.max(
        0,
        getOrderedQuantity(
            purchaseOrder,
        )
        - getReceivedQuantity(
            purchaseOrder,
        ),
    );
}

/*
|--------------------------------------------------------------------------
| Creator
|--------------------------------------------------------------------------
*/

function getCreatorName(
    purchaseOrder:
        PurchaseOrder,
): string {
    if (
        purchaseOrder.creator
            ?.name
    ) {
        return purchaseOrder
            .creator
            .name;
    }

    if (
        typeof purchaseOrder
            .created_by
        === 'string'
    ) {
        return purchaseOrder
            .created_by;
    }

    return 'Unknown';
}

/*
|--------------------------------------------------------------------------
| Dates
|--------------------------------------------------------------------------
*/

function formatDate(
    value:
        string | null,
): string {
    if (!value) {
        return 'Not set';
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            month:
                'short',

            day:
                '2-digit',

            year:
                'numeric',
        },
    ).format(
        date,
    );
}

function formatDateTime(
    value:
        string | null,
): string {
    if (!value) {
        return 'Date unavailable';
    }

    const date =
        new Date(
            value,
        );

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            month:
                'short',

            day:
                '2-digit',

            year:
                'numeric',

            hour:
                '2-digit',

            minute:
                '2-digit',
        },
    ).format(
        date,
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

function StatusFilterButton({
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
            className={`
                rounded-xl
                px-4
                py-2.5
                text-xs
                font-bold
                transition

                ${
                    active
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
            `}
        >
            {children}
        </button>
    );
}

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
}: {
    label: string;
    value: string;
    description: string;
    icon:
        typeof ClipboardList;
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

/*
|--------------------------------------------------------------------------
| Table
|--------------------------------------------------------------------------
*/

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
        <td
            className="
                px-5
                py-4
            "
        >
            <span
                className={
                    emphasized
                        ? 'text-base font-black text-blue-700'
                        : 'text-sm font-black text-slate-800'
                }
            >
                {value}
            </span>
        </td>
    );
}

/*
|--------------------------------------------------------------------------
| Status
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function Pagination({
    pagination,
}: {
    pagination:
        PaginatedPurchaseOrders;
}) {
    if (
        pagination.last_page
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
                        pagination.from
                        ?? 0
                    }
                </strong>

                {' '}to{' '}

                <strong>
                    {
                        pagination.to
                        ?? 0
                    }
                </strong>

                {' '}of{' '}

                <strong>
                    {
                        pagination.total
                    }
                </strong>

                {' '}purchase orders
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
                        !pagination
                            .prev_page_url
                    }
                    onClick={() => {
                        if (
                            pagination
                                .prev_page_url
                        ) {
                            router.visit(
                                pagination
                                    .prev_page_url,
                                {
                                    preserveScroll:
                                        true,

                                    preserveState:
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
                        pagination.current_page
                    }{' '}
                    of{' '}
                    {
                        pagination.last_page
                    }
                </span>

                <button
                    type="button"
                    disabled={
                        !pagination
                            .next_page_url
                    }
                    onClick={() => {
                        if (
                            pagination
                                .next_page_url
                        ) {
                            router.visit(
                                pagination
                                    .next_page_url,
                                {
                                    preserveScroll:
                                        true,

                                    preserveState:
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