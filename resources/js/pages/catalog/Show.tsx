import {
    ArrowLeft,
    CalendarDays,
    Check,
    PackageOpen,
    PackagePlus,
    ShoppingCart,
    UserRoundPlus,
    X,
} from 'lucide-react';

import {
    Head,
    Link,
    useForm,
    usePage,
} from '@inertiajs/react';

import type {
    LucideIcon,
} from 'lucide-react';

import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import ProductStatusBadge from '@/components/products/ProductStatusBadge';
import CatalogLayout from '@/layouts/CatalogLayout';

import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type VariantMode =
    | 'program_and_size'
    | 'size_only'
    | 'standard';

type AvailabilityStatus =
    | 'available'
    | 'coming_soon'
    | 'out_of_stock';

type UserRole =
    | 'admin'
    | 'specialist'
    | 'cashier'
    | 'student';

interface CatalogCategory {
    id:
        number;

    name:
        string;
}

interface CatalogVariant {
    id:
        number;

    sku:
        string;

    program:
        string | null;

    size:
        string | null;

    variant_name:
        string;

    variant_key:
        string;

    selling_price:
        string;

    is_available:
        boolean;

    stock_status:
        string;
}

interface CatalogProduct {
    id:
        number;

    code:
        string;

    name:
        string;

    description:
        string | null;

    base_price:
        string;

    image_url:
        string | null;

    variant_mode:
        VariantMode;

    variant_mode_label:
        string;

    availability_status:
        AvailabilityStatus;

    availability_label:
        string;

    availability_summary:
        string;

    preorder_enabled:
        boolean;

    accepts_preorders:
        boolean;

    expected_release_date:
        string | null;

    category:
        CatalogCategory;

    variants:
        CatalogVariant[];
}

interface CatalogShowProps {
    product:
        CatalogProduct;
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

