import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    Package,
    PlayCircle,
    Search,
    ShoppingBag,
    UserRound,
} from 'lucide-react';

import {
    Head,
    router,
    usePage,
} from '@inertiajs/react';

import {
    useEffect,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type WaitingStatus =
    | 'waiting'
    | 'ready';

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

    product_variant_id:
        number;

    product_code:
        string;

    product_name:
        string;

    variant_name:
        string;

    sku:
        string;

    program:
        string | null;

    size:
        string | null;

    quantity:
        number;

    unit_price:
        string;

    line_total:
        string;

    student:
        WaitingStudent;

    inventory:
        WaitingInventory;

    waiting_status:
        WaitingStatus;

    created_at:
        string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface WaitingItemsPagination {
    current_page:
        number;

    data:
        WaitingItem[];

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

interface WaitingListFilters {
    search:
        string;

    status:
        string;
}

interface WaitingListSummary {
    total_entries:
        number;

    waiting:
        number;

    ready:
        number;

    total_quantity:
        number;
}

interface WaitingListPageProps {
    waitingItems:
        WaitingItemsPagination;

    filters:
        WaitingListFilters;

    summary:
        WaitingListSummary;
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


        const { flash } = usePage<{
        flash?: {
            success?: string;
            error?: string;
        };
    }>().props;

    const [notification, setNotification] =
        useState<string | null>(null);

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


    const [
        search,
        setSearch,
    ] =
        useState(
            filters.search
            ?? '',
        );

    const status =
        filters.status
        ?? '';

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    const cleaned =
                        search.trim();

                    if (
                        cleaned ===
                        (
                            filters.search
                            ?? ''
                        )
                    ) {
                        return;
                    }

                    router.get(
                        '/admin/waiting-list',
                        {
                            search:
                                cleaned
                                || undefined,

                            status:
                                status
                                || undefined,
                        },
                        {
                            preserveState:
                                true,

                            preserveScroll:
                                true,

                            replace:
                                true,
                        },
                    );
                },
                350,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [
        search,
        filters.search,
        status,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    const changeStatus =
        (
            value:
                string,
        ): void => {
            router.get(
                '/admin/waiting-list',
                {
                    search:
                        search
                            .trim()
                        || undefined,

                    status:
                        value
                        || undefined,
                },
                {
                    preserveState:
                        true,

                    preserveScroll:
                        true,

                    replace:
                        true,
                },
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const visitPage =
        (
            url:
                string | null,
        ): void => {
            if (!url) {
                return;
            }

            router.visit(
                url,
                {
                    preserveScroll:
                        true,

                    preserveState:
                        true,
                },
            );
        };

    return (
        <AdminLayout>

                        {notification && (
                <div className="fixed right-6 top-6 z-50">
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
            <Head
                title="Waiting List"
            />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/* HEADER */}
                <section>
                    <p
                        className="
                            text-sm
                            font-black
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
                        Waiting List
                    </h1>

                    <p
                        className="
                            mt-2
                            max-w-3xl
                            text-sm
                            leading-6
                            text-slate-500
                        "
                    >
                        Monitor preorder
                        merchandise, student
                        requests, current
                        inventory availability,
                        and entries that are
                        already ready for
                        processing.
                    </p>
                </section>

                {/* SUMMARY */}
                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <SummaryCard
                        label="Total Preorders"
                        value={
                            summary
                                .total_entries
                        }
                        description="All preorder entries currently recorded"
                        icon={
                            ShoppingBag
                        }
                        tone="blue"
                    />

                    <SummaryCard
                        label="Waiting"
                        value={
                            summary
                                .waiting
                        }
                        description="Entries still waiting for enough stock"
                        icon={
                            Clock3
                        }
                        tone="amber"
                    />

                    <SummaryCard
                        label="Ready"
                        value={
                            summary
                                .ready
                        }
                        description="Entries with enough stock available"
                        icon={
                            CheckCircle2
                        }
                        tone="green"
                    />

                    <SummaryCard
                        label="Requested Units"
                        value={
                            summary
                                .total_quantity
                        }
                        description="Total quantity requested across all preorders"
                        icon={
                            Package
                        }
                        tone="purple"
                    />
                </section>

                {/* INFO */}
                <section
                    className="
                        rounded-3xl
                        border
                        border-blue-100
                        bg-blue-50/70
                        p-5
                    "
                >
                    <div
                        className="
                            flex
                            items-start
                            gap-4
                        "
                    >
                        <div
                            className="
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-600
                                text-white
                            "
                        >
                            <Clock3
                                size={20}
                            />
                        </div>

                        <div>
                            <h2
                                className="
                                    font-black
                                    text-blue-950
                                "
                            >
                                Preorder Availability
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    leading-6
                                    text-blue-800
                                "
                            >
                                An entry is marked
                                Ready when current
                                available inventory is
                                equal to or greater than
                                the quantity requested
                                by the student.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FILTERS */}
                <section
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
                            flex-col
                            gap-4
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                        "
                    >
                        <div
                            className="
                                relative
                                w-full
                                lg:max-w-md
                            "
                        >
                            <Search
                                size={18}
                                className="
                                    absolute
                                    left-4
                                    top-1/2
                                    -translate-y-1/2
                                    text-slate-400
                                "
                            />

                            <input
                                type="search"
                                value={
                                    search
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search student, order, product, SKU..."
                                className="
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    py-3
                                    pl-11
                                    pr-4
                                    text-sm
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-blue-500
                                    focus:ring-4
                                    focus:ring-blue-100
                                "
                            />
                        </div>

                        <div
                            className="
                                flex
                                flex-wrap
                                gap-2
                            "
                        >
                            <FilterButton
                                active={
                                    status ===
                                    ''
                                }
                                onClick={() =>
                                    changeStatus(
                                        '',
                                    )
                                }
                            >
                                All
                            </FilterButton>

                            <FilterButton
                                active={
                                    status ===
                                    'waiting'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'waiting',
                                    )
                                }
                            >
                                Waiting
                            </FilterButton>

                            <FilterButton
                                active={
                                    status ===
                                    'ready'
                                }
                                onClick={() =>
                                    changeStatus(
                                        'ready',
                                    )
                                }
                            >
                                Ready
                            </FilterButton>
                        </div>
                    </div>
                </section>

                {/* TABLE */}
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
                        <div
                            className="
                                flex
                                items-center
                                justify-between
                                gap-4
                            "
                        >
                            <div>
                                <h2
                                    className="
                                        text-xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Preorder Entries
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    {
                                        waitingItems
                                            .total
                                    }{' '}
                                    record
                                    {
                                        waitingItems
                                            .total ===
                                        1
                                            ? ''
                                            : 's'
                                    }{' '}
                                    found
                                </p>
                            </div>

                            <div
                                className="
                                    flex
                                    h-11
                                    w-11
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-blue-50
                                    text-blue-600
                                "
                            >
                                <ShoppingBag
                                    size={20}
                                />
                            </div>
                        </div>
                    </div>

                    {waitingItems
                        .data
                        .length >
                    0 ? (
                        <>
                            <div
                                className="
                                    overflow-x-auto
                                "
                            >
                                <table
                                    className="
                                        min-w-[1400px]
                                        w-full
                                    "
                                >
                                    <thead
                                        className="
                                            bg-slate-50
                                        "
                                    >
                                        <tr>
                                            <TableHeader>
                                                Student
                                            </TableHeader>

                                            <TableHeader>
                                                Order
                                            </TableHeader>

                                            <TableHeader>
                                                Product
                                            </TableHeader>

                                            <TableHeader>
                                                Variant
                                            </TableHeader>

                                            <TableHeader
                                                align="center"
                                            >
                                                Requested
                                            </TableHeader>

                                            <TableHeader
                                                align="center"
                                            >
                                                Available
                                            </TableHeader>

                                            <TableHeader
                                                align="center"
                                            >
                                                Threshold
                                            </TableHeader>

                                            <TableHeader>
                                                Status
                                            </TableHeader>

                                            <TableHeader>
                                                Date
                                            </TableHeader>

                                        

                                            <TableHeader
                                                align="center"
                                            >
                                                Action
                                            </TableHeader>
                                        </tr>
                                    </thead>

                                    <tbody
                                        className="
                                            divide-y
                                            divide-slate-100
                                        "
                                    >
                                        {waitingItems
                                            .data
                                            .map(
                                                (
                                                    item,
                                                ) => (
                                                    <WaitingRow
                                                        key={
                                                            item.id
                                                        }
                                                        item={
                                                            item
                                                        }
                                                    />
                                                ),
                                            )}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            <div
                                className="
                                    border-t
                                    border-slate-100
                                    px-6
                                    py-5
                                "
                            >
                                <div
                                    className="
                                        flex
                                        flex-col
                                        gap-4
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
                                        <span
                                            className="
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            {
                                                waitingItems
                                                    .from
                                                ?? 0
                                            }
                                        </span>{' '}
                                        to{' '}
                                        <span
                                            className="
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            {
                                                waitingItems
                                                    .to
                                                ?? 0
                                            }
                                        </span>{' '}
                                        of{' '}
                                        <span
                                            className="
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            {
                                                waitingItems
                                                    .total
                                            }
                                        </span>{' '}
                                        entries
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
                                                !waitingItems
                                                    .prev_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    waitingItems
                                                        .prev_page_url,
                                                )
                                            }
                                            className="
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-2.5
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

                                        <div
                                            className="
                                                rounded-xl
                                                bg-slate-100
                                                px-4
                                                py-2.5
                                                text-sm
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            Page{' '}
                                            {
                                                waitingItems
                                                    .current_page
                                            }{' '}
                                            of{' '}
                                            {
                                                waitingItems
                                                    .last_page
                                            }
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                !waitingItems
                                                    .next_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    waitingItems
                                                        .next_page_url,
                                                )
                                            }
                                            className="
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-2.5
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
                            </div>
                        </>
                    ) : (
                        <div
                            className="
                                px-6
                                py-16
                                text-center
                            "
                        >
                            <AlertCircle
                                size={42}
                                className="
                                    mx-auto
                                    text-slate-300
                                "
                            />

                            <h3
                                className="
                                    mt-4
                                    font-black
                                    text-slate-800
                                "
                            >
                                No preorder entries found
                            </h3>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Try changing the
                                search or status filter.
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
| Waiting Row
|--------------------------------------------------------------------------
*/

function WaitingRow({
    item,
}: {
    item:
        WaitingItem;
}) {
    return (
        <tr
            className="
                align-top
                transition
                hover:bg-slate-50/70
            "
        >
            {/* STUDENT */}
            <td
                className="
                    px-6
                    py-5
                "
            >
                <div
                    className="
                        flex
                        items-start
                        gap-3
                    "
                >
                    <div
                        className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-blue-50
                            text-blue-600
                        "
                    >
                        <UserRound
                            size={18}
                        />
                    </div>

                    <div>
                        <p
                            className="
                                font-black
                                text-slate-900
                            "
                        >
                            {
                                item
                                    .student
                                    .name
                            }
                        </p>

                        <p
                            className="
                                mt-1
                                font-mono
                                text-xs
                                text-blue-600
                            "
                        >
                            {
                                item
                                    .student
                                    .student_id
                            }
                        </p>

                        {item
                            .student
                            .course && (
                            <p
                                className="
                                    mt-1
                                    text-xs
                                    text-slate-400
                                "
                            >
                                {
                                    item
                                        .student
                                        .course
                                }
                                {item
                                    .student
                                    .year_level
                                    ? ` • ${item.student.year_level}`
                                    : ''}
                            </p>
                        )}
                    </div>
                </div>
            </td>

            {/* ORDER */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
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
                        item
                            .order_number
                    }
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        text-slate-400
                    "
                >
                    Order #{item.order_id}
                </p>
            </td>

            {/* PRODUCT */}
            <td
                className="
                    px-6
                    py-5
                "
            >
                <p
                    className="
                        font-black
                        text-slate-900
                    "
                >
                    {
                        item
                            .product_name
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-mono
                        text-xs
                        text-blue-600
                    "
                >
                    {
                        item
                            .product_code
                    }
                </p>
            </td>

            {/* VARIANT */}
            <td
                className="
                    px-6
                    py-5
                "
            >
                <p
                    className="
                        font-bold
                        text-slate-800
                    "
                >
                    {
                        item
                            .variant_name
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-mono
                        text-xs
                        text-slate-400
                    "
                >
                    {
                        item.sku
                    }
                </p>

                {item.program && (
                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-500
                        "
                    >
                        Program:{' '}
                        {item.program}
                    </p>
                )}

                {item.size && (
                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-500
                        "
                    >
                        Size:{' '}
                        {item.size}
                    </p>
                )}
            </td>

            {/* REQUESTED */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                    text-center
                "
            >
                <span
                    className="
                        inline-flex
                        min-w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-violet-50
                        px-3
                        py-2
                        text-sm
                        font-black
                        text-violet-700
                    "
                >
                    {
                        item.quantity
                    }
                </span>
            </td>

            {/* AVAILABLE */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                    text-center
                "
            >
                <span
                    className={`
                        inline-flex
                        min-w-12
                        items-center
                        justify-center
                        rounded-xl
                        px-3
                        py-2
                        text-sm
                        font-black

                        ${
                            item.inventory
                                .available_quantity >=
                            item.quantity
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                        }
                    `}
                >
                    {
                        item
                            .inventory
                            .available_quantity
                    }
                </span>

                <p
                    className="
                        mt-1
                        text-[10px]
                        text-slate-400
                    "
                >
                    On hand:{' '}
                    {
                        item
                            .inventory
                            .quantity_on_hand
                    }
                </p>
            </td>

            {/* THRESHOLD */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                    text-center
                "
            >
                <span
                    className="
                        inline-flex
                        min-w-12
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-100
                        px-3
                        py-2
                        text-sm
                        font-black
                        text-slate-700
                    "
                >
                    {
                        item
                            .inventory
                            .reorder_level
                    }
                </span>
            </td>

            {/* STATUS */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                "
            >
                <WaitingStatusBadge
                    status={
                        item
                            .waiting_status
                    }
                />
            </td>

            {/* DATE */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                    text-sm
                    text-slate-500
                "
            >
                {
                    item.created_at
                    ?? '—'
                }
            </td>

            {/* ACTION */}
<td
    className="
        whitespace-nowrap
        px-6
        py-5
        text-center
    "
>
    {item.waiting_status ===
    'ready' ? (
        <ProcessPreorderButton
            item={
                item
            }
        />
    ) : (
        <span
            className="
                text-xs
                font-semibold
                text-slate-400
            "
        >
            Waiting for stock
        </span>
    )}
</td>
        </tr>
    );
}





/*
|--------------------------------------------------------------------------
| Status Badge
|--------------------------------------------------------------------------
*/

function WaitingStatusBadge({
    status,
}: {
    status:
        WaitingStatus;
}) {
    if (
        status ===
        'ready'
    ) {
        return (
            <span
                className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    bg-emerald-100
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-emerald-700
                "
            >
                <CheckCircle2
                    size={14}
                />

                Ready
            </span>
        );
    }

    return (
        <span
            className="
                inline-flex
                items-center
                gap-2
                rounded-full
                bg-amber-100
                px-3
                py-1.5
                text-xs
                font-black
                text-amber-700
            "
        >
            <Clock3
                size={14}
            />

            Waiting
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone =
    | 'blue'
    | 'green'
    | 'amber'
    | 'purple';

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    tone,
}: {
    label:
        string;

    value:
        number;

    description:
        string;

    icon:
        typeof ShoppingBag;

    tone:
        SummaryTone;
}) {
    const styles:
        Record<
            SummaryTone,
            {
                card:
                    string;

                icon:
                    string;

                value:
                    string;
            }
        > = {
        blue: {
            card:
                'border-blue-100 bg-blue-50/40',

            icon:
                'bg-blue-100 text-blue-600',

            value:
                'text-blue-700',
        },

        green: {
            card:
                'border-emerald-100 bg-emerald-50/40',

            icon:
                'bg-emerald-100 text-emerald-600',

            value:
                'text-emerald-700',
        },

        amber: {
            card:
                'border-amber-100 bg-amber-50/40',

            icon:
                'bg-amber-100 text-amber-600',

            value:
                'text-amber-700',
        },

        purple: {
            card:
                'border-violet-100 bg-violet-50/40',

            icon:
                'bg-violet-100 text-violet-600',

            value:
                'text-violet-700',
        },
    };

    const style =
        styles[
            tone
        ];

    return (
        <article
            className={`
                rounded-3xl
                border
                p-5
                shadow-sm
                ${style.card}
            `}
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
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-slate-500
                        "
                    >
                        {label}
                    </p>

                    <p
                        className={`
                            mt-3
                            text-3xl
                            font-black
                            ${style.value}
                        `}
                    >
                        {value}
                    </p>
                </div>

                <div
                    className={`
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-2xl
                        ${style.icon}
                    `}
                >
                    <Icon
                        size={21}
                    />
                </div>
            </div>

            <p
                className="
                    mt-4
                    text-xs
                    leading-5
                    text-slate-500
                "
            >
                {description}
            </p>
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
    active:
        boolean;

    onClick:
        () => void;

    children:
        React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={
                onClick
            }
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

/*
|--------------------------------------------------------------------------
| Table Header
|--------------------------------------------------------------------------
*/

function TableHeader({
    children,
    align = 'left',
}: {
    children:
        React.ReactNode;

    align?:
        | 'left'
        | 'center';
}) {
    return (
        <th
            className={`
                px-6
                py-4
                text-xs
                font-black
                uppercase
                tracking-wide
                text-slate-400

                ${
                    align ===
                    'center'
                        ? 'text-center'
                        : 'text-left'
                }
            `}
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

function ProcessPreorderButton({
    item,
}: {
    item:
        WaitingItem;
}) {
    const [
        processing,
        setProcessing,
    ] =
        useState(
            false,
        );

    const processPreorder =
        (): void => {
            if (
                processing
            ) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Process preorder ${item.order_number}?\n\n`
                    +
                    `${item.product_name} — ${item.variant_name}\n`
                    +
                    `Requested quantity: ${item.quantity}\n\n`
                    +
                    'The requested stock will be reserved for this student.',
                );

            if (!confirmed) {
                return;
            }

            setProcessing(
                true,
            );

            router.patch(
                `/admin/waiting-list/${item.id}/process`,
                {},
                {
                    preserveScroll:
                        true,

                    onFinish:
                        () => {
                            setProcessing(
                                false,
                            );
                        },
                },
            );
        };

    return (
        <button
            type="button"
            onClick={
                processPreorder
            }
            disabled={
                processing
            }
            className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-emerald-600
                px-4
                py-2.5
                text-xs
                font-black
                text-white
                transition
                hover:bg-emerald-700
                disabled:cursor-not-allowed
                disabled:opacity-50
            "
        >
            <PlayCircle
                size={15}
            />

            {processing
                ? 'Processing...'
                : 'Process'}
        </button>
    );
}