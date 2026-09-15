import {
    PackageOpen,
    Plus,
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

import AdminProductActions from '@/components/products/AdminProductActions';
import ProductCard from '@/components/products/ProductCard';

import type {
    ProductCardProduct,
} from '@/components/products/ProductCard';

import AdminLayout from '@/layouts/AdminLayout';

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

interface ProductsPagination {
    data:
        ProductCardProduct[];

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

interface ProductFilters {
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

interface ProductsIndexProps {
    products:
        ProductsPagination;

    filters:
        ProductFilters;

    availabilityStatuses:
        AvailabilityStatusOption[];
}

/*
|--------------------------------------------------------------------------
| Products Page
|--------------------------------------------------------------------------
*/

export default function Index({
    products,
    filters,
    availabilityStatuses,
}: ProductsIndexProps) {
    return (
        <AdminLayout>
            <Head
                title="Products"
            />

            <div
                className="
                    space-y-7
                "
            >
                <PageHeader />

                <ProductToolbar
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
                            {products.data.map(
                                (
                                    product,
                                ) => (
                                    <ProductCard
                                        key={
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                        actions={
                                            <ProductActions
                                                product={
                                                    product
                                                }
                                            />
                                        }
                                    />
                                ),
                            )}
                        </section>

                        <Pagination
                            links={
                                products.links
                            }
                        />
                    </>
                ) : (
                    <EmptyProducts />
                )}
            </div>
        </AdminLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Page Header
|--------------------------------------------------------------------------
*/

function PageHeader() {
    return (
        <div
            className="
                flex
                flex-col
                justify-between
                gap-4
                sm:flex-row
                sm:items-center
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
                    Merchandise Products
                </h1>

                <p
                    className="
                        mt-2
                        max-w-2xl
                        text-sm
                        leading-6
                        text-slate-500
                    "
                >
                    Create official merchandise,
                    edit product information,
                    manage existing variants,
                    control catalog availability,
                    configure student preorders,
                    and receive stock.
                </p>
            </div>

            <Link
                href="/admin/products/create"
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
                <Plus
                    size={19}
                />

                Add Product
            </Link>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Product Actions
|--------------------------------------------------------------------------
*/

function ProductActions({
    product,
}: {
    product:
        ProductCardProduct;
}) {
    return (
        <div
            className="
                w-full
            "
            onClick={(
                event,
            ) => {
                event.stopPropagation();
            }}
        >
            <AdminProductActions
                product={
                    product
                }
            />
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Product Toolbar
|--------------------------------------------------------------------------
*/

interface ProductToolbarProps {
    total:
        number;

    filters:
        ProductFilters;

    availabilityStatuses:
        AvailabilityStatusOption[];
}

function ProductToolbar({
    total,
    filters,
    availabilityStatuses,
}: ProductToolbarProps) {
    const [
        search,
        setSearch,
    ] =
        useState(
            filters.search,
        );

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    const submitSearch =
        (
            event:
                FormEvent<HTMLFormElement>,
        ): void => {
            event.preventDefault();

            visitProducts({
                search,

                status:
                    filters.status,
            });
        };

    /*
    |--------------------------------------------------------------------------
    | Availability Filter
    |--------------------------------------------------------------------------
    */

    const selectStatus =
        (
            status:
                string,
        ): void => {
            visitProducts({
                search,
                status,
            });
        };

    /*
    |--------------------------------------------------------------------------
    | Clear Filters
    |--------------------------------------------------------------------------
    */

    const clearFilters =
        (): void => {
            setSearch(
                '',
            );

            router.get(
                '/admin/products',
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
                                font-black
                                text-slate-900
                            "
                        >
                            Product Catalog Manager
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
                                sm:w-80
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

                {/* STATUS FILTERS */}
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
| Empty Products
|--------------------------------------------------------------------------
*/

function EmptyProducts() {
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
                No products yet
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
                Create the first PROWARE
                merchandise product and configure
                its variants, catalog availability,
                preorder settings, and inventory
                tracking.
            </p>

            <Link
                href="/admin/products/create"
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
                <Plus
                    size={18}
                />

                Add Product
            </Link>
        </section>
    );
}

/*
|--------------------------------------------------------------------------
| Visit Products
|--------------------------------------------------------------------------
*/

interface VisitProductFilters {
    search:
        string;

    status:
        string;
}

function visitProducts({
    search,
    status,
}: VisitProductFilters): void {
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
        '/admin/products',
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

interface PaginationProps {
    links:
        PaginationLink[];
}

function Pagination({
    links,
}: PaginationProps) {
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