import {
    Archive,
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Filter,
    Image as ImageIcon,
    Package,
    RotateCcw,
    Search,
    UserRound,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
} from '@inertiajs/react';

import {
    FormEvent,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface ArchivedItem {
    id: number;

    purchase_order_id: number;
    po_number: string;
    supplier_name: string;

    item_type: 'catalog' | 'manual';

    product_name: string | null;
    product_code: string | null;
    image_url: string | null;

    sku: string | null;
    variant_name: string | null;
    program: string | null;
    size: string | null;

    manual_name: string | null;
    manual_description: string | null;
    manual_sku: string | null;

    track_inventory: boolean;

    quantity_ordered: number;
    quantity_received: number;

    unit_cost: string | null;

    archived_by: string;
    archived_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedArchivedItems {
    current_page: number;
    data: ArchivedItem[];

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
    archivedItems: PaginatedArchivedItems;
    filters: Filters;
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function ArchivedItems({
    archivedItems,
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

    const applyFilters = (
        event?: FormEvent,
    ): void => {
        event?.preventDefault();

        setFiltering(
            true,
        );

        router.get(
            '/admin/purchase-orders/archived-items',
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
            '/admin/purchase-orders/archived-items',
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
                '/admin/purchase-orders/archived-items',
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

    const totalArchivedItems =
        archivedItems.total;

    const pageOrdered =
        archivedItems
            .data
            .reduce(
                (
                    total,
                    item,
                ) =>
                    total
                    + Number(
                        item.quantity_ordered
                        || 0,
                    ),
                0,
            );

    const pageEstimatedCost =
        archivedItems
            .data
            .reduce(
                (
                    total,
                    item,
                ) =>
                    total
                    + (
                        Number(
                            item.unit_cost
                            ?? 0,
                        )
                        * Number(
                            item.quantity_ordered
                            || 0,
                        )
                    ),
                0,
            );

    return (
        <AdminLayout>
            <Head title="Archived PO Items" />

            <div className="space-y-7">
                {/* HEADER */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
                            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                                STI PROWARE
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-black text-slate-900">
                                    Archived PO Items
                                </h1>

                                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white">
                                    <Archive
                                        size={13}
                                    />

                                    Item History
                                </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                                Central history of individual
                                purchase-order items archived
                                instead of permanently deleted.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
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
                                hover:bg-slate-50
                            "
                        >
                            <Archive
                                size={17}
                            />

                            Archived POs
                        </Link>

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
                            <Package
                                size={17}
                            />

                            Active POs
                        </Link>
                    </div>
                </div>

                {/* SUMMARY */}
                <section className="grid gap-4 md:grid-cols-3">
                    <SummaryCard
                        label="Archived Items"
                        value={String(
                            totalArchivedItems,
                        )}
                        description="Total individually archived PO items"
                        icon={
                            Archive
                        }
                    />

                    <SummaryCard
                        label="Ordered Units"
                        value={String(
                            pageOrdered,
                        )}
                        description="Ordered quantity on this page"
                        icon={
                            Package
                        }
                    />

                    <SummaryCard
                        label="Estimated Cost"
                        value={
                            pageEstimatedCost > 0
                                ? formatCurrency(
                                    pageEstimatedCost,
                                )
                                : 'Not set'
                        }
                        description="Based on unit cost of archived items"
                        icon={
                            Package
                        }
                    />
                </section>

                {/* FILTERS */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Filter
                                    size={18}
                                    className="text-blue-600"
                                />

                                <h2 className="font-black text-slate-900">
                                    Archive Date Filter
                                </h2>
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                                Filter archived items by this
                                week, this month, or a custom
                                date range.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
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
                        <DateField
                            label="From Date"
                            value={
                                dateFrom
                            }
                            onChange={(
                                value,
                            ) => {
                                setDateFrom(
                                    value,
                                );

                                setPeriod(
                                    '',
                                );
                            }}
                        />

                        <DateField
                            label="To Date"
                            value={
                                dateTo
                            }
                            onChange={(
                                value,
                            ) => {
                                setDateTo(
                                    value,
                                );

                                setPeriod(
                                    '',
                                );
                            }}
                        />

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

                {/* TABLE */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-6 py-5">
                        <h2 className="text-lg font-black text-slate-900">
                            Archived Items History
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Every row is preserved for
                            historical tracking. There is
                            no permanent delete from this
                            page.
                        </p>
                    </div>

                    {archivedItems
                        .data
                        .length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1500px]">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <TableHeading>
                                                Item
                                            </TableHeading>

                                            <TableHeading>
                                                PO Number
                                            </TableHeading>

                                            <TableHeading>
                                                Supplier
                                            </TableHeading>

                                            <TableHeading>
                                                Ordered
                                            </TableHeading>

                                            <TableHeading>
                                                Received
                                            </TableHeading>

                                            <TableHeading>
                                                Unit Cost
                                            </TableHeading>

                                            <TableHeading>
                                                Archived By
                                            </TableHeading>

                                            <TableHeading>
                                                Archived At
                                            </TableHeading>

                                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {archivedItems
                                            .data
                                            .map(
                                                (
                                                    item,
                                                ) => (
                                                    <tr
                                                        key={
                                                            item.id
                                                        }
                                                        className="border-t border-slate-100 transition hover:bg-slate-50/60"
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <ItemImage
                                                                    src={
                                                                        item.image_url
                                                                    }
                                                                    alt={
                                                                        getItemName(
                                                                            item,
                                                                        )
                                                                    }
                                                                />

                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span
                                                                            className={`
                                                                                rounded-full
                                                                                px-2
                                                                                py-1
                                                                                text-[9px]
                                                                                font-black
                                                                                uppercase

                                                                                ${
                                                                                    item.item_type
                                                                                    === 'catalog'
                                                                                        ? 'bg-blue-100 text-blue-700'
                                                                                        : 'bg-violet-100 text-violet-700'
                                                                                }
                                                                            `}
                                                                        >
                                                                            {
                                                                                item.item_type
                                                                            }
                                                                        </span>

                                                                        {item.track_inventory && (
                                                                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">
                                                                                Inventory
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <p className="mt-2 max-w-xs truncate font-black text-slate-900">
                                                                        {
                                                                            getItemName(
                                                                                item,
                                                                            )
                                                                        }
                                                                    </p>

                                                                    {getItemVariant(
                                                                        item,
                                                                    ) && (
                                                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                                                            {
                                                                                getItemVariant(
                                                                                    item,
                                                                                )
                                                                            }
                                                                        </p>
                                                                    )}

                                                                    {item.sku && (
                                                                        <p className="mt-1 font-mono text-xs font-bold text-slate-400">
                                                                            SKU:{' '}
                                                                            {
                                                                                item.sku
                                                                            }
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <p className="font-mono text-sm font-black text-blue-700">
                                                                {
                                                                    item.po_number
                                                                }
                                                            </p>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <p className="font-bold text-slate-800">
                                                                {
                                                                    item.supplier_name
                                                                }
                                                            </p>
                                                        </td>

                                                        <QuantityCell
                                                            value={
                                                                item.quantity_ordered
                                                            }
                                                        />

                                                        <QuantityCell
                                                            value={
                                                                item.quantity_received
                                                            }
                                                        />

                                                        <td className="px-5 py-4 text-sm font-black text-slate-800">
                                                            {item.unit_cost
                                                                ? formatCurrency(
                                                                    Number(
                                                                        item.unit_cost,
                                                                    ),
                                                                )
                                                                : 'Not set'}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                                <UserRound
                                                                    size={16}
                                                                    className="text-slate-400"
                                                                />

                                                                {
                                                                    item.archived_by
                                                                }
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                                <CalendarDays
                                                                    size={16}
                                                                    className="text-slate-400"
                                                                />

                                                                {
                                                                    item.archived_at
                                                                    ?? 'Unknown'
                                                                }
                                                            </div>
                                                        </td>

                                                        <td className="px-5 py-4 text-right">
                                                            <Link
                                                                href={`/admin/purchase-orders/${item.purchase_order_id}`}
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
                                                                View PO

                                                                <ArrowRight
                                                                    size={15}
                                                                />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                archivedItems={
                                    archivedItems
                                }
                            />
                        </>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <Archive
                                size={46}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 text-lg font-black text-slate-800">
                                No archived PO items found
                            </h3>

                            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                                Individually archived PO
                                items will appear here after
                                an Admin archives a saved
                                line item.
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
| Helpers
|--------------------------------------------------------------------------
*/

function getItemName(
    item:
        ArchivedItem,
): string {
    return (
        item.product_name
        ?? item.manual_name
        ?? 'Purchase Order Item'
    );
}

function getItemVariant(
    item:
        ArchivedItem,
): string | null {
    if (
        item.item_type
        !== 'catalog'
    ) {
        return null;
    }

    const fallback =
        [
            item.program,
            item.size,
        ]
            .filter(
                Boolean,
            )
            .join(
                ' / ',
            );

    return (
        item.variant_name
        ?? (
            fallback
                ? fallback
                : null
        )
    );
}

function formatCurrency(
    amount: number,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style:
                'currency',

            currency:
                'PHP',
        },
    ).format(
        amount,
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
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-600">
                        {label}
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {value}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                        {description}
                    </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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

function DateField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (
        value: string,
    ) => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                {label}
            </label>

            <div className="relative">
                <CalendarDays
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                    type="date"
                    value={
                        value
                    }
                    onChange={(
                        event,
                    ) =>
                        onChange(
                            event
                                .target
                                .value,
                        )
                    }
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
    );
}

function TableHeading({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
            {children}
        </th>
    );
}

function QuantityCell({
    value,
}: {
    value: number;
}) {
    return (
        <td className="px-5 py-4">
            <span className="text-sm font-black text-slate-800">
                {value}
            </span>
        </td>
    );
}

function ItemImage({
    src,
    alt,
}: {
    src: string | null;
    alt: string;
}) {
    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="h-full w-full object-cover"
                />
            ) : (
                <ImageIcon
                    size={20}
                    className="text-slate-300"
                />
            )}
        </div>
    );
}

function Pagination({
    archivedItems,
}: {
    archivedItems:
        PaginatedArchivedItems;
}) {
    if (
        archivedItems.last_page
        <= 1
    ) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Showing{' '}

                <strong>
                    {
                        archivedItems.from
                        ?? 0
                    }
                </strong>

                {' '}to{' '}

                <strong>
                    {
                        archivedItems.to
                        ?? 0
                    }
                </strong>

                {' '}of{' '}

                <strong>
                    {
                        archivedItems.total
                    }
                </strong>

                {' '}items
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={
                        !archivedItems
                            .prev_page_url
                    }
                    onClick={() => {
                        if (
                            archivedItems
                                .prev_page_url
                        ) {
                            router.visit(
                                archivedItems
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

                <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    Page{' '}
                    {
                        archivedItems.current_page
                    }{' '}
                    of{' '}
                    {
                        archivedItems.last_page
                    }
                </span>

                <button
                    type="button"
                    disabled={
                        !archivedItems
                            .next_page_url
                    }
                    onClick={() => {
                        if (
                            archivedItems
                                .next_page_url
                        ) {
                            router.visit(
                                archivedItems
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