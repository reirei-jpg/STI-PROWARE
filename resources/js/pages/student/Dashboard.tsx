import {
    Eye,
    PackageOpen,
    Search,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
} from '@inertiajs/react';

import {
    type FormEvent,
    useState,
} from 'react';

import CatalogCard from '@/components/catalog/CatalogCard';

import type {
    CatalogProduct,
} from '@/components/catalog/CatalogCard';

import ComingSoonCarousel from '@/components/catalog/ComingSoonCarousel';

import StudentLayout from '@/layouts/StudentLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface HomeProductsPagination {
    data:
        CatalogProduct[];

    links:
        PaginationLink[];

    current_page:
        number;

    last_page:
        number;

    from:
        number | null;

    to:
        number | null;

    total:
        number;
}

interface DashboardFilters {
    search:
        string;

    status:
        string;
}

interface StudentDashboardProps {
    homeProducts:
        HomeProductsPagination;

    comingSoonProducts:
        CatalogProduct[];

    filters:
        DashboardFilters;
}

/*
|--------------------------------------------------------------------------
| Home
|--------------------------------------------------------------------------
|
| The Student Dashboard is now the PROWARE storefront.
|
| Personal information:
| -> My Profile
|
| Orders:
| -> My Orders
|
| Notifications:
| -> Navbar Notification Bell
|
| Merchandise:
| -> Home
|
*/

