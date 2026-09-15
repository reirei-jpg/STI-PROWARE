import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    History,
    PackageCheck,
    Search,
    ShoppingBag,
    UserRound,
} from 'lucide-react';
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    useEffect,
    useState,
} from 'react';

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

interface PageProps {
    orders: PaginatedOrders;
    filters: Filters;
}

export default function Index({
    orders,
    filters,
}: PageProps) {
    const [
        search,
        setSearch,
    ] = useState(
        filters.search ?? '',
    );

    const [
        date,
        setDate,
    ] = useState(
        filters.date ?? 'all',
    );

    const [
        type,
        setType,
    ] = useState(
        filters.type ?? 'all',
    );

    useEffect(
        () => {
            const timer =
                window.setTimeout(
                    () => {
                        if (
                            search
                            === (
                                filters.search
                                ?? ''
                            )
                        ) {
                            return;
                        }

                        applyFilters(
                            search,
                            date,
                            type,
                        );
                    },
                    400,
                );

            return () =>
                window.clearTimeout(
                    timer,
                );
        },
        [search],
    );

    const applyFilters = (
        nextSearch: string,
        nextDate: string,
        nextType: string,
    ) => {
        router.get(
            specialist.releases.index.url(),
            {
                search:
                    nextSearch
                    || undefined,
                date:
                    nextDate
                    !== 'all'
                        ? nextDate
                        : undefined,
                type:
                    nextType
                    !== 'all'
                        ? nextType
                        : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const changeDate = (
        value: string,
    ) => {
        setDate(value);

        applyFilters(
            search,
            value,
            type,
        );
    };

    const changeType = (
        value: string,
    ) => {
        setType(value);

        applyFilters(
            search,
            date,
            value,
        );
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

    const hasFilters =
        search !== ''
        || date !== 'all'
        || type !== 'all';

    return (
        <SpecialistLayout>
            <Head title="Release History" />

            <div className="mx-auto w-full max-w-7xl space-y-6">
                {/* HEADER */}
                <section>
                    <div className="flex items-start gap-3">
                        <div
                            className="
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                bg-blue-50
                                text-[#0D6EFD]
                            "
                        >
                            <History size={22} />
                        </div>

                        <div>
                            <h1
                                className="
                                    text-2xl
                                    font-black
                                    tracking-tight
                                    text-slate-900
                                "
                            >
                                Release History
                            </h1>

                            <p className="mt-1 text-sm text-slate-500">
                                Trace merchandise that has been
                                physically released to students.
                            </p>
                        </div>
                    </div>
                </section>

                {/* INFORMATION */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-blue-100
                        bg-blue-50/60
                        px-5
                        py-4
                    "
                >
                    <div className="flex items-start gap-3">
                        <PackageCheck
                            size={20}
                            className="
                                mt-0.5
                                shrink-0
                                text-blue-600
                            "
                        />

                        <div>
                            <p
                                className="
                                    text-sm
                                    font-black
                                    text-slate-900
                                "
                            >
                                Released Merchandise Records
                            </p>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-5
                                    text-slate-600
                                "
                            >
                                Only completed releases are
                                shown here. Each record identifies
                                the student, merchandise, release
                                time, and Specialist who performed
                                the release.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SEARCH + FILTERS */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-4
                    "
                >
                    <div
                        className="
                            flex
                            flex-col
                            gap-3
                            lg:flex-row
                            lg:items-center
                        "
                    >
                        <div className="relative flex-1">
                            <Search
                                size={18}
                                className="
                                    absolute
                                    left-3.5
                                    top-1/2
                                    -translate-y-1/2
                                    text-slate-400
                                "
                            />

                            <input
                                type="text"
                                value={search}
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Search order, student, ID, product or SKU..."
                                className="
                                    h-11
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-slate-50
                                    pl-11
                                    pr-4
                                    text-sm
                                    font-medium
                                    text-slate-800
                                    outline-none
                                    transition
                                    placeholder:text-slate-400
                                    focus:border-blue-400
                                    focus:bg-white
                                    focus:ring-4
                                    focus:ring-blue-50
                                "
                            />
                        </div>

                        <select
                            value={date}
                            onChange={(
                                event,
                            ) =>
                                changeDate(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="
                                h-11
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-3
                                text-sm
                                font-bold
                                text-slate-700
                                outline-none
                                focus:border-blue-400
                            "
                        >
                            <option value="all">
                                All Time
                            </option>
                            <option value="today">
                                Today
                            </option>
                            <option value="week">
                                This Week
                            </option>
                            <option value="month">
                                This Month
                            </option>
                        </select>

                        <select
                            value={type}
                            onChange={(
                                event,
                            ) =>
                                changeType(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="
                                h-11
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-3
                                text-sm
                                font-bold
                                text-slate-700
                                outline-none
                                focus:border-blue-400
                            "
                        >
                            <option value="all">
                                All Types
                            </option>
                            <option value="order">
                                Normal Order
                            </option>
                            <option value="preorder">
                                Preorder
                            </option>
                        </select>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={
                                    clearFilters
                                }
                                className="
                                    h-11
                                    rounded-xl
                                    px-4
                                    text-sm
                                    font-bold
                                    text-slate-500
                                    transition
                                    hover:bg-slate-100
                                    hover:text-slate-800
                                "
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </section>

                {/* RESULT HEADER */}
                <section
                    className="
                        flex
                        flex-col
                        gap-2
                        sm:flex-row
                        sm:items-end
                        sm:justify-between
                    "
                >
                    <div>
                        <h2
                            className="
                                text-lg
                                font-black
                                text-slate-900
                            "
                        >
                            Released Orders
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Newest releases are shown first.
                        </p>
                    </div>

                    <p
                        className="
                            text-sm
                            font-bold
                            text-slate-500
                        "
                    >
                        {orders.total}{' '}
                        {orders.total === 1
                            ? 'record'
                            : 'records'}
                    </p>
                </section>

                {/* HISTORY */}
                {orders.data.length > 0 ? (
                    <section className="space-y-4">
                        {orders.data.map(
                            (order) => (
                                <ReleaseCard
                                    key={
                                        order.id
                                    }
                                    order={
                                        order
                                    }
                                />
                            ),
                        )}
                    </section>
                ) : (
                    <EmptyState
                        filtered={
                            hasFilters
                        }
                    />
                )}

                {/* PAGINATION */}
                {orders.last_page > 1 && (
                    <section
                        className="
                            flex
                            flex-col
                            gap-3
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            px-5
                            py-4
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                        "
                    >
                        <p className="text-xs font-semibold text-slate-500">
                            Showing{' '}
                            {orders.from ?? 0}
                            {' – '}
                            {orders.to ?? 0}
                            {' of '}
                            {orders.total}
                        </p>

                        <div className="flex items-center gap-2">
                            {orders.prev_page_url ? (
                                <Link
                                    href={
                                        orders.prev_page_url
                                    }
                                    preserveScroll
                                    preserveState
                                    className="
                                        flex
                                        h-9
                                        items-center
                                        gap-1
                                        rounded-lg
                                        border
                                        border-slate-200
                                        px-3
                                        text-xs
                                        font-bold
                                        text-slate-700
                                        transition
                                        hover:bg-slate-50
                                    "
                                >
                                    <ChevronLeft
                                        size={15}
                                    />
                                    Previous
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="
                                        flex
                                        h-9
                                        cursor-not-allowed
                                        items-center
                                        gap-1
                                        rounded-lg
                                        border
                                        border-slate-100
                                        px-3
                                        text-xs
                                        font-bold
                                        text-slate-300
                                    "
                                >
                                    <ChevronLeft
                                        size={15}
                                    />
                                    Previous
                                </button>
                            )}

                            <span
                                className="
                                    px-2
                                    text-xs
                                    font-black
                                    text-slate-600
                                "
                            >
                                {orders.current_page}
                                {' / '}
                                {orders.last_page}
                            </span>

                            {orders.next_page_url ? (
                                <Link
                                    href={
                                        orders.next_page_url
                                    }
                                    preserveScroll
                                    preserveState
                                    className="
                                        flex
                                        h-9
                                        items-center
                                        gap-1
                                        rounded-lg
                                        border
                                        border-slate-200
                                        px-3
                                        text-xs
                                        font-bold
                                        text-slate-700
                                        transition
                                        hover:bg-slate-50
                                    "
                                >
                                    Next
                                    <ChevronRight
                                        size={15}
                                    />
                                </Link>
                            ) : (
                                <button
                                    disabled
                                    className="
                                        flex
                                        h-9
                                        cursor-not-allowed
                                        items-center
                                        gap-1
                                        rounded-lg
                                        border
                                        border-slate-100
                                        px-3
                                        text-xs
                                        font-bold
                                        text-slate-300
                                    "
                                >
                                    Next
                                    <ChevronRight
                                        size={15}
                                    />
                                </button>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </SpecialistLayout>
    );
}

function ReleaseCard({
    order,
}: {
    order: ReleaseOrder;
}) {
    const isPreorder =
        order.order_type === 'preorder';

    return (
        <article
            className="
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
            "
        >
            <div
                className="
                    flex
                    flex-col
                    gap-4
                    border-b
                    border-slate-100
                    px-5
                    py-4
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                "
            >
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p
                            className="
                                font-mono
                                text-sm
                                font-black
                                text-blue-600
                            "
                        >
                            {order.order_number}
                        </p>

                        {isPreorder && (
                            <span
                                className="
                                    rounded-full
                                    bg-violet-100
                                    px-2.5
                                    py-1
                                    text-[10px]
                                    font-black
                                    uppercase
                                    tracking-wide
                                    text-violet-700
                                "
                            >
                                Preorder
                            </span>
                        )}

                        <span
                            className="
                                rounded-full
                                bg-emerald-100
                                px-2.5
                                py-1
                                text-[10px]
                                font-black
                                uppercase
                                tracking-wide
                                text-emerald-700
                            "
                        >
                            Released
                        </span>
                    </div>

                    <div
                        className="
                            mt-2
                            flex
                            items-center
                            gap-1.5
                            text-xs
                            text-slate-500
                        "
                    >
                        <CalendarDays
                            size={13}
                        />

                        Released{' '}
                        <span className="font-bold text-slate-700">
                            {order.released_at
                                ?? 'Date unavailable'}
                        </span>
                    </div>
                </div>

                <div
                    className="
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        bg-slate-50
                        px-4
                        py-3
                    "
                >
                    <UserRound
                        size={18}
                        className="text-blue-600"
                    />

                    <div>
                        <p
                            className="
                                text-[10px]
                                font-black
                                uppercase
                                tracking-wide
                                text-slate-400
                            "
                        >
                            Student
                        </p>

                        <p className="text-sm font-black text-slate-900">
                            {order.student.name}
                        </p>

                        <p className="text-xs text-slate-500">
                            {order.student.student_id}
                        </p>
                    </div>
                </div>
            </div>

            {/* MERCHANDISE */}
            <div className="px-5 py-5">
                <p
                    className="
                        mb-3
                        text-[10px]
                        font-black
                        uppercase
                        tracking-wider
                        text-slate-400
                    "
                >
                    Released Merchandise
                </p>

                <div className="space-y-3">
                    {order.items.map(
                        (item) => (
                            <ReleaseItemRow
                                key={item.id}
                                item={item}
                            />
                        ),
                    )}
                </div>
            </div>

            {/* TRACE */}
            <div
                className="
                    grid
                    gap-4
                    border-t
                    border-slate-100
                    bg-slate-50/60
                    px-5
                    py-4
                    md:grid-cols-2
                "
            >
                <TraceField
                    label="Released By"
                    value={
                        order.released_by
                            .name
                    }
                />

                <TraceField
                    label="Release QR Verified"
                    value={
                        order.release_qr_used_at
                            ?? 'Not recorded'
                    }
                />
            </div>
        
        <div
            className="
                flex
                justify-end
                border-t
                border-slate-100
                bg-white
                px-5
                py-4
            "
        >
            <Link
                href={specialist.releases.show.url(order.id)}
                className="
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#0D6EFD]
                    px-4
                    py-2.5
                    text-xs
                    font-black
                    text-white
                    transition
                    hover:bg-blue-700
                "
            >
                View Details
            </Link>
        </div>
        
        
        
        </article>
    );
}

function ReleaseItemRow({
    item,
}: {
    item: ReleaseItem;
}) {
            const details =
            [
                item.program,
                item.size,
            ].filter(
                (
                    value,
                ): value is string =>
                    Boolean(
                        value?.trim(),
                    ),
            );

        const variantDetails =
            details.length > 0
                ? Array.from(
                    new Set(
                        details,
                    ),
                )
                : item.variant_name
                ? [
                        item.variant_name,
                    ]
                : [
                        'Standard',
                    ];

    return (
        <div
            className="
                flex
                items-center
                gap-4
                rounded-xl
                border
                border-slate-100
                bg-white
                p-3
            "
        >
            <div
                className="
                    flex
                    h-20
                    w-20
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50
                "
            >
                {item.image_url ? (
                    <img
                        src={
                            item.image_url
                        }
                        alt={
                            item.product_name
                                ?? 'Merchandise'
                        }
                        className="
                            h-full
                            w-full
                            object-contain
                            p-1
                        "
                    />
                ) : (
                    <ShoppingBag
                        size={25}
                        className="text-slate-300"
                    />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <p
                    className="
                        font-black
                        text-slate-900
                    "
                >
                    {item.product_name
                        ?? 'Unknown Merchandise'}
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        font-semibold
                        text-slate-600
                    "
                >
                    {variantDetails.join(
                        ' • ',
                    )}
                </p>

                {item.sku && (
                    <p
                        className="
                            mt-1
                            font-mono
                            text-[10px]
                            text-slate-400
                        "
                    >
                        SKU: {item.sku}
                    </p>
                )}
            </div>

            <div
                className="
                    shrink-0
                    rounded-lg
                    bg-blue-50
                    px-3
                    py-2
                    text-center
                "
            >
                <p
                    className="
                        text-[9px]
                        font-black
                        uppercase
                        tracking-wide
                        text-blue-500
                    "
                >
                    Qty
                </p>

                <p
                    className="
                        text-lg
                        font-black
                        text-blue-700
                    "
                >
                    {item.quantity}
                </p>
            </div>
        </div>
    );
}

function TraceField({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
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

function EmptyState({
    filtered,
}: {
    filtered: boolean;
}) {
    return (
        <section
            className="
                rounded-2xl
                border
                border-dashed
                border-slate-300
                bg-white
                px-6
                py-16
                text-center
            "
        >
            <PackageCheck
                size={34}
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
                {filtered
                    ? 'No matching releases'
                    : 'No release history yet'}
            </h3>

            <p
                className="
                    mx-auto
                    mt-2
                    max-w-md
                    text-sm
                    text-slate-500
                "
            >
                {filtered
                    ? 'Try changing your search or filters.'
                    : 'Orders will appear here after merchandise has been physically released to a student.'}
            </p>
        </section>
    );
}