import {
    ArrowDownToLine,
    CalendarDays,
    PackageCheck,
    ReceiptText,
    Search,
    Truck,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
    usePage,
} from '@inertiajs/react';

import {
    type FormEvent,
    type ReactNode,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

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

    supplier_reference_number:
        string | null;

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
}

interface PageProps {
    receipts: ReceiptPagination;

    summary: SummaryData;

    filters: FilterData;
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
}: PageProps) {
    const [
        search,
        setSearch,
    ] = useState(
        filters.search,
    );

    const page =
        usePage<SharedPageProps>();

    const userRole =
        page.props.auth.user?.role;

    const isSpecialist =
        userRole === 'specialist';

    /*
    |--------------------------------------------------------------------------
    | Role-aware Layout
    |--------------------------------------------------------------------------
    */

    const Layout =
        isSpecialist
            ? SpecialistLayout
            : AdminLayout;

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

    const pageTitle =
        isSpecialist
            ? 'Stock Receipt History'
            : 'Receiving Monitoring';

    const pageDescription =
        isSpecialist
            ? 'Review previously received merchandise, supplier references, quantity changes, and receiving activity.'
            : 'Monitor merchandise receiving activity, supplier references, stock changes, and the employee responsible for each receipt.';

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    const submitSearch = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        const cleaned =
            search.trim();

        router.get(
            '/staff/stock-receipts',
            cleaned !== ''
                ? {
                      search:
                          cleaned,
                  }
                : {},
            {
                preserveScroll:
                    true,

                preserveState:
                    true,

                replace:
                    true,
            },
        );
    };

    const clearSearch =
        (): void => {
            setSearch('');

            router.get(
                '/staff/stock-receipts',
                {},
                {
                    preserveScroll:
                        true,

                    preserveState:
                        true,

                    replace:
                        true,
                },
            );
        };

    return (
        <Layout>
            <Head
                title={
                    pageTitle
                }
            />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/*
                |--------------------------------------------------------------------------
                | Header
                |--------------------------------------------------------------------------
                */}

                <section
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
                        <p
                            className="
                                text-xs
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
                            {
                                pageTitle
                            }
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
                            {
                                pageDescription
                            }
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
        className="
            inline-flex
            shrink-0
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
        "
    >
        <Truck size={18} />

        Receive Stock
    </Link>
) : (
    <Link
        href="/staff/inventory/movements"
        className="
            inline-flex
            shrink-0
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
        "
    >
        <ArrowDownToLine size={18} />

        View Stock Movements
    </Link>
)}
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Admin Monitoring Notice
                |--------------------------------------------------------------------------
                */}

                {!isSpecialist && (
                    <section
                        className="
                            rounded-2xl
                            border
                            border-blue-100
                            bg-blue-50
                            px-5
                            py-4
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
                                    bg-blue-100
                                    text-blue-700
                                "
                            >
                                <ReceiptText
                                    size={19}
                                />
                            </div>

                            <div>
                                <p
                                    className="
                                        text-sm
                                        font-black
                                        text-blue-900
                                    "
                                >
                                    Receiving
                                    Monitoring
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        leading-5
                                        text-blue-700
                                    "
                                >
                                    Admin can review
                                    receiving records,
                                    stock changes, and
                                    employee activity.
                                    Physical merchandise
                                    receiving is handled
                                    by the Specialist
                                    department.
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

                <section
                    className="
                        grid
                        gap-4
                        sm:grid-cols-2
                        xl:grid-cols-4
                    "
                >
                    <SummaryCard
                        title="Total Receipts"
                        value={
                            summary
                                .total_receipts
                        }
                        description="Recorded stock receipt entries"
                        icon={
                            ReceiptText
                        }
                    />

                    <SummaryCard
                        title="Units Received"
                        value={
                            summary
                                .total_units_received
                        }
                        description="Total merchandise units received"
                        icon={
                            PackageCheck
                        }
                    />

                    <SummaryCard
                        title="Receipts Today"
                        value={
                            summary
                                .received_today
                        }
                        description="Stock receipt entries created today"
                        icon={
                            CalendarDays
                        }
                    />

                    <SummaryCard
                        title="Units Today"
                        value={
                            summary
                                .units_received_today
                        }
                        description="Merchandise units received today"
                        icon={
                            ArrowDownToLine
                        }
                    />
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Search
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        rounded-3xl
                        border
                        border-slate-100
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
                        <div>
                            <h2
                                className="
                                    font-black
                                    text-slate-900
                                "
                            >
                                Receipt Records
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                {
                                    receipts.total
                                }{' '}
                                receipt record
                                {receipts.total ===
                                1
                                    ? ''
                                    : 's'}
                            </p>
                        </div>

                        <form
                            onSubmit={
                                submitSearch
                            }
                            className="
                                flex
                                w-full
                                flex-col
                                gap-3
                                sm:flex-row
                                lg:w-auto
                            "
                        >
                            <div
                                className="
                                    relative
                                    w-full
                                    sm:w-96
                                "
                            >
                                <Search
                                    size={18}
                                    className="
                                        pointer-events-none
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
                                    placeholder="Search receipt, product, variant, supplier, staff..."
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
                                        placeholder:text-slate-400
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                />
                            </div>

                            <button
                                type="submit"
                                className="
                                    rounded-xl
                                    bg-[#0D6EFD]
                                    px-5
                                    py-3
                                    text-sm
                                    font-black
                                    text-white
                                    transition
                                    hover:bg-blue-700
                                "
                            >
                                Search
                            </button>

                            {filters.search !==
                                '' && (
                                <button
                                    type="button"
                                    onClick={
                                        clearSearch
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
                                        text-slate-600
                                        transition
                                        hover:bg-slate-50
                                    "
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

                {receipts.data.length >
                0 ? (
                    <>
                        <section
                            className="
                                overflow-hidden
                                rounded-3xl
                                border
                                border-slate-100
                                bg-white
                                shadow-sm
                            "
                        >
                            <div
                                className="
                                    overflow-x-auto
                                "
                            >
                                <table
                                    className="
                                        w-full
                                        min-w-[1200px]
                                    "
                                >
                                    <thead
                                        className="
                                            border-b
                                            border-slate-100
                                            bg-slate-50
                                            text-left
                                        "
                                    >
                                        <tr>
                                            <TableHeading>
                                                Receipt
                                            </TableHeading>

                                            <TableHeading>
                                                Merchandise
                                            </TableHeading>

                                            <TableHeading>
                                                Quantity
                                            </TableHeading>

                                            <TableHeading>
                                                Stock Change
                                            </TableHeading>

                                            <TableHeading>
                                                Supplier Ref.
                                            </TableHeading>

                                            <TableHeading>
                                                Received By
                                            </TableHeading>

                                            <TableHeading>
                                                Date
                                            </TableHeading>

                                            <TableHeading>
                                                Notes
                                            </TableHeading>

                                            <TableHeading>
                                                Action
                                            </TableHeading>
                                        </tr>
                                    </thead>

                                    <tbody
                                        className="
                                            divide-y
                                            divide-slate-100
                                        "
                                    >
                                        {receipts.data.map(
                                            (
                                                receipt,
                                            ) => (
                                                <ReceiptRow
                                                    key={
                                                        receipt.id
                                                    }
                                                    receipt={
                                                        receipt
                                                    }
                                                />
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <Pagination
                            links={
                                receipts.links
                            }
                        />
                    </>
                ) : (
                    <EmptyState
                        hasSearch={
                            filters.search !==
                            ''
                        }
                        canReceiveStock={
                            isSpecialist
                        }
                    />
                )}
            </div>
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

    icon:
        typeof ReceiptText;
}

function SummaryCard({
    title,
    value,
    description,
    icon: Icon,
}: SummaryCardProps) {
    return (
        <article
            className="
                rounded-3xl
                border
                border-slate-100
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
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            text-slate-400
                        "
                    >
                        {title}
                    </p>

                    <p
                        className="
                            mt-3
                            text-3xl
                            font-black
                            text-slate-900
                        "
                    >
                        {value}
                    </p>

                    <p
                        className="
                            mt-2
                            text-xs
                            leading-5
                            text-slate-500
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
                        bg-blue-100
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
| Receipt Row
|--------------------------------------------------------------------------
*/

function ReceiptRow({
    receipt,
}: {
    receipt:
        ReceiptItem;
}) {
    return (
        <tr
            className="
                align-top
                transition
                hover:bg-slate-50/70
            "
        >
            {/* Receipt */}
            <td
                className="
                    px-5
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
                        receipt.receipt_number
                        ?? 'N/A'
                    }
                </p>

                <p
                    className="
                        mt-1
                        text-xs
                        text-slate-400
                    "
                >
                    Movement #
                    {
                        receipt.id
                    }
                </p>
            </td>

            {/* Product */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <p
                    className="
                        text-sm
                        font-black
                        text-slate-900
                    "
                >
                    {
                        receipt.product
                            .name
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-mono
                        text-xs
                        text-slate-500
                    "
                >
                    {
                        receipt.product
                            .code
                    }
                </p>

                <p
                    className="
                        mt-2
                        text-xs
                        font-semibold
                        text-blue-600
                    "
                >
                    {
                        receipt.variant
                            .variant_name
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-mono
                        text-[11px]
                        text-slate-400
                    "
                >
                    {
                        receipt.variant
                            .sku
                    }
                </p>
            </td>

            {/* Quantity */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <span
                    className="
                        inline-flex
                        rounded-full
                        bg-emerald-100
                        px-3
                        py-1.5
                        text-sm
                        font-black
                        text-emerald-700
                    "
                >
                    +
                    {
                        receipt
                            .quantity_received
                    }
                </span>
            </td>

            {/* Stock Change */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <div
                    className="
                        flex
                        items-center
                        gap-2
                        text-sm
                    "
                >
                    <span
                        className="
                            rounded-lg
                            bg-slate-100
                            px-2.5
                            py-1
                            font-black
                            text-slate-600
                        "
                    >
                        {
                            receipt
                                .quantity_before
                        }
                    </span>

                    <span
                        className="
                            text-slate-400
                        "
                    >
                        →
                    </span>

                    <span
                        className="
                            rounded-lg
                            bg-blue-100
                            px-2.5
                            py-1
                            font-black
                            text-blue-700
                        "
                    >
                        {
                            receipt
                                .quantity_after
                        }
                    </span>
                </div>
            </td>

            {/* Supplier */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <p
                    className="
                        max-w-48
                        break-words
                        text-sm
                        font-semibold
                        text-slate-700
                    "
                >
                    {
                        receipt
                            .supplier_reference_number
                        ?? '—'
                    }
                </p>
            </td>

            {/* Staff */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <p
                    className="
                        text-sm
                        font-black
                        text-slate-800
                    "
                >
                    {
                        receipt
                            .performed_by
                            .name
                    }
                </p>

                {receipt
                    .performed_by
                    .email && (
                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-400
                        "
                    >
                        {
                            receipt
                                .performed_by
                                .email
                        }
                    </p>
                )}
            </td>

            {/* Date */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <p
                    className="
                        whitespace-nowrap
                        text-sm
                        text-slate-600
                    "
                >
                    {
                        receipt.created_at
                        ?? '—'
                    }
                </p>
            </td>

            {/* Notes */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <p
                    className="
                        max-w-64
                        whitespace-pre-wrap
                        break-words
                        text-sm
                        leading-6
                        text-slate-500
                    "
                >
                    {
                        receipt.notes
                        ?? '—'
                    }
                </p>
            </td>

            {/* View */}
            <td
                className="
                    px-5
                    py-5
                "
            >
                <Link
                    href={`/staff/stock-receipts/${receipt.id}`}
                    className="
                        inline-flex
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-blue-200
                        bg-blue-50
                        px-3
                        py-2
                        text-xs
                        font-black
                        text-blue-700
                        transition
                        hover:border-blue-300
                        hover:bg-blue-100
                    "
                >
                    View
                </Link>
            </td>
        </tr>
    );
}

/*
|--------------------------------------------------------------------------
| Table Heading
|--------------------------------------------------------------------------
*/

function TableHeading({
    children,
}: {
    children:
        ReactNode;
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
                text-slate-500
            "
        >
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

    canReceiveStock:
        boolean;
}) {
    return (
        <section
            className="
                rounded-3xl
                border
                border-slate-100
                bg-white
                px-6
                py-16
                text-center
                shadow-sm
            "
        >
            <ReceiptText
                size={42}
                className="
                    mx-auto
                    text-slate-300
                "
            />

            <h2
                className="
                    mt-5
                    text-xl
                    font-black
                    text-slate-800
                "
            >
                {hasSearch
                    ? 'No matching receipts'
                    : 'No stock receipts yet'}
            </h2>

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

            {!hasSearch
                && canReceiveStock && (
                <Link
                    href="/staff/stock-receipts/create"
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
                        transition
                        hover:bg-blue-700
                    "
                >
                    <Truck
                        size={18}
                    />

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

function Pagination({
    links,
}: {
    links:
        PaginationLink[];
}) {
    if (
        links.length <= 3
    ) {
        return null;
    }

    return (
        <div
            className="
                flex
                flex-wrap
                justify-center
                gap-2
                rounded-3xl
                border
                border-slate-100
                bg-white
                px-6
                py-5
                shadow-sm
            "
        >
            {links.map(
                (
                    link,
                    index,
                ) => {
                    const label =
                        link.label
                            .replace(
                                '&laquo;',
                                '«',
                            )
                            .replace(
                                '&raquo;',
                                '»',
                            );

                    if (
                        !link.url
                    ) {
                        return (
                            <span
                                key={
                                    index
                                }
                                className="
                                    rounded-lg
                                    border
                                    border-slate-200
                                    px-3
                                    py-2
                                    text-sm
                                    text-slate-300
                                "
                            >
                                {
                                    label
                                }
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={
                                index
                            }
                            href={
                                link.url
                            }
                            preserveScroll
                            className={`
                                rounded-lg
                                border
                                px-3
                                py-2
                                text-sm
                                transition

                                ${
                                    link.active
                                        ? 'border-blue-600 bg-blue-600 text-white'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                }
                            `}
                        >
                            {
                                label
                            }
                        </Link>
                    );
                },
            )}
        </div>
    );
}