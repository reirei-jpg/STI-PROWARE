

import type {
    PageProps as InertiaPageProps,
} from '@inertiajs/core';
import {
    Head,
    router,
    useForm,
    usePage,
} from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowLeft,
    ArrowUpFromLine,
    ChevronLeft,
    ChevronRight,
    History,
    PackageSearch,
    Search,
    SlidersHorizontal,
    TrendingUp,
} from 'lucide-react';

import {
    
    
    useEffect,
    useState
} from 'react';
import type {FormEvent, ReactNode} from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type MovementDirection =
    | 'in'
    | 'out'
    | 'neutral';

type DirectionFilter =
    | 'all'
    | 'in'
    | 'out';

interface ProductInfo {
    id: number | null;
    code: string;
    name: string;
    category: string | null;
}

interface VariantInfo {
    id: number | null;
    sku: string;
    variant_name: string;
    program: string | null;
    size: string | null;
}

interface PerformerInfo {
    id: number | null;
    name: string;
}

interface AdjustableVariant {
    id: number;
    sku: string;
    display_name: string;
}

interface AdjustableProduct {
    id: number;
    code: string;
    name: string;
    display_name: string;
    variants: AdjustableVariant[];
}

interface StockMovement {
    id: number;

    movement_type: string;

    direction:
        MovementDirection;

    quantity_change:
        number;

    quantity_before:
        number;

    quantity_after:
        number;

    receipt_number:
        string | null;

    supplier_reference_number:
        string | null;

    notes:
        string | null;

    created_at:
        string | null;

    product:
        ProductInfo;

    variant:
        VariantInfo;