    flash?: {
        success?:
            string;

        error?:
            string;
    };
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Show({
    product,
}: CatalogShowProps) {
    const page =
        usePage<SharedPageProps>();


    const {
    notification,
    startProcessing,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();

    const currentRole =
        page.props.auth
            ?.user
            ?.role
        ?? 'student';

    const [
        selectedProgram,
        setSelectedProgram,
    ] =
        useState(
            '',
        );

    const [
        selectedSize,
        setSelectedSize,
    ] =
        useState(
            '',
        );

    const [
        quantityInput,
        setQuantityInput,
    ] =
        useState(
            '1',
        );

    /*
    |--------------------------------------------------------------------------
    | Quantity Helper
    |--------------------------------------------------------------------------
    |
    | The input is kept as free text while the student is typing so
    | that clearing the default "1" does not immediately snap back
    | to "1" before a new number can be entered. The value is only
    | clamped to a valid 1-99 quantity when it is actually needed.
    |
    */

    const resolveQuantity =
        (
            rawValue:
                string,
        ): number => {
            const parsed =
                parseInt(
                    rawValue,
                    10,
                );

            if (
                Number.isNaN(
                    parsed,
                )
            ) {
                return 1;
            }

            return Math.min(
                99,
                Math.max(
                    1,
                    parsed,
                ),
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Cap While Typing
    |--------------------------------------------------------------------------
    |
    | Growing past the maximum is stopped immediately as the
    | student types, since more digits can only make an already
    | too-large number larger. Clearing the field to type a new
    | number is still allowed, since fewer digits can still
    | resolve into a valid quantity.
    |
    */

    const capQuantityInput =
        (
            rawValue:
                string,
        ): string => {
            if (
                rawValue ===
                ''
            ) {
                return '';
            }

            const parsed =
                parseInt(
                    rawValue,
                    10,
                );

            if (
                Number.isNaN(
                    parsed,
                )
            ) {
                return rawValue;
            }

            return parsed > 99
                ? '99'
                : rawValue;
        };


    const cartForm =
        useForm({
            product_variant_id:
                '',

            quantity:
                1,
        });

    /*
    |--------------------------------------------------------------------------
    | Flash Messages
    |--------------------------------------------------------------------------
    */

    
    /*
    |--------------------------------------------------------------------------
    | Program Options
    |--------------------------------------------------------------------------
    */

    const programs =
        useMemo(
            () =>
                uniqueValues(
                    product.variants.map(
                        (
                            variant,
                        ) =>
                            variant.program,
                    ),
                ),
            [
                product.variants,
            ],
        );

    /*
    |--------------------------------------------------------------------------
    | Size Options
    |--------------------------------------------------------------------------
    */

    const sizes =
        useMemo(
            () => {
                if (
                    product.variant_mode ===
                        'program_and_size'
                    &&
                    selectedProgram !== ''
                ) {
                    return uniqueValues(
                        product.variants
                            .filter(
                                (
                                    variant,
                                ) =>
                                    variant.program
                                    ===
                                    selectedProgram,
                            )
                            .map(
                                (
                                    variant,
                                ) =>
                                    variant.size,
                            ),
                    );
                }

                return uniqueValues(
                    product.variants.map(
                        (
                            variant,
                        ) =>
                            variant.size,
                    ),
                );
            },
            [
                product.variant_mode,
                product.variants,
                selectedProgram,
            ],
        );

    /*
    |--------------------------------------------------------------------------
    | Selected Variant
    |--------------------------------------------------------------------------
    */

    const selectedVariant =
        useMemo(
            () =>
                findSelectedVariant({
                    variants:
                        product.variants,

                    mode:
                        product.variant_mode,

                    selectedProgram,

                    selectedSize,
                }),
            [
                product.variant_mode,
                product.variants,
                selectedProgram,
                selectedSize,
            ],
        );

    /*
    |--------------------------------------------------------------------------
    | Action State
    |--------------------------------------------------------------------------
    */

    const actionState =
        getActionState({
            product,

            selectedVariant,

            role:
                currentRole,
        });

    const selectionComplete =
        selectedVariant !==
        null;

    const displayedPrice =
        selectedVariant
            ?.selling_price
        ??
        product.base_price;

    /*
    |--------------------------------------------------------------------------
    | Select Program
    |--------------------------------------------------------------------------
    */

    const handleProgramSelect =
        (
            program:
                string,
        ): void => {
            setSelectedProgram(
                program,
            );

            setSelectedSize(
                '',
            );

            cartForm.clearErrors();
        };

    /*
    |--------------------------------------------------------------------------
    | Add Order / Preorder To Cart
    |--------------------------------------------------------------------------
    */

    const submitCartItem =
        (): void => {
            if (
                currentRole !==
                'student'
            ) {
                return;
            }

            if (!selectedVariant) {
                showError(
                    'Select the required product options first.',
                );

                return;
            }

            /*
            |--------------------------------------------------------------------------
            | Protect Against Invalid State
            |--------------------------------------------------------------------------
            */

            if (
                actionState !==
                    'add_to_cart'
                &&
                actionState !==
                    'preorder'
            ) {
                return;
            }

            cartForm.transform(
                () => ({
                    product_variant_id:
                        selectedVariant.id,

                    quantity:
                        resolveQuantity(
                            quantityInput,
                        ),
                }),
            );

    startProcessing();

            cartForm.post(
                '/cart/items',
                {
                    preserveScroll:
                        true,

                    onSuccess:
                        () => {
                            cartForm
                                .clearErrors();

                            if (
                                actionState ===
                                'preorder'
                            ) {
                                showSuccess(
                                    'Preorder added to your cart successfully.',
                                );

                                return;
                            }

                            showSuccess(
                                'Product added to your cart successfully.',
                            );
                        },
                    onError:
                        (
                            errors,
                        ) => {
                            const firstError =
                                Object.values(
                                    errors,
                                )[0]
                                ??
                                (
                                    actionState ===
                                    'preorder'
                                        ? 'The preorder could not be added to your cart.'
                                        : 'The product could not be added to your cart.'
                                );

                            showError(
                                String(
                                    firstError,
                                ),
                            );
                        },
                },
            );
        };

    return (
        <CatalogLayout>
            <Head
                title={
                    product.name
                }
            />

            {notification && (
    <ActionNotification
        type={notification.type}
        message={notification.message}
        onClose={
            clearNotification
        }
    />
)}

            <div
                className="
                    space-y-7
                "
            >
                {/* HEADER */}
                <div
                    className="
                        flex
                        items-center
                        gap-4
                    "
                >
                    <Link
                        href="/catalog"
                        aria-label="Back to catalog"
                        className="
                            flex
                            h-11
                            w-11
                            items-center
                            justify-center
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            text-slate-600
                            transition
                            hover:bg-slate-50
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
                                font-semibold
                                text-blue-600
                            "
                        >
                            Merchandise Catalog
                        </p>

                        <h1
                            className="
                                mt-1
                                text-2xl
                                font-black
                                text-slate-900
                            "
                        >
                            Product Details
                        </h1>
                    </div>
                </div>

                <div
                    className="
                        grid
                        gap-7
                        xl:grid-cols-[minmax(0,1fr)_460px]
                    "
                >
                    {/* PRODUCT */}
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
                                relative
                            "
                        >
                            {product.image_url ? (
                                <img
                                    src={
                                        product.image_url
                                    }
                                    alt={
                                        product.name
                                    }
                                    className="
                                        h-[520px]
                                        w-full
                                        object-cover
                                    "
                                />
                            ) : (
                                <div
                                    className="
                                        flex
                                        h-[520px]
                                        items-center
                                        justify-center
                                        bg-slate-100
                                        text-slate-400
                                    "
                                >
                                    <PackageOpen
                                        size={64}
                                    />
                                </div>
                            )}

                            <div
                                className="
                                    absolute
                                    left-5
                                    top-5
                                "
                            >
                                <ProductStatusBadge
                                    status={
                                        product
                                            .availability_status
                                    }
                                    label={
                                        product
                                            .availability_label
                                    }
                                />
                            </div>

                            {product
                                .accepts_preorders && (
                                <div
                                    className="
                                        absolute
                                        right-5
                                        top-5
                                        rounded-full
                                        bg-blue-600
                                        px-4
                                        py-2
                                        text-xs
                                        font-bold
                                        text-white
                                        shadow
                                    "
                                >
                                    Preorder Available
                                </div>
                            )}
                        </div>

                        <div
                            className="
                                p-7
                            "
                        >
                            <p
                                className="
                                    font-mono
                                    text-sm
                                    font-bold
                                    uppercase
                                    tracking-wide
                                    text-blue-600
                                "
                            >
                                {product.code}
                            </p>

                            <h2
                                className="
                                    mt-3
                                    text-3xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                {product.name}
                            </h2>

                            <p
                                className="
                                    mt-2
                                    text-sm
                                    font-semibold
                                    text-slate-500
                                "
                            >
                                {
                                    product.category
                                        .name
                                }
                            </p>

                            <div
                                className="
                                    mt-6
                                    border-t
                                    border-slate-100
                                    pt-6
                                "
                            >
                                <h3
                                    className="
                                        font-bold
                                        text-slate-900
                                    "
                                >
                                    Product Description
                                </h3>

                                <p
                                    className="
                                        mt-3
                                        whitespace-pre-line
                                        text-sm
                                        leading-7
                                        text-slate-600
                                    "
                                >
                                    {product.description
                                        ??
                                        'No product description has been provided.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* OPTIONS */}
                    <aside
                        className="
                            space-y-6
                        "
                    >
                        {/* PRICE */}
                        <section
                            className="
                                rounded-3xl
                                border
                                border-slate-100
                                bg-white
                                p-6
                                shadow-sm
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
                                Selling Price
                            </p>

                            <p
                                className="
                                    mt-2
                                    text-3xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                {
                                    formatCurrency(
                                        displayedPrice,
                                    )
                                }
                            </p>

                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    bg-slate-50
                                    px-4
                                    py-3
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
                                    <span
                                        className="
                                            text-sm
                                            text-slate-500
                                        "
                                    >
                                        Availability
                                    </span>

                                    <span
                                        className={`
                                            rounded-full
                                            px-3
                                            py-1
                                            text-xs
                                            font-bold

                                            ${
                                                product
                                                    .accepts_preorders
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : selectedVariant
                                                          ?.is_available
                                                      ? 'bg-emerald-100 text-emerald-700'
                                                      : 'bg-slate-200 text-slate-600'
                                            }
                                        `}
                                    >
                                        {product
                                            .accepts_preorders
                                            ? 'Preorder Available'
                                            : selectedVariant
                                              ? selectedVariant
                                                    .stock_status
                                              : product
                                                    .availability_summary}
                                    </span>
                                </div>
                            </div>

                            {product
                                .availability_status ===
                                'coming_soon'
                                &&
                                product
                                    .expected_release_date && (
                                <div
                                    className="
                                        mt-5
                                        flex
                                        items-center
                                        gap-3
                                        rounded-2xl
                                        border
                                        border-amber-200
                                        bg-amber-50
                                        px-4
                                        py-3
                                        text-amber-800
                                    "
                                >
                                    <CalendarDays
                                        size={19}
                                        className="
                                            shrink-0
                                        "
                                    />

                                    <div>
                                        <p
                                            className="
                                                text-xs
                                                font-bold
                                                uppercase
                                                tracking-wide
                                            "
                                        >
                                            Expected Release
                                        </p>

                                        <p
                                            className="
                                                mt-1
                                                text-sm
                                                font-semibold
                                            "
                                        >
                                            {
                                                product
                                                    .expected_release_date
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {product
                                .availability_status ===
                                'coming_soon'
                                &&
                                product
                                    .preorder_enabled
                                &&
                                !product
                                    .accepts_preorders && (
                                <div
                                    className="
                                        mt-5
                                        rounded-2xl
                                        border
                                        border-slate-200
                                        bg-slate-50
                                        p-4
                                        text-sm
                                        leading-6
                                        text-slate-600
                                    "
                                >
                                    Preorders are configured
                                    for this product, but the
                                    preorder period is not
                                    currently open.
                                </div>
                            )}
                        </section>

                        {/* SELECTION */}
                        <section
                            className="
                                space-y-6
                                rounded-3xl
                                border
                                border-slate-100
                                bg-white
                                p-6
                                shadow-sm
                            "
                        >
                            <div>
                                <h2
                                    className="
                                        text-lg
                                        font-bold
                                        text-slate-900
                                    "
                                >
                                    Choose Product Options
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        leading-6
                                        text-slate-500
                                    "
                                >
                                    Select the correct
                                    merchandise variant before
                                    continuing.
                                </p>
                            </div>

                            {product.variant_mode ===
                                'program_and_size' && (
                                <OptionGroup
                                    label="College Program"
                                    values={
                                        programs
                                    }
                                    selectedValue={
                                        selectedProgram
                                    }
                                    onSelect={
                                        handleProgramSelect
                                    }
                                    emptyMessage="No programs are configured."
                                />
                            )}

                            {(product.variant_mode ===
                                'program_and_size'
                                ||
                                product.variant_mode ===
                                    'size_only') && (
                                <OptionGroup
                                    label="Size"
                                    values={
                                        sizes
                                    }
                                    selectedValue={
                                        selectedSize
                                    }
                                    onSelect={(
                                        value,
                                    ) => {
                                        setSelectedSize(
                                            value,
                                        );

                                        cartForm
                                            .clearErrors();
                                    }}
                                    disabled={
                                        product.variant_mode ===
                                            'program_and_size'
                                        &&
                                        selectedProgram ===
                                            ''
                                    }
                                    emptyMessage={
                                        product.variant_mode ===
                                            'program_and_size'
                                            &&
                                            selectedProgram ===
                                                ''
                                            ? 'Select a program first.'
                                            : 'No sizes are configured.'
                                    }
                                />
                            )}

                            {product.variant_mode ===
                                'standard' && (
                                <div
                                    className="
                                        rounded-2xl
                                        border
                                        border-emerald-200
                                        bg-emerald-50
                                        p-4
                                    "
                                >
                                    <div
                                        className="
                                            flex
                                            items-center
                                            gap-3
                                        "
                                    >
                                        <div
                                            className="
                                                flex
                                                h-9
                                                w-9
                                                items-center
                                                justify-center
                                                rounded-full
                                                bg-emerald-600
                                                text-white
                                            "
                                        >
                                            <Check
                                                size={17}
                                            />
                                        </div>

                                        <div>
                                            <p
                                                className="
                                                    text-sm
                                                    font-bold
                                                    text-emerald-900
                                                "
                                            >
                                                Standard Variant
                                            </p>

                                            <p
                                                className="
                                                    mt-1
                                                    text-xs
                                                    text-emerald-700
                                                "
                                            >
                                                No program or size
                                                selection is required.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* QUANTITY */}
                            <div>
                                <label
                                    htmlFor="quantity"
                                    className="
                                        mb-2
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-700
                                    "
                                >
                                    Quantity
                                </label>

                                <input
                                    id="quantity"
                                    type="number"
                                    min={1}
                                    max={99}
                                    step={1}
                                    value={
                                        quantityInput
                                    }
                                    onChange={(
                                        event,
                                    ) => {
                                        setQuantityInput(
                                            capQuantityInput(
                                                event
                                                    .target
                                                    .value,
                                            ),
                                        );

                                        cartForm
                                            .clearErrors(
                                                'quantity',
                                            );
                                    }}
                                    onBlur={() => {
                                        setQuantityInput(
                                            String(
                                                resolveQuantity(
                                                    quantityInput,
                                                ),
                                            ),
                                        );
                                    }}
                                    className="
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-300
                                        px-4
                                        py-3.5
                                        text-sm
                                        text-slate-900
                                        outline-none
                                        transition
                                        focus:border-blue-500
                                        focus:ring-4
                                        focus:ring-blue-100
                                    "
                                />

                                {cartForm.errors
                                    .quantity && (
                                    <p
                                        className="
                                            mt-2
                                            text-xs
                                            font-bold
                                            text-red-600
                                        "
                                    >
                                        {
                                            cartForm
                                                .errors
                                                .quantity
                                        }
                                    </p>
                                )}
                            </div>

                            {/* SELECTED VARIANT */}
                            {selectedVariant && (
                                <div
                                    className="
                                        rounded-2xl
                                        border
                                        border-blue-100
                                        bg-blue-50/70
                                        p-4
                                    "
                                >
                                    <p
                                        className="
                                            text-xs
                                            font-bold
                                            uppercase
                                            tracking-wide
                                            text-blue-600
                                        "
                                    >
                                        Selected Variant
                                    </p>

                                    <p
                                        className="
                                            mt-2
                                            font-bold
                                            text-slate-900
                                        "
                                    >
                                        {
                                            selectedVariant
                                                .variant_name
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
                                            selectedVariant
                                                .sku
                                        }
                                    </p>
                                </div>
                            )}

                            {!selectionComplete
                                &&
                                product.variant_mode !==
                                    'standard' && (
                                <p
                                    className="
                                        text-sm
                                        font-semibold
                                        text-amber-700
                                    "
                                >
                                    Complete the required
                                    selections to continue.
                                </p>
                            )}

                            {/* ACTION */}
                            <ProductAction
                                productId={
                                    product.id
                                }
                                state={
                                    actionState
                                }
                                selectionComplete={
                                    selectionComplete
                                }
                                processing={
                                    cartForm.processing
                                }
                                onSubmit={
                                    submitCartItem
                                }
                            />
                        </section>
                    </aside>
                </div>
            </div>
        </CatalogLayout>
    );
}

/*
|--------------------------------------------------------------------------
| Toast
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Option Group
|--------------------------------------------------------------------------
*/

interface OptionGroupProps {
    label:
        string;

    values:
        string[];

    selectedValue:
        string;

    onSelect:
        (
            value:
                string,
        ) => void;

    disabled?:
        boolean;

    emptyMessage:
        string;
}

function OptionGroup({
    label,
    values,
    selectedValue,
    onSelect,
    disabled = false,
    emptyMessage,
}: OptionGroupProps) {
    return (
        <div>
            <p
                className="
                    mb-3
                    text-sm
                    font-semibold
                    text-slate-700
                "
            >
                {label}
            </p>

            {values.length >
            0 ? (
                <div
                    className="
                        flex
                        flex-wrap
                        gap-2
                    "
                >
                    {values.map(
                        (
                            value,
                        ) => {
                            const selected =
                                value ===
                                selectedValue;

                            return (
                                <button
                                    key={
                                        value
                                    }
                                    type="button"
                                    disabled={
                                        disabled
                                    }
                                    onClick={() =>
                                        onSelect(
                                            value,
                                        )
                                    }
                                    className={`
                                        rounded-xl
                                        border-2
                                        px-4
                                        py-3
                                        text-sm
                                        font-semibold
                                        transition

                                        ${
                                            selected
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                                        }

                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    `}
                                >
                                    {value}
                                </button>
                            );
                        },
                    )}
                </div>
            ) : (
                <p
                    className="
                        rounded-xl
                        bg-slate-50
                        px-4
                        py-3
                        text-sm
                        text-slate-500
                    "
                >
                    {emptyMessage}
                </p>
            )}
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Variant Selection
|--------------------------------------------------------------------------
*/

interface SelectedVariantOptions {
    variants:
        CatalogVariant[];

    mode:
        VariantMode;

    selectedProgram:
        string;

    selectedSize:
        string;
}

function findSelectedVariant({
    variants,
    mode,
    selectedProgram,
    selectedSize,
}: SelectedVariantOptions): CatalogVariant | null {
    if (
        mode ===
        'standard'
    ) {
        return variants[0]
        ?? null;
    }

    if (
        mode ===
        'size_only'
    ) {
        if (
            selectedSize ===
            ''
        ) {
            return null;
        }

        return variants.find(
            (
                variant,
            ) =>
                variant.size ===
                selectedSize,
        )
        ?? null;
    }

    if (
        selectedProgram ===
            ''
        ||
        selectedSize ===
            ''
    ) {
        return null;
    }

    return variants.find(
        (
            variant,
        ) =>
            variant.program ===
                selectedProgram
            &&
            variant.size ===
                selectedSize,
    )
    ?? null;
}

function uniqueValues(
    values:
        Array<
            string | null
        >,
): string[] {
    return Array.from(
        new Set(
            values.filter(
                (
                    value,
                ): value is string =>
                    typeof value ===
                        'string'
                    &&
                    value !==
                        '',
            ),
        ),
    );
}

/*
|--------------------------------------------------------------------------
| Action State
|--------------------------------------------------------------------------
*/

type ProductActionState =
    | 'add_to_cart'
    | 'preorder'
    | 'coming_soon'
    | 'out_of_stock'
    | 'staff_order'
    | 'staff_preorder'
    | 'admin_receive'
    | 'cashier_view';

interface ActionStateOptions {
    product:
        CatalogProduct;

    selectedVariant:
        CatalogVariant | null;

    role:
        UserRole;
}

function getActionState({
    product,
    selectedVariant,
    role,
}: ActionStateOptions): ProductActionState {
    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */

    if (
        role ===
        'admin'
    ) {
        return 'admin_receive';
    }

    /*
    |--------------------------------------------------------------------------
    | Cashier
    |--------------------------------------------------------------------------
    */

    if (
        role ===
        'cashier'
    ) {
        return 'cashier_view';
    }

    /*
    |--------------------------------------------------------------------------
    | Coming Soon / Preorder
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Check preorder BEFORE normal stock availability.
    |
    | A preorder item is allowed specifically because physical stock may not
    | exist yet.
    |
    */

    if (
        product.availability_status ===
        'coming_soon'
    ) {
        if (
            product.accepts_preorders
        ) {
            return role ===
                'specialist'
                ? 'staff_preorder'
                : 'preorder';
        }

        return 'coming_soon';
    }

    /*
    |--------------------------------------------------------------------------
    | Normal Out Of Stock
    |--------------------------------------------------------------------------
    */

    if (
        product.availability_status ===
            'out_of_stock'
        ||
        (
            selectedVariant !== null
            &&
            !selectedVariant.is_available
        )
    ) {
        return 'out_of_stock';
    }

    /*
    |--------------------------------------------------------------------------
    | Normal Order
    |--------------------------------------------------------------------------
    */

    return role ===
        'specialist'
        ? 'staff_order'
        : 'add_to_cart';
}

/*
|--------------------------------------------------------------------------
| Product Action
|--------------------------------------------------------------------------
*/

interface ProductActionProps {
    productId:
        number;

    state:
        ProductActionState;

    selectionComplete:
        boolean;

    processing:
        boolean;

    onSubmit:
        () => void;
}

function ProductAction({
    productId,
    state,
    selectionComplete,
    processing,
    onSubmit,
}: ProductActionProps) {
    if (
        state ===
        'admin_receive'
    ) {
        return (
            <Link
                href={`/staff/stock-receipts/create?product=${productId}`}
                className="
                    flex
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#0D6EFD]
                    px-5
                    py-4
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-blue-700
                "
            >
                <PackagePlus
                    size={19}
                />

                Receive Stock
            </Link>
        );
    }

    if (
        state ===
        'cashier_view'
    ) {
        return (
            <DisabledActionButton
                label="Ordering handled through cashier orders"
                icon={
                    ShoppingCart
                }
            />
        );
    }

    if (
        state ===
        'coming_soon'
    ) {
        return (
            <DisabledActionButton
                label="Preorder Not Available"
                icon={
                    CalendarDays
                }
            />
        );
    }

    if (
        state ===
        'out_of_stock'
    ) {
        return (
            <DisabledActionButton
                label="Out of Stock"
                icon={
                    PackageOpen
                }
            />
        );
    }

    if (
        state ===
            'staff_order'
        ||
        state ===
            'staff_preorder'
    ) {
        return (
            <DisabledActionButton
                label="Select Student First"
                icon={
                    UserRoundPlus
                }
            />
        );
    }

    const disabled =
        !selectionComplete;

    const actionDetails =
        getProductActionDetails(
            state,
        );

    

    return (
            <ActionProcessingButton
                type="button"
                processing={processing}
                disabled={disabled}
                onClick={onSubmit}
                idleText={actionDetails.label}
                processingText={
                    state === 'preorder'
                        ? 'Adding Preorder...'
                        : 'Adding to Cart...'
                }
                className={`
                    flex
                    w-full
                    px-5
                    py-4
                    text-white

                    ${
                        state === 'preorder'
                            ? 'bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300'
                            : 'bg-[#0D6EFD] hover:bg-blue-700 disabled:bg-blue-300'
                    }
                `}
            />
            );
}

interface ProductActionDetails {
    label:
        string;

    icon:
        LucideIcon;
}

function getProductActionDetails(
    state:
        ProductActionState,
): ProductActionDetails {
    switch (
        state
    ) {
        case 'preorder':
            return {
                label:
                    'Preorder Now',

                icon:
                    CalendarDays,
            };

        case 'staff_preorder':
            return {
                label:
                    'Create Assisted Preorder',

                icon:
                    UserRoundPlus,
            };

        case 'staff_order':
            return {
                label:
                    'Order for Student',

                icon:
                    UserRoundPlus,
            };

        default:
            return {
                label:
                    'Add to Cart',

                icon:
                    ShoppingCart,
            };
    }
}

/*
|--------------------------------------------------------------------------
| Disabled Action
|--------------------------------------------------------------------------
*/

interface DisabledActionButtonProps {
    label:
        string;

    icon:
        LucideIcon;
}

function DisabledActionButton({
    label,
    icon: Icon,
}: DisabledActionButtonProps) {
    return (
        <button
            type="button"
            disabled
            className="
                flex
                w-full
                cursor-not-allowed
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-slate-200
                px-5
                py-4
                text-sm
                font-bold
                text-slate-500
            "
        >
            <Icon
                size={19}
            />

            {label}
        </button>
    );
}

/*
|--------------------------------------------------------------------------
| Currency
|--------------------------------------------------------------------------
*/

function formatCurrency(
    amount:
        string,
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
        Number(
            amount,
        ),
    );
}