export default function Dashboard({
    homeProducts,
    comingSoonProducts,
    filters,
}: StudentDashboardProps) {
    const [
        searchInput,
        setSearchInput,
    ] = useState(
        filters.search,
    );

    /*
    |--------------------------------------------------------------------------
    | Normal Merchandise
    |--------------------------------------------------------------------------
    |
    | Coming Soon products are NOT repeated here. Search and
    | availability filtering both happen on the server so they
    | apply across every Home page, not just the current one.
    |
    */

    const regularProducts =
        homeProducts.data.filter(
            (product) =>
                product.availability_status !==
                'coming_soon',
        );

    const hasFilters =
        filters.search !== ''
        ||
        filters.status !== '';

    /*
    |--------------------------------------------------------------------------
    | Page
    |--------------------------------------------------------------------------
    */

    return (
        <StudentLayout>
            <Head title="Home" />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/*
                |--------------------------------------------------------------------------
                | Home Header
                |--------------------------------------------------------------------------
                */}

                <section
                    className="
                        rounded-3xl
                        bg-gradient-to-r
                        from-blue-600
                        to-blue-500
                        px-6
                        py-8
                        text-white
                        shadow-sm
                        sm:px-8
                    "
                >
                    <div className="max-w-3xl">
                        <p
                            className="
                                text-sm
                                font-bold
                                uppercase
                                tracking-[0.2em]
                                text-blue-100
                            "
                        >
                            STI PROWARE
                        </p>

                        <h1
                            className="
                                mt-3
                                text-3xl
                                font-black
                                sm:text-4xl
                            "
                        >
                            Merchandise Store
                        </h1>

                        <p
                            className="
                                mt-3
                                text-sm
                                leading-7
                                text-blue-50
                                sm:text-base
                            "
                        >
                            Browse official STI
                            merchandise, check
                            availability, and preorder
                            upcoming products.
                        </p>
                    </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Coming Soon Advertisement
                |--------------------------------------------------------------------------
                |
                | Compact rotating promotion. Always shows every
                | upcoming product, independent of search/filter
                | and independent of which Home page is open.
                |
                */}

                {comingSoonProducts.length >
                    0 && (
                    <ComingSoonCarousel
                        products={
                            comingSoonProducts
                        }
                    />
                )}

                {/*
                |--------------------------------------------------------------------------
                | Browse Merchandise Toolbar
                |--------------------------------------------------------------------------
                */}

                <section
                    id="merchandise"
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
                            gap-5
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
                                        text-xl
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Browse Merchandise
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    {
                                        homeProducts.total
                                    }{' '}
                                    matching product
                                    {homeProducts.total ===
                                    1
                                        ? ''
                                        : 's'}
                                </p>
                            </div>

                            {/*
                            |--------------------------------------------------------------------------
                            | Search
                            |--------------------------------------------------------------------------
                            */}

                            <form
                                onSubmit={(
                                    event:
                                        FormEvent<HTMLFormElement>,
                                ) => {
                                    event.preventDefault();

                                    visitDashboard({
                                        search:
                                            searchInput,

                                        status:
                                            filters.status,
                                    });
                                }}
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
                                        min-w-0
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
                                            searchInput
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setSearchInput(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="Search code, name, or category..."
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
                                            text-slate-800
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
                                        font-bold
                                        text-white
                                        transition
                                        hover:bg-blue-700
                                    "
                                >
                                    Search
                                </button>

                                {hasFilters && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchInput(
                                                '',
                                            );

                                            router.get(
                                                '/student/dashboard',
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
                                        }}
                                        className="
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-white
                                            px-5
                                            py-3
                                            text-sm
                                            font-bold
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

                        {/*
                        |--------------------------------------------------------------------------
                        | Availability Filters
                        |--------------------------------------------------------------------------
                        */}

                        <div
                            className="
                                flex
                                flex-wrap
                                gap-2
                                border-t
                                border-slate-100
                                pt-5
                            "
                        >
                            <StatusButton
                                label="All"
                                value=""
                                activeStatus={
                                    filters.status
                                }
                                onClick={(
                                    value,
                                ) =>
                                    visitDashboard({
                                        search:
                                            searchInput,

                                        status:
                                            value,
                                    })
                                }
                            />

                            <StatusButton
                                label="Available"
                                value="available"
                                activeStatus={
                                    filters.status
                                }
                                onClick={(
                                    value,
                                ) =>
                                    visitDashboard({
                                        search:
                                            searchInput,

                                        status:
                                            value,
                                    })
                                }
                            />

                            <StatusButton
                                label="Coming Soon"
                                value="coming_soon"
                                activeStatus={
                                    filters.status
                                }
                                onClick={(
                                    value,
                                ) =>
                                    visitDashboard({
                                        search:
                                            searchInput,

                                        status:
                                            value,
                                    })
                                }
                            />

                            <StatusButton
                                label="Out of Stock"
                                value="out_of_stock"
                                activeStatus={
                                    filters.status
                                }
                                onClick={(
                                    value,
                                ) =>
                                    visitDashboard({
                                        search:
                                            searchInput,

                                        status:
                                            value,
                                    })
                                }
                            />
                        </div>
                    </div>
                </section>

                {/*
                |--------------------------------------------------------------------------
                | Regular Merchandise Grid
                |--------------------------------------------------------------------------
                */}

                {regularProducts.length >
                0 ? (
                    <>
                        <section
                            className="
                                grid
                                gap-6
                                md:grid-cols-2
                                2xl:grid-cols-3
                            "
                        >
                            {regularProducts.map(
                                (
                                    product,
                                ) => (
                                    <CatalogCard
                                        key={
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                        actions={
                                            <ProductAction
                                                product={
                                                    product
                                                }
                                            />
                                        }
                                    />
                                ),
                            )}
                        </section>

                        <DashboardPagination
                            links={
                                homeProducts.links
                            }
                        />
                    </>
                ) : null}

                {/*
                |--------------------------------------------------------------------------
                | Coming Soon Filter Message
                |--------------------------------------------------------------------------
                |
                | When Coming Soon is selected, products are shown through the
                | advertisement carousel above instead of being repeated below.
                |
                */}

                {filters.status ===
                    'coming_soon'
                    &&
                    comingSoonProducts.length >
                        0 && (
                    <section
                        className="
                            rounded-3xl
                            border
                            border-blue-100
                            bg-blue-50
                            px-6
                            py-5
                            text-center
                        "
                    >
                        <p
                            className="
                                text-sm
                                font-semibold
                                text-blue-700
                            "
                        >
                            Upcoming products
                            are displayed in the
                            Coming Soon
                            advertisement above.
                        </p>
                    </section>
                )}

                {/*
                |--------------------------------------------------------------------------
                | Empty State
                |--------------------------------------------------------------------------
                */}

                {homeProducts.total === 0 && (
                    <EmptyMerchandise
                        hasFilters={
                            hasFilters
                        }
                        clearFilters={() => {
                            setSearchInput('');

                            router.get(
                                '/student/dashboard',
                                {},
                                {
                                    preserveScroll:
                                        true,

                                    replace:
                                        true,
                                },
                            );
                        }}
                    />
                )}
            </div>
        </StudentLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Visit Dashboard
|--------------------------------------------------------------------------
*/

interface VisitDashboardFilters {
    search:
        string;

    status:
        string;
}

function visitDashboard({
    search,
    status,
}: VisitDashboardFilters): void {
    const query:
        Record<
            string,
            string
        > = {};

    const cleanedSearch =
        search.trim();

    if (
        cleanedSearch !== ''
    ) {
        query.search =
            cleanedSearch;
    }

    if (
        status !== ''
    ) {
        query.status =
            status;
    }

    router.get(
        '/student/dashboard',
        query,
        {
            preserveScroll:
                true,

            preserveState:
                true,

            replace:
                true,
        },
    );
}

/*
|--------------------------------------------------------------------------
| Product Action
|--------------------------------------------------------------------------
*/

function ProductAction({
    product,
}: {
    product: CatalogProduct;
}) {
    const label =
        product
            .availability_status ===
        'coming_soon'
            ? product
                  .accepts_preorders
                ? 'View Preorder'
                : 'View Product'
            : product
                    .availability_status
                === 'out_of_stock'
              ? 'View Product'
              : 'View & Order';

    return (
        <Link
            href={
                `/catalog/${product.id}`
            }
            className="
                flex
                w-full
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
            <Eye size={18} />

            {label}
        </Link>
    );
}

/*
|--------------------------------------------------------------------------
| Availability Filter Button
|--------------------------------------------------------------------------
*/

function StatusButton({
    label,
    value,
    activeStatus,
    onClick,
}: {
    label: string;

    value:
        string;

    activeStatus:
        string;

    onClick:
        (
            status:
                string,
        ) => void;
}) {
    const active =
        activeStatus === value;

    return (
        <button
            type="button"
            onClick={() =>
                onClick(value)
            }
            className={`
                rounded-full
                border
                px-4
                py-2
                text-sm
                font-semibold
                transition

                ${
                    active
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                }
            `}
        >
            {label}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

interface DashboardPaginationProps {
    links:
        PaginationLink[];
}

function DashboardPagination({
    links,
}: DashboardPaginationProps) {
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

                    if (!link.url) {
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
                                {label}
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
                            {label}
                        </Link>
                    );
                },
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Empty Merchandise
|--------------------------------------------------------------------------
*/

function EmptyMerchandise({
    hasFilters,
    clearFilters,
}: {
    hasFilters: boolean;

    clearFilters:
        () => void;
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
            <PackageOpen
                size={44}
                className="
                    mx-auto
                    text-slate-300
                "
            />

            <h2
                className="
                    mt-5
                    text-xl
                    font-bold
                    text-slate-800
                "
            >
                {hasFilters
                    ? 'No matching merchandise'
                    : 'No merchandise available'}
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
                {hasFilters
                    ? 'Try another search term or clear the selected availability filter.'
                    : 'Available merchandise will appear here when products are added to PROWARE.'}
            </p>

            {hasFilters && (
                <button
                    type="button"
                    onClick={
                        clearFilters
                    }
                    className="
                        mt-6
                        inline-flex
                        items-center
                        justify-center
                        rounded-xl
                        bg-[#0D6EFD]
                        px-5
                        py-3
                        text-sm
                        font-bold
                        text-white
                        transition
                        hover:bg-blue-700
                    "
                >
                    Show All Merchandise
                </button>
            )}
        </section>
    );
}