    performed_by:
        PerformerInfo;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedMovements {
    current_page:
        number;

    data:
        StockMovement[];

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

interface MovementSummary {
    stock_in:
        number;

    stock_out:
        number;

    net_movement:
        number;

    movement_count:
        number;
}

interface MovementFilters {
    search:
        string;

    direction:
        DirectionFilter;
}

interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface SharedPageProps
    extends InertiaPageProps {
    auth?: {
        user?:
            AuthUser | null;
    };
}

interface MovementPageProps {
    movements:
        PaginatedMovements;

    summary:
        MovementSummary;

    filters:
        MovementFilters;

    products:
        AdjustableProduct[];
}

/*
|--------------------------------------------------------------------------
| Stock Movement Page
|--------------------------------------------------------------------------
*/

export default function Movements({
    movements,
    summary,
    filters,
    products,
}: MovementPageProps) {
    const page =
        usePage<SharedPageProps>();

    const role =
        page.props.auth
            ?.user
            ?.role
        ?? 'specialist';

    const isAdmin =
        role === 'admin' ||
        role === 'super_admin';

    const {
        notification,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();

    const [
        search,
        setSearch,
    ] =
        useState(
            filters.search
            ?? '',
        );

    const directionFilter =
        filters.direction
        ?? 'all';

    /*
    |--------------------------------------------------------------------------
    | Inventory Adjustment
    |--------------------------------------------------------------------------
    |
    | Admin-only. The only way to change quantity_on_hand
    | outside of a purchase-order receipt, a sale, or a
    | release — so it requires a written reason.
    |
    */

    const [
        showAdjustModal,
        setShowAdjustModal,
    ] = useState(false);

    const [
        showAdjustConfirm,
        setShowAdjustConfirm,
    ] = useState(false);

    const adjustForm =
        useForm<{
            product_variant_id: string;
            direction: 'increase' | 'decrease';
            quantity: string;
            reason: string;
        }>({
            product_variant_id: '',
            direction: 'increase',
            quantity: '',
            reason: '',
        });

    const openAdjustModal = (): void => {
        adjustForm.reset();
        adjustForm.clearErrors();
        setShowAdjustModal(true);
    };

    const closeAdjustModal = (): void => {
        setShowAdjustModal(false);
        adjustForm.reset();
        adjustForm.clearErrors();
    };

    const submitAdjustment = (
        event: FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (
            !adjustForm.data.product_variant_id ||
            !adjustForm.data.quantity ||
            !adjustForm.data.reason
        ) {
            return;
        }

        setShowAdjustConfirm(true);
    };

    const confirmAdjustment = (): void => {
        if (adjustForm.processing) {
            return;
        }

        adjustForm.post(
            '/staff/inventory/adjustments',
            {
                preserveScroll: true,

                onSuccess: () => {
                    setShowAdjustConfirm(false);
                    setShowAdjustModal(false);
                    adjustForm.reset();

                    showSuccess(
                        'Inventory adjustment recorded successfully.',
                    );
                },

                onError: (errors) => {
                    setShowAdjustConfirm(false);

                    const firstError =
                        Object.values(errors)[0];

                    showError(
                        typeof firstError === 'string'
                            ? firstError
                            : 'Inventory could not be adjusted. Please check the form and try again.',
                    );
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Debounced Search
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        const timeout =
            window.setTimeout(
                () => {
                    const normalizedSearch =
                        search.trim();

                    const currentSearch =
                        filters.search
                        ?? '';

                    if (
                        normalizedSearch
                        ===
                        currentSearch
                    ) {
                        return;
                    }

                    router.get(
                        '/staff/inventory/movements',
                        {
                            search:
                                normalizedSearch
                                || undefined,

                            direction:
                                directionFilter ===
                                'all'
                                    ? undefined
                                    : directionFilter,
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
        directionFilter,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Direction Filter
    |--------------------------------------------------------------------------
    */

    const changeDirection = (
        direction:
            DirectionFilter,
    ): void => {
        router.get(
            '/staff/inventory/movements',
            {
                search:
                    search.trim()
                    || undefined,

                direction:
                    direction === 'all'
                        ? undefined
                        : direction,
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

    const visitPage = (
        url:
            string | null,
    ): void => {
        if (!url) {
            return;
        }

        router.visit(
            url,
            {
                preserveState:
                    true,

                preserveScroll:
                    true,
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Shared Content
    |--------------------------------------------------------------------------
    */

    const selectedAdjustVariant =
        findAdjustableVariant(
            products,
            adjustForm.data
                .product_variant_id,
        );

    const content = (
        <>
            <Head
                title="Stock In / Stock Out"
            />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

            {showAdjustModal && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[100]
                        flex
                        items-center
                        justify-center
                        bg-slate-950/40
                        px-4
                        backdrop-blur-sm
                    "
                >
                    <form
                        onSubmit={submitAdjustment}
                        className="
                            w-full
                            max-w-lg
                            space-y-5
                            rounded-3xl
                            bg-white
                            p-6
                            shadow-2xl
                        "
                    >
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                Inventory Adjustment
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                Adjust Stock
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Use this only to correct a physical
                                count. It is not a receipt — it has no
                                purchase order behind it, so a reason
                                is required and it never changes the
                                recorded purchasing cost.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="adjust_product_variant_id"
                                className="mb-2 block text-sm font-bold text-slate-700"
                            >
                                Product variant
                            </label>

                            <select
                                id="adjust_product_variant_id"
                                value={
                                    adjustForm.data
                                        .product_variant_id
                                }
                                onChange={(event) =>
                                    adjustForm.setData(
                                        'product_variant_id',
                                        event.target.value,
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="">
                                    Select product variant
                                </option>

                                {products.map((product) => (
                                    <optgroup
                                        key={product.id}
                                        label={
                                            product.display_name
                                        }
                                    >
                                        {product.variants.map(
                                            (variant) => (
                                                <option
                                                    key={variant.id}
                                                    value={variant.id}
                                                >
                                                    {variant.display_name} — {variant.sku}
                                                </option>
                                            ),
                                        )}
                                    </optgroup>
                                ))}
                            </select>

                            {adjustForm.errors
                                .product_variant_id && (
                                <p className="mt-2 text-sm text-red-600">
                                    {
                                        adjustForm.errors
                                            .product_variant_id
                                    }
                                </p>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="adjust_direction"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    Direction
                                </label>

                                <select
                                    id="adjust_direction"
                                    value={
                                        adjustForm.data
                                            .direction
                                    }
                                    onChange={(event) =>
                                        adjustForm.setData(
                                            'direction',
                                            event.target
                                                .value as
                                                | 'increase'
                                                | 'decrease',
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="increase">
                                        Increase
                                    </option>

                                    <option value="decrease">
                                        Decrease
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label
                                    htmlFor="adjust_quantity"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    Quantity
                                </label>

                                <input
                                    id="adjust_quantity"
                                    type="number"
                                    min={1}
                                    value={
                                        adjustForm.data
                                            .quantity
                                    }
                                    onChange={(event) =>
                                        adjustForm.setData(
                                            'quantity',
                                            event.target
                                                .value,
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                />

                                {adjustForm.errors
                                    .quantity && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {
                                            adjustForm.errors
                                                .quantity
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        {selectedAdjustVariant && (
                            <p className="text-xs font-semibold text-slate-500">
                                {
                                    selectedAdjustVariant.display_name
                                }{' '}
                                — {selectedAdjustVariant.sku}
                            </p>
                        )}

                        <div>
                            <label
                                htmlFor="adjust_reason"
                                className="mb-2 block text-sm font-bold text-slate-700"
                            >
                                Reason
                            </label>

                            <textarea
                                id="adjust_reason"
                                rows={3}
                                value={
                                    adjustForm.data.reason
                                }
                                onChange={(event) =>
                                    adjustForm.setData(
                                        'reason',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. Physical count found 3 fewer units than recorded during monthly inventory check."
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />

                            {adjustForm.errors.reason && (
                                <p className="mt-2 text-sm text-red-600">
                                    {
                                        adjustForm.errors
                                            .reason
                                    }
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={closeAdjustModal}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                                Review Adjustment
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ActionConfirmModal
                open={showAdjustConfirm}
                title="Confirm Inventory Adjustment?"
                message={`This will ${adjustForm.data.direction} stock by ${adjustForm.data.quantity || 'the entered quantity'} unit(s) with no purchase order behind it. This action is logged with your name and the reason given.`}
                confirmText="Confirm Adjustment"
                processingText="Adjusting..."
                processing={adjustForm.processing}
                tone="danger"
                onCancel={() =>
                    setShowAdjustConfirm(false)
                }
                onConfirm={confirmAdjustment}
            />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-7
                "
            >
                {/* HEADER */}
                <section
                    className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-start
                        lg:justify-between
                    "
                >
                    <div>
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
                            Stock In / Stock Out
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
                            Review the complete physical
                            inventory movement history for
                            PROWARE merchandise, including
                            receiving, releases, returns,
                            and inventory adjustments.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={openAdjustModal}
                                className="
                                    inline-flex
                                    shrink-0
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-blue-600
                                    bg-blue-600
                                    px-4
                                    py-3
                                    text-sm
                                    font-bold
                                    text-white
                                    shadow-sm
                                    transition
                                    hover:bg-blue-700
                                "
                            >
                                <SlidersHorizontal
                                    size={18}
                                />

                                Adjust Stock
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() =>
                                router.visit(
                                    '/staff/inventory',
                                )
                            }
                            className="
                                inline-flex
                                shrink-0
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-3
                                text-sm
                                font-bold
                                text-slate-700
                                shadow-sm
                                transition
                                hover:border-blue-200
                                hover:bg-blue-50
                                hover:text-blue-700
                            "
                        >
                            <ArrowLeft
                                size={18}
                            />

                            Inventory Overview
                        </button>
                    </div>
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
                        label="Stock In"
                        value={
                            summary
                                .stock_in
                        }
                        description="Total physical units added to inventory"
                        icon={
                            ArrowDownToLine
                        }
                        tone="green"
                    />

                    <SummaryCard
                        label="Stock Out"
                        value={
                            summary
                                .stock_out
                        }
                        description="Total physical units removed from inventory"
                        icon={
                            ArrowUpFromLine
                        }
                        tone="red"
                    />

                    <SummaryCard
                        label="Net Movement"
                        value={
                            summary
                                .net_movement
                        }
                        description="Stock In minus Stock Out across all movements"
                        icon={
                            TrendingUp
                        }
                        tone="blue"
                        signed
                    />

                    <SummaryCard
                        label="Movements"
                        value={
                            summary
                                .movement_count
                        }
                        description="Total recorded inventory movement entries"
                        icon={
                            History
                        }
                        tone="slate"
                    />
                </section>

                {/* INFORMATION */}
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
                            <History
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
                                Inventory Movement Ledger
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    leading-6
                                    text-blue-800
                                "
                            >
                                Stock In represents physical
                                inventory increases, while
                                Stock Out represents physical
                                inventory decreases. This
                                history is generated from
                                PROWARE Stock Movement
                                records.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SEARCH + FILTER */}
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
                                placeholder="Search product, SKU, receipt, reference, performer..."
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
                                    directionFilter
                                    ===
                                    'all'
                                }
                                onClick={() =>
                                    changeDirection(
                                        'all',
                                    )
                                }
                            >
                                All Movements
                            </FilterButton>

                            <FilterButton
                                active={
                                    directionFilter
                                    ===
                                    'in'
                                }
                                onClick={() =>
                                    changeDirection(
                                        'in',
                                    )
                                }
                            >
                                Stock In
                            </FilterButton>

                            <FilterButton
                                active={
                                    directionFilter
                                    ===
                                    'out'
                                }
                                onClick={() =>
                                    changeDirection(
                                        'out',
                                    )
                                }
                            >
                                Stock Out
                            </FilterButton>
                        </div>
                    </div>
                </section>

                {/* MOVEMENT TABLE */}
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
                                flex-col
                                gap-3
                                sm:flex-row
                                sm:items-center
                                sm:justify-between
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
                                    Movement History
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    {
                                        movements
                                            .total
                                    }{' '}
                                    movement
                                    {
                                        movements
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
                                <History
                                    size={21}
                                />
                            </div>
                        </div>
                    </div>

                    {movements
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
                                        min-w-full
                                    "
                                >
                                    <thead
                                        className="
                                            bg-slate-50
                                        "
                                    >
                                        <tr>
                                            <TableHeader>
                                                Date
                                            </TableHeader>

                                            <TableHeader>
                                                Product
                                            </TableHeader>

                                            <TableHeader>
                                                Variant / SKU
                                            </TableHeader>

                                            <TableHeader>
                                                Movement
                                            </TableHeader>

                                            <TableHeader
                                                align="center"
                                            >
                                                Quantity
                                            </TableHeader>

                                            <TableHeader
                                                align="center"
                                            >
                                                Before
                                            </TableHeader>

                                            <TableHeader
                                                align="center"
                                            >
                                                After
                                            </TableHeader>

                                            <TableHeader>
                                                Receipt / Reference
                                            </TableHeader>

                                            <TableHeader>
                                                Performed By
                                            </TableHeader>

                                            <TableHeader>
                                                Notes
                                            </TableHeader>
                                        </tr>
                                    </thead>

                                    <tbody
                                        className="
                                            divide-y
                                            divide-slate-100
                                        "
                                    >
                                        {movements
                                            .data
                                            .map(
                                                (
                                                    movement,
                                                ) => (
                                                    <MovementRow
                                                        key={
                                                            movement.id
                                                        }
                                                        movement={
                                                            movement
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
                                                movements
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
                                                movements
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
                                                movements
                                                    .total
                                            }
                                        </span>{' '}
                                        records
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
                                                !movements
                                                    .prev_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    movements
                                                        .prev_page_url,
                                                )
                                            }
                                            className="
                                                inline-flex
                                                items-center
                                                gap-2
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
                                            <ChevronLeft
                                                size={
                                                    17
                                                }
                                            />

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
                                                movements
                                                    .current_page
                                            }{' '}
                                            of{' '}
                                            {
                                                movements
                                                    .last_page
                                            }
                                        </div>

                                        <button
                                            type="button"
                                            disabled={
                                                !movements
                                                    .next_page_url
                                            }
                                            onClick={() =>
                                                visitPage(
                                                    movements
                                                        .next_page_url,
                                                )
                                            }
                                            className="
                                                inline-flex
                                                items-center
                                                gap-2
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

                                            <ChevronRight
                                                size={
                                                    17
                                                }
                                            />
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
                            <PackageSearch
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
                                No stock movements found
                            </h3>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                Try changing your search
                                or Stock In / Stock Out
                                filter.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </>
    );

    /*
    |--------------------------------------------------------------------------
    | Correct Role Layout
    |--------------------------------------------------------------------------
    */

            if (
                role === 'admin'
                || role === 'super_admin'
            ) {
                return (
                    <AdminLayout>
                        {content}
                    </AdminLayout>
                );
            }

    return (
        <SpecialistLayout>
            {content}
        </SpecialistLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Movement Row
|--------------------------------------------------------------------------
*/

function MovementRow({
    movement,
}: {
    movement:
        StockMovement;
}) {
    return (
        <tr
            className="
                transition
                hover:bg-slate-50/70
            "
        >
            {/* DATE */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                "
            >
                <p
                    className="
                        text-sm
                        font-bold
                        text-slate-700
                    "
                >
                    {
                        movement
                            .created_at
                        ?? 'N/A'
                    }
                </p>
            </td>

            {/* PRODUCT */}
            <td
                className="
                    min-w-56
                    px-6
                    py-5
                "
            >
                <p
                    className="
                        font-mono
                        text-xs
                        font-black
                        text-blue-600
                    "
                >
                    {
                        movement
                            .product
                            .code
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-black
                        text-slate-900
                    "
                >
                    {
                        movement
                            .product
                            .name
                    }
                </p>

                {movement
                    .product
                    .category && (
                    <p
                        className="
                            mt-1
                            text-xs
                            text-slate-400
                        "
                    >
                        {
                            movement
                                .product
                                .category
                        }
                    </p>
                )}
            </td>

            {/* VARIANT / SKU */}
            <td
                className="
                    min-w-48
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
                        movement
                            .variant
                            .variant_name
                    }
                </p>

                <p
                    className="
                        mt-1
                        font-mono
                        text-xs
                        font-bold
                        text-slate-500
                    "
                >
                    {
                        movement
                            .variant
                            .sku
                    }
                </p>

                <div
                    className="
                        mt-2
                        space-y-0.5
                        text-xs
                        text-slate-400
                    "
                >
                    {movement
                        .variant
                        .program && (
                        <p>
                            Program:{' '}
                            {
                                movement
                                    .variant
                                    .program
                            }
                        </p>
                    )}

                    {movement
                        .variant
                        .size && (
                        <p>
                            Size:{' '}
                            {
                                movement
                                    .variant
                                    .size
                            }
                        </p>
                    )}
                </div>
            </td>

            {/* MOVEMENT */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                "
            >
                <DirectionBadge
                    direction={
                        movement
                            .direction
                    }
                />

                <p
                    className="
                        mt-2
                        text-xs
                        font-bold
                        uppercase
                        tracking-wide
                        text-slate-400
                    "
                >
                    {
                        formatMovementType(
                            movement
                                .movement_type,
                        )
                    }
                </p>
            </td>

            {/* QUANTITY */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                    text-center
                "
            >
                <QuantityChange
                    value={
                        movement
                            .quantity_change
                    }
                />
            </td>

            {/* BEFORE */}
            <NumberCell
                value={
                    movement
                        .quantity_before
                }
            />

            {/* AFTER */}
            <NumberCell
                value={
                    movement
                        .quantity_after
                }
                emphasized
            />

            {/* RECEIPT / REFERENCE */}
            <td
                className="
                    min-w-48
                    px-6
                    py-5
                "
            >
                {movement
                    .receipt_number ? (
                    <p
                        className="
                            font-mono
                            text-xs
                            font-black
                            text-blue-600
                        "
                    >
                        {
                            movement
                                .receipt_number
                        }
                    </p>
                ) : (
                    <p
                        className="
                            text-xs
                            font-semibold
                            text-slate-400
                        "
                    >
                        No receipt
                    </p>
                )}

                {movement
                    .supplier_reference_number && (
                    <p
                        className="
                            mt-2
                            text-xs
                            text-slate-500
                        "
                    >
                        Ref:{' '}
                        <span
                            className="
                                font-bold
                                text-slate-700
                            "
                        >
                            {
                                movement
                                    .supplier_reference_number
                            }
                        </span>
                    </p>
                )}
            </td>

            {/* PERFORMED BY */}
            <td
                className="
                    whitespace-nowrap
                    px-6
                    py-5
                "
            >
                <p
                    className="
                        text-sm
                        font-bold
                        text-slate-800
                    "
                >
                    {
                        movement
                            .performed_by
                            .name
                    }
                </p>
            </td>

            {/* NOTES */}
            <td
                className="
                    min-w-56
                    px-6
                    py-5
                "
            >
                <p
                    className="
                        max-w-xs
                        whitespace-normal
                        text-xs
                        leading-5
                        text-slate-500
                    "
                >
                    {
                        movement
                            .notes
                        ?? '—'
                    }
                </p>
            </td>
        </tr>
    );
}

/*
|--------------------------------------------------------------------------
| Direction Badge
|--------------------------------------------------------------------------
*/

function DirectionBadge({
    direction,
}: {
    direction:
        MovementDirection;
}) {
    if (
        direction ===
        'in'
    ) {
        return (
            <span
                className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    bg-emerald-100
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-emerald-700
                "
            >
                <ArrowDownToLine
                    size={14}
                />

                STOCK IN
            </span>
        );
    }

    if (
        direction ===
        'out'
    ) {
        return (
            <span
                className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    bg-red-100
                    px-3
                    py-1.5
                    text-xs
                    font-black
                    text-red-700
                "
            >
                <ArrowUpFromLine
                    size={14}
                />

                STOCK OUT
            </span>
        );
    }

    return (
        <span
            className="
                inline-flex
                rounded-full
                bg-slate-100
                px-3
                py-1.5
                text-xs
                font-black
                text-slate-600
            "
        >
            NEUTRAL
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Quantity Change
|--------------------------------------------------------------------------
*/

function QuantityChange({
    value,
}: {
    value:
        number;
}) {
    const positive =
        value > 0;

    const negative =
        value < 0;

    return (
        <span
            className={`
                inline-flex
                min-w-16
                items-center
                justify-center
                rounded-xl
                px-3
                py-2
                text-base
                font-black

                ${
                    positive
                        ? 'bg-emerald-50 text-emerald-700'
                        : negative
                            ? 'bg-red-50 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                }
            `}
        >
            {positive
                ? `+${value}`
                : value}
        </span>
    );
}

/*
|--------------------------------------------------------------------------
| Number Cell
|--------------------------------------------------------------------------
*/

function NumberCell({
    value,
    emphasized = false,
}: {
    value:
        number;

    emphasized?:
        boolean;
}) {
    return (
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
                    bg-slate-100
                    px-3
                    py-2
                    text-slate-700

                    ${
                        emphasized
                            ? 'text-base font-black'
                            : 'text-sm font-bold'
                    }
                `}
            >
                {value}
            </span>
        </td>
    );
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

type SummaryTone =
    | 'green'
    | 'red'
    | 'blue'
    | 'slate';

interface SummaryCardProps {
    label: string;
    value: number;
    description: string;
    icon: typeof History;
    tone: SummaryTone;
    signed?: boolean;
}

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    tone,
    signed = false,
}: SummaryCardProps) {
    const styles:
        Record<
            SummaryTone,
            {
                border:
                    string;

                background:
                    string;

                icon:
                    string;

                value:
                    string;

                label:
                    string;
            }
        > = {
        green: {
            border:
                'border-emerald-100',

            background:
                'bg-emerald-50/40',

            icon:
                'bg-emerald-100 text-emerald-600',

            value:
                'text-emerald-700',

            label:
                'text-emerald-700',
        },

        red: {
            border:
                'border-red-100',

            background:
                'bg-red-50/40',

            icon:
                'bg-red-100 text-red-600',

            value:
                'text-red-700',

            label:
                'text-red-700',
        },

        blue: {
            border:
                'border-blue-100',

            background:
                'bg-blue-50/40',

            icon:
                'bg-blue-100 text-blue-600',

            value:
                'text-blue-700',

            label:
                'text-blue-700',
        },

        slate: {
            border:
                'border-slate-200',

            background:
                'bg-slate-50/60',

            icon:
                'bg-slate-200 text-slate-600',

            value:
                'text-slate-700',

            label:
                'text-slate-600',
        },
    };

    const style =
        styles[
            tone
        ];

    const displayValue =
        signed
        && value > 0
            ? `+${value}`
            : value;

    return (
        <article
            className={`
                rounded-3xl
                border
                ${style.border}
                ${style.background}
                p-5
                shadow-sm
                transition
                hover:-translate-y-0.5
                hover:shadow-md
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
                        className={`
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            ${style.label}
                        `}
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
                        {displayValue}
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
        ReactNode;
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
        ReactNode;

    align?:
        'left'
        | 'center';
}) {
    return (
        <th
            className={`
                whitespace-nowrap
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
| Movement Type Formatter
|--------------------------------------------------------------------------
*/

function formatMovementType(
    value:
        string,
): string {
    return value
        .replaceAll(
            '_',
            ' ',
        )
        .replace(
            /\b\w/g,
            (
                character,
            ) =>
                character
                    .toUpperCase(),
        );
}

/*
|--------------------------------------------------------------------------
| Find Adjustable Variant
|--------------------------------------------------------------------------
*/

function findAdjustableVariant(
    products: AdjustableProduct[],
    selectedVariantId: string,
): AdjustableVariant | null {
    if (!selectedVariantId) {
        return null;
    }

    for (const product of products) {
        const variant = product.variants.find(
            (candidate) =>
                String(candidate.id) ===
                selectedVariantId,
        );

        if (variant) {
            return variant;
        }
    }

    return null;
}