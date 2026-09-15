import {
    Eye,
    PackageOpen,
    Search,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
    usePage,
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
import CatalogLayout from '@/layouts/CatalogLayout';


/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type UserRole =
    | 'admin'
    | 'specialist'
    | 'cashier'
    | 'student';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface CatalogPagination {
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

interface CatalogFilters {
    search:
        string;

    status:
        string;
}

interface AvailabilityStatusOption {
    value:
        string;

    label:
        string;
}

interface SharedPageProps {
    [key: string]:
        unknown;

    auth?: {
        user?: {
            id:
                number;

            name:
                string;

            email:
                string;

            role:
                UserRole;
        };
    };
}

interface CatalogIndexProps {
    products:
        CatalogPagination;

    comingSoonProducts:
        CatalogProduct[];

    filters:
        CatalogFilters;

    availabilityStatuses:
        AvailabilityStatusOption[];
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({
    products,
    comingSoonProducts,
    filters,
    availabilityStatuses,
}: CatalogIndexProps) {

    const page =
        usePage<SharedPageProps>();

    const currentRole =
        page.props.auth?.user?.role
        ?? 'student';

const regularProducts =
    products.data.filter(
        (product) =>
            product.availability_status !==
            'coming_soon',
    );



    return (
        <CatalogLayout>
            <Head
                title="Merchandise Catalog"
            />

            <div
                className="
                    space-y-7
                "
            >
                <CatalogHeader
                    role={
                        currentRole
                    }
                />


{comingSoonProducts.length > 0 && (
    <ComingSoonCarousel
        products={
            comingSoonProducts
        }
    />
)}

                <CatalogToolbar
                    total={
                        products.total
                    }
                    filters={
                        filters
                    }
                    availabilityStatuses={
                        availabilityStatuses
                    }
                />

                {products.data.length >
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
                                            <CatalogProductAction
                                                product={
                                                    product
                                                }
                                                role={
                                                    currentRole
                                                }
                                            />
                                        }
                                    />
                                ),
                            )}
                        </section>

                        <CatalogPagination
                            links={
                                products.links
                            }
                        />
                    </>
                ) : (
                    <EmptyCatalog
                        hasFilters={
                            filters.search !== ''
                            ||
                            filters.status !== ''
                        }
                    />
                )}
            </div>
        </CatalogLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Catalog Header
|--------------------------------------------------------------------------
*/

interface CatalogHeaderProps {
    role:
        UserRole;
}

function CatalogHeader({
    role,
}: CatalogHeaderProps) {
    const description =
        role ===
        'specialist'
            ? 'Browse merchandise and review products for student-assisted ordering.'
            : role ===
                'admin'
              ? 'Review the merchandise catalog shown to students and staff.'
              : role ===
                  'cashier'
                ? 'Browse merchandise relevant to order processing.'
                : 'Browse official STI merchandise, available products, and upcoming preorder items.';

    return (
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
            <div
                className="
                    max-w-3xl
                "
            >
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
                    Merchandise Catalog
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
                    {description}
                </p>
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Product Action
|--------------------------------------------------------------------------
|
| Actual ordering/preordering happens on Show.tsx.
|--------------------------------------------------------------------------
*/

function CatalogProductAction({
    product,
    role,
}: {
    product:
        CatalogProduct;

    role:
        UserRole;
}) {
    let label =
        'View Product';

    if (
        role ===
        'student'
    ) {
        label =
            product.availability_status ===
            'coming_soon'
                ? 'View Preorder'
                : 'View & Order';
    }

    if (
        role ===
        'specialist'
    ) {
        label =
            'View Merchandise';
    }

    return (
        <Link
            href={`/catalog/${product.id}`}
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
            <Eye
                size={18}
            />

            {label}
        </Link>
    );
}

/*
|--------------------------------------------------------------------------
| Toolbar
|--------------------------------------------------------------------------
*/

interface CatalogToolbarProps {
    total:
        number;

    filters:
        CatalogFilters;

    availabilityStatuses:
        AvailabilityStatusOption[];
}

function CatalogToolbar({
    total,
    filters,
    availabilityStatuses,
}: CatalogToolbarProps) {
    const [
        search,
        setSearch,
    ] =
        useState(
            filters.search,
        );

    const submitSearch =
        (
            event:
                FormEvent<HTMLFormElement>,
        ): void => {
            event.preventDefault();

            visitCatalog({
                search,

                status:
                    filters.status,
            });
        };

    const selectStatus =
        (
            status:
                string,
        ): void => {
            visitCatalog({
                search,
                status,
            });
        };

    const clearFilters =
        (): void => {
            setSearch(
                '',
            );

            router.get(
                '/catalog',
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

    const hasFilters =
        filters.search !== ''
        ||
        filters.status !== '';

    return (
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
                                font-bold
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
                            {total}{' '}
                            matching product
                            {total === 1
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
                                onClick={
                                    clearFilters
                                }
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
                    {availabilityStatuses.map(
                        (
                            status,
                        ) => {
                            const active =
                                filters.status
                                ===
                                status.value;

                            return (
                                <button
                                    key={
                                        status.value
                                        ||
                                        'all'
                                    }
                                    type="button"
                                    onClick={() =>
                                        selectStatus(
                                            status.value,
                                        )
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
                                    {
                                        status.label
                                    }
                                </button>
                            );
                        },
                    )}
                </div>
            </div>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Empty Catalog
|--------------------------------------------------------------------------
*/

interface EmptyCatalogProps {
    hasFilters:
        boolean;
}

function EmptyCatalog({
    hasFilters,
}: EmptyCatalogProps) {
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
                    : 'Catalog products will appear here after the administrator activates them.'}
            </p>

            {hasFilters && (
                <button
                    type="button"
                    onClick={() =>
                        router.get(
                            '/catalog',
                            {},
                            {
                                preserveScroll:
                                    true,

                                replace:
                                    true,
                            },
                        )
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

/*
|--------------------------------------------------------------------------
| Visit Catalog
|--------------------------------------------------------------------------
*/

interface VisitCatalogFilters {
    search:
        string;

    status:
        string;
}

function visitCatalog({
    search,
    status,
}: VisitCatalogFilters): void {
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
        '/catalog',
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
| Pagination
|--------------------------------------------------------------------------
*/

interface CatalogPaginationProps {
    links:
        PaginationLink[];
}

function CatalogPagination({
    links,
}: CatalogPaginationProps) {
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