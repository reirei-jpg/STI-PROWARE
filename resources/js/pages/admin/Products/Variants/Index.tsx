import {
    ArrowLeft,
    Boxes,
    CheckCircle2,
    CircleOff,
    LoaderCircle,
    Pencil,
    Plus,
    Shirt,
} from 'lucide-react';

import {
    Head,
    Link,
    router,
    useForm,
    usePage,
} from '@inertiajs/react';

import {
    type FormEvent,
    type ReactNode,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import { clampNumberInput } from '@/lib/utils';

interface SharedPageProps {
    [key: string]: unknown;

    auth?: {
        user?: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
}

type VariantMode =
    | 'program_and_size'
    | 'size_only'
    | 'standard';

interface ProgramOption {
    value: string;
    label: string;
}

interface SizeOption {
    value: string;
    label: string;
    code: string;
}

interface InventoryData {
    quantity_on_hand: number;
    quantity_reserved: number;
    available_quantity: number;
    reorder_level: number;
    stock_status: string;
}

interface Variant {
    id: number;

    sku: string;

    program:
        string | null;

    size:
        string | null;

    variant_name: string;

    variant_key: string;

    price_override:
        string | null;

    is_active: boolean;

    inventory:
        InventoryData;
}

interface ProductData {
    id: number;

    code: string;

    name: string;

    variant_mode:
        VariantMode;

    variant_mode_label:
        string;

    base_price:
        string;

    is_active:
        boolean;

    category: {
        id:
            number | null;

        name:
            string;
    };

    variants:
        Variant[];
}

interface PageProps {
    product:
        ProductData;

    programOptions:
        ProgramOption[];

    sizeOptions:
        SizeOption[];
}

interface VariantForm {
    program:
        string;

    size:
        string;

    price_override:
        string;

    reorder_level:
        string;
}

export default function Index({
    product,
    programOptions,
    sizeOptions,
}: PageProps) {
    const page =
        usePage<SharedPageProps>();

    const form =
        useForm<VariantForm>({
            program: '',

            size: '',

            price_override: '',

            reorder_level: '5',
        });

const [
    showAddVariantConfirm,
    setShowAddVariantConfirm,
] = useState(false);

const [
    statusVariant,
    setStatusVariant,
] = useState<Variant | null>(null);

const [
    priceVariant,
    setPriceVariant,
] = useState<Variant | null>(null);

const [
    priceValue,
    setPriceValue,
] = useState('');

const [
    processingVariantId,
    setProcessingVariantId,
] = useState<number | null>(null);

const {
    notification,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();


    const canAddVariant =
        product.variant_mode
        !== 'standard';

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const submit = (
        event:
            FormEvent<HTMLFormElement>,
    ): void => {
        event.preventDefault();

        if (form.processing) {
            return;
        }

        setShowAddVariantConfirm(true);
    };

    const confirmAddVariant = (): void => {
                if (form.processing) {
                    return;
                }

                form.post(
                    `/admin/products/${product.id}/variants`,
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            setShowAddVariantConfirm(false);

                            form.setData({
                                program: '',
                                size: '',
                                price_override: '',
                                reorder_level: '5',
                            });

                            showSuccess(
                                'Product variant added successfully.',
                            );
                        },

                        onError: (errors) => {
                            setShowAddVariantConfirm(false);

                            const firstError =
                                Object.values(errors)[0];

                            if (
                                typeof firstError ===
                                'string'
                            ) {
                                showError(firstError);
                                return;
                            }

                            showError(
                                'Product variant could not be added. Please check the form and try again.',
                            );
                        },
                    },
                );
            };


    /*
    |--------------------------------------------------------------------------
    | Status Toggle
    |--------------------------------------------------------------------------
    */

    const toggleStatus = (
            variant: Variant,
        ): void => {
            if (processingVariantId !== null) {
                return;
            }

            setStatusVariant(variant);
        };


        const confirmToggleStatus = (): void => {
                if (
                    !statusVariant ||
                    processingVariantId !== null
                ) {
                    return;
                }

                const variant = statusVariant;
                    const willActivate = !variant.is_active;

                    setProcessingVariantId(variant.id);

                    router.patch(
                        `/admin/products/${product.id}/variants/${variant.id}/status`,
                        {},
                        {
                            preserveScroll: true,

                            onSuccess: () => {
                                setStatusVariant(null);

                                showSuccess(
                                    `Variant ${
                                        willActivate
                                            ? 'activated'
                                            : 'deactivated'
                                    } successfully.`,
                                );
                            },

                            onError: () => {
                                setStatusVariant(null);

                                showError(
                                    `Variant could not be ${
                                        willActivate
                                            ? 'activated'
                                            : 'deactivated'
                                    }. Please try again.`,
                                );
                            },

                            onFinish: () => {
                                setProcessingVariantId(null);
                            },
                        },
                    );
                };

    /*
    |--------------------------------------------------------------------------
    | Edit Price
    |--------------------------------------------------------------------------
    */

    const [priceError, setPriceError] = useState('');

    const openEditPrice = (variant: Variant): void => {
        if (processingVariantId !== null) {
            return;
        }

        setPriceError('');
        setPriceValue(variant.price_override ?? '');
        setPriceVariant(variant);
    };

    const confirmEditPrice = (): void => {
        if (!priceVariant || processingVariantId !== null) {
            return;
        }

        const variant = priceVariant;

        setProcessingVariantId(variant.id);
        setPriceError('');

        router.patch(
            `/admin/products/${product.id}/variants/${variant.id}/price`,
            {
                price_override: priceValue.trim() === '' ? null : priceValue,
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    setPriceVariant(null);

                    showSuccess('Variant price updated successfully.');
                },

                onError: (errors) => {
                    setPriceError(
                        errors.price_override
                            ?? 'The variant price could not be updated. Please try again.',
                    );
                },

                onFinish: () => {
                    setProcessingVariantId(null);
                },
            },
        );
    };

    const currentRole =
        page.props.auth?.user?.role ?? null;

    const Layout =
        currentRole === 'specialist'
            ? SpecialistLayout
            : AdminLayout;

    return (
        <Layout>
            <Head
                title={
                    `Variants - ${product.name}`
                }
            />

            <div
                className="
                    mx-auto
                    max-w-7xl
                    space-y-6
                "
            >
                {/* BACK */}
                <Link
                    href={
                        currentRole === 'specialist'
                            ? '/staff/inventory'
                            : '/admin/products'
                    }
                    className="
                        inline-flex
                        items-center
                        gap-2
                        text-sm
                        font-black
                        text-blue-600
                        transition
                        hover:text-blue-800
                    "
                >
                    <ArrowLeft
                        size={17}
                    />

                    {currentRole === 'specialist'
                        ? 'Back to Inventory'
                        : 'Back to Products'}
                </Link>

                {/* HEADER */}
                <section
                    className="
                        flex
                        flex-col
                        gap-5
                        rounded-3xl
                        border
                        border-slate-200
                        bg-white
                        p-6
                        shadow-sm
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
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
                                h-14
                                w-14
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                bg-blue-100
                                text-blue-600
                            "
                        >
                            <Shirt
                                size={26}
                            />
                        </div>

                        <div>
                            <p
                                className="
                                    font-mono
                                    text-xs
                                    font-black
                                    text-blue-600
                                "
                            >
                                {
                                    product.code
                                }
                            </p>

                            <h1
                                className="
                                    mt-1
                                    text-2xl
                                    font-black
                                    text-slate-900
                                "
                            >
                                {
                                    product.name
                                }
                            </h1>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                {
                                    product
                                        .category
                                        .name
                                }

                                {' • '}

                                {
                                    product
                                        .variant_mode_label
                                }
                            </p>
                        </div>
                    </div>

                    <div
                        className="
                            flex
                            flex-wrap
                            gap-3
                        "
                    >
                        <HeaderMetric
                            label="Variants"
                            value={String(
                                product
                                    .variants
                                    .length,
                            )}
                        />

                        <HeaderMetric
                            label="Base Price"
                            value={
                                formatCurrency(
                                    product
                                        .base_price,
                                )
                            }
                            emphasis
                        />
                    </div>
                </section>

                {/* INFO */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-blue-100
                        bg-blue-50/70
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
                        <Boxes
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
                                    text-blue-950
                                "
                            >
                                Add future
                                variants here.
                            </p>

                            <p
                                className="
                                    mt-1
                                    max-w-3xl
                                    text-xs
                                    leading-5
                                    text-blue-700
                                "
                            >
                                Program and
                                Size use the
                                official PROWARE
                                choices so variant
                                names remain
                                consistent.
                            </p>
                        </div>
                    </div>
                </section>

                <div
                    className="
                        grid
                        items-start
                        gap-6
                        xl:grid-cols-[minmax(0,1fr)_390px]
                    "
                >
                    {/* EXISTING VARIANTS */}
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
                                flex
                                items-center
                                justify-between
                                border-b
                                border-slate-100
                                px-5
                                py-5
                                sm:px-6
                            "
                        >
                            <div>
                                <h2
                                    className="
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Existing
                                    Variants
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        text-slate-500
                                    "
                                >
                                    {
                                        product
                                            .variants
                                            .length
                                    }{' '}
                                    variant
                                    {product
                                        .variants
                                        .length ===
                                    1
                                        ? ''
                                        : 's'}
                                </p>
                            </div>

                            <Boxes
                                size={20}
                                className="
                                    text-blue-600
                                "
                            />
                        </div>

                        {product.variants
                            .length > 0 ? (
                            <div
                                className="
                                    divide-y
                                    divide-slate-100
                                "
                            >
                                {product
                                    .variants
                                    .map(
                                        (
                                            variant,
                                        ) => (
                                                                <VariantRow
                                                    key={
                                                        variant.id
                                                    }
                                                    variant={
                                                        variant
                                                    }
                                                    basePrice={
                                                        product
                                                            .base_price
                                                    }
                                                    onToggle={() =>
                                                        toggleStatus(
                                                            variant,
                                                        )
                                                    }
                                                    onEditPrice={() =>
                                                        openEditPrice(
                                                            variant,
                                                        )
                                                    }
                                                    processing={
                                                        processingVariantId ===
                                                        variant.id
                                                    }
                                                />
                                        ),
                                    )}
                            </div>
                        ) : (
                            <div
                                className="
                                    px-6
                                    py-16
                                    text-center
                                "
                            >
                                <Boxes
                                    size={40}
                                    className="
                                        mx-auto
                                        text-slate-300
                                    "
                                />

                                <p
                                    className="
                                        mt-4
                                        font-black
                                        text-slate-800
                                    "
                                >
                                    No variants
                                    found
                                </p>
                            </div>
                        )}
                    </section>

                    {/* ADD VARIANT */}
                    <section
                        className="
                            rounded-3xl
                            border
                            border-slate-200
                            bg-white
                            p-5
                            shadow-sm
                            xl:sticky
                            xl:top-28
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
                                    h-11
                                    w-11
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-blue-100
                                    text-blue-600
                                "
                            >
                                <Plus
                                    size={20}
                                />
                            </div>

                            <div>
                                <h2
                                    className="
                                        font-black
                                        text-slate-900
                                    "
                                >
                                    Add New
                                    Variant
                                </h2>

                                <p
                                    className="
                                        mt-0.5
                                        text-xs
                                        text-slate-500
                                    "
                                >
                                    {
                                        product
                                            .variant_mode_label
                                    }
                                </p>
                            </div>
                        </div>

                        {! canAddVariant ? (
                            <div
                                className="
                                    mt-5
                                    rounded-2xl
                                    border
                                    border-amber-200
                                    bg-amber-50
                                    p-4
                                "
                            >
                                <p
                                    className="
                                        text-sm
                                        font-black
                                        text-amber-900
                                    "
                                >
                                    Standard
                                    Product
                                </p>

                                <p
                                    className="
                                        mt-1
                                        text-xs
                                        leading-5
                                        text-amber-700
                                    "
                                >
                                    Standard
                                    products use
                                    one default
                                    variant.
                                </p>
                            </div>
                        ) : (
                            <form
                                onSubmit={
                                    submit
                                }
                                className="
                                    mt-5
                                    space-y-5
                                "
                            >
                                {/* PROGRAM */}
                                {product
                                    .variant_mode ===
                                    'program_and_size' && (
                                    <FormFieldContainer
                                        label="Program"
                                        error={
                                            form
                                                .errors
                                                .program
                                        }
                                    >
                                        <select
                                            value={
                                                form
                                                    .data
                                                    .program
                                            }
                                            onChange={(
                                                event,
                                            ) => {
                                                form.setData(
                                                    'program',
                                                    event
                                                        .target
                                                        .value,
                                                );

                                                form.clearErrors(
                                                    'program',
                                                    'size',
                                                );
                                            }}
                                            className={
                                                inputClass(
                                                    Boolean(
                                                        form
                                                            .errors
                                                            .program,
                                                    ),
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select
                                                Program
                                            </option>

                                            {programOptions.map(
                                                (
                                                    program,
                                                ) => (
                                                    <option
                                                        key={
                                                            program.value
                                                        }
                                                        value={
                                                            program.value
                                                        }
                                                    >
                                                        {
                                                            program.label
                                                        }
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </FormFieldContainer>
                                )}

                                {/* SIZE */}
                                <FormFieldContainer
                                    label="Size"
                                    error={
                                        form
                                            .errors
                                            .size
                                    }
                                >
                                    <select
                                        value={
                                            form
                                                .data
                                                .size
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            form.setData(
                                                'size',
                                                event
                                                    .target
                                                    .value,
                                            );

                                            form.clearErrors(
                                                'size',
                                            );
                                        }}
                                        className={
                                            inputClass(
                                                Boolean(
                                                    form
                                                        .errors
                                                        .size,
                                                ),
                                            )
                                        }
                                    >
                                        <option value="">
                                            Select
                                            Size
                                        </option>

                                        {sizeOptions.map(
                                            (
                                                size,
                                            ) => (
                                                <option
                                                    key={
                                                        size.value
                                                    }
                                                    value={
                                                        size.value
                                                    }
                                                >
                                                    {
                                                        size.label
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </FormFieldContainer>

                                {/* PRICE */}
                                <FormFieldContainer
                                    label="Variant Price"
                                    optional
                                    error={
                                        form
                                            .errors
                                            .price_override
                                    }
                                >
                                    <p className="mb-2 text-xs leading-5 text-slate-500">
                                        Leave blank to use the product&apos;s
                                        own price of {formatCurrency(product.base_price)}.
                                        Only fill this in if this specific
                                        variant should cost differently.
                                    </p>

                                    <input
                                        type="number"
                                        min="0.01"
                                        max="10000"
                                        step="0.01"
                                        value={
                                            form
                                                .data
                                                .price_override
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            form.setData(
                                                'price_override',
                                                clampNumberInput(
                                                    event
                                                        .target
                                                        .value,
                                                    10000,
                                                ),
                                            );

                                            form.clearErrors(
                                                'price_override',
                                            );
                                        }}
                                        placeholder={
                                            `Base: ${formatCurrency(
                                                product
                                                    .base_price,
                                            )}`
                                        }
                                        className={
                                            inputClass(
                                                Boolean(
                                                    form
                                                        .errors
                                                        .price_override,
                                                ),
                                            )
                                        }
                                    />

                                    <p
                                        className="
                                            mt-2
                                            text-[11px]
                                            leading-5
                                            text-slate-400
                                        "
                                    >
                                        Leave blank
                                        to use the
                                        product base
                                        price.
                                    </p>
                                </FormFieldContainer>

                                {/* REORDER */}
                                <FormFieldContainer
                                    label="Reorder Level"
                                    error={
                                        form
                                            .errors
                                            .reorder_level
                                    }
                                >
                                    <input
                                        type="number"
                                        min="0"
                                        max="999999"
                                        step="1"
                                        value={
                                            form
                                                .data
                                                .reorder_level
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            form.setData(
                                                'reorder_level',
                                                clampNumberInput(
                                                    event
                                                        .target
                                                        .value,
                                                    999999,
                                                ),
                                            );

                                            form.clearErrors(
                                                'reorder_level',
                                            );
                                        }}
                                        className={
                                            inputClass(
                                                Boolean(
                                                    form
                                                        .errors
                                                        .reorder_level,
                                                ),
                                            )
                                        }
                                    />
                                </FormFieldContainer>

                                <ActionProcessingButton
                                    type="submit"
                                    processing={form.processing}
                                    idleText="Add Variant"
                                    processingText="Adding Variant..."
                                    className="
                                        w-full
                                        bg-[#0D6EFD]
                                        py-3
                                        text-white
                                        hover:bg-blue-700
                                    "
                                />
                            </form>
                        )}
                    </section>
                </div>
            </div>

                    <ActionConfirmModal
                        open={showAddVariantConfirm}
                        title="Add Product Variant?"
                        message={`Add this new variant to ${product.name}?`}
                        confirmText="Add Variant"
                        processingText="Adding Variant..."
                        processing={form.processing}
                        tone="primary"
                        onCancel={() =>
                            setShowAddVariantConfirm(false)
                        }
                        onConfirm={confirmAddVariant}
                    />

            <ActionConfirmModal
                open={statusVariant !== null}
                title={
                    statusVariant?.is_active
                        ? 'Deactivate Variant?'
                        : 'Activate Variant?'
                }
                message={
                    statusVariant
                        ? `${
                            statusVariant.is_active
                                ? 'Deactivate'
                                : 'Activate'
                        } this product variant?`
                        : ''
                }
                confirmText={
                    statusVariant?.is_active
                        ? 'Deactivate'
                        : 'Activate'
                }
                processingText={
                    statusVariant?.is_active
                        ? 'Deactivating...'
                        : 'Activating...'
                }
                processing={
                    statusVariant !== null &&
                    processingVariantId === statusVariant.id
                }
                tone={
                    statusVariant?.is_active
                        ? 'danger'
                        : 'primary'
                }
                onCancel={() =>
                    setStatusVariant(null)
                }
                onConfirm={confirmToggleStatus}
            />

            {priceVariant && (
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
                    <div
                        className="
                            w-full
                            max-w-md
                            rounded-3xl
                            bg-white
                            shadow-2xl
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
                                    text-lg
                                    font-black
                                    text-slate-900
                                "
                            >
                                Edit Variant Price
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                {priceVariant.variant_name} for {product.name}.
                                Leave this blank to use the product&apos;s own
                                price of {formatCurrency(product.base_price)}.
                            </p>
                        </div>

                        <div className="px-6 py-5">
                            <label className="text-sm font-bold text-slate-700">
                                Price (optional)
                            </label>

                            <input
                                type="number"
                                min="0.01"
                                max="10000"
                                step="0.01"
                                autoFocus
                                placeholder={`Base: ${formatCurrency(product.base_price)}`}
                                value={priceValue}
                                onChange={(event) => {
                                    setPriceValue(
                                        clampNumberInput(
                                            event.target.value,
                                            10000,
                                        ),
                                    );
                                    setPriceError('');
                                }}
                                className={inputClass(
                                    priceError !== '',
                                )}
                            />

                            <p className="mt-1 text-xs text-slate-500">
                                Between ₱0.01 and ₱10,000.
                            </p>

                            {priceError && (
                                <p className="mt-2 text-sm font-semibold text-red-600">
                                    {priceError}
                                </p>
                            )}
                        </div>

                        <div
                            className="
                                flex
                                justify-end
                                gap-3
                                border-t
                                border-slate-100
                                px-6
                                py-5
                            "
                        >
                            <button
                                type="button"
                                disabled={
                                    processingVariantId === priceVariant.id
                                }
                                onClick={() => setPriceVariant(null)}
                                className="
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-bold
                                    text-slate-600
                                    transition
                                    hover:bg-slate-50
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                Cancel
                            </button>

                            <ActionProcessingButton
                                processing={
                                    processingVariantId === priceVariant.id
                                }
                                idleText="Save Price"
                                processingText="Saving..."
                                onClick={confirmEditPrice}
                                className="
                                    bg-blue-600
                                    text-white
                                    hover:bg-blue-700
                                "
                            />
                        </div>
                    </div>
                </div>
            )}

                    {notification && (
                        <ActionNotification
                            type={notification.type}
                            message={notification.message}
                            onClose={clearNotification}
                        />
                    )}
            
        </Layout>
    );
}

const VariantRow = ({
    variant,
    basePrice,
    onToggle,
    onEditPrice,
    processing,
}: {
    variant: Variant;
    basePrice: string;
    onToggle: () => void;
    onEditPrice: () => void;
    processing: boolean;
}) => {
    const inventory =
        variant.inventory;

    return (
        <article
            className="
                px-5
                py-5
                sm:px-6
            "
        >
            <div
                className="
                    grid
                    gap-5
                    lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)_auto]
                    lg:items-center
                "
            >
                <div
                    className="
                        min-w-0
                    "
                >
                    <div
                        className="
                            flex
                            flex-wrap
                            items-center
                            gap-2
                        "
                    >
                        <p
                            className="
                                font-black
                                text-slate-900
                            "
                        >
                            {
                                variant
                                    .variant_name
                            }
                        </p>

                        <span
                            className={`
                                rounded-full
                                px-2.5
                                py-1
                                text-[10px]
                                font-black
                                uppercase

                                ${
                                    variant.is_active
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                }
                            `}
                        >
                            {variant.is_active
                                ? 'Active'
                                : 'Inactive'}
                        </span>
                    </div>

                    <p
                        className="
                            mt-1
                            font-mono
                            text-xs
                            text-slate-400
                        "
                    >
                        {variant.sku}
                    </p>

                    <div
                        className="
                            mt-2
                            flex
                            flex-wrap
                            items-center
                            gap-2
                        "
                    >
                        <p
                            className="
                                text-xs
                                text-slate-500
                            "
                        >
                            Price:{' '}

                            <strong
                                className="
                                    text-slate-800
                                "
                            >
                                {formatCurrency(
                                    variant
                                        .price_override
                                    ??
                                    basePrice,
                                )}
                            </strong>
                        </p>

                        <span
                            className={`
                                rounded-full
                                px-2
                                py-0.5
                                text-[10px]
                                font-black
                                uppercase
                                ${
                                    variant.price_override
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-slate-100 text-slate-500'
                                }
                            `}
                        >
                            {variant.price_override
                                ? 'Custom price'
                                : 'Base price'}
                        </span>

                        <button
                            type="button"
                            onClick={onEditPrice}
                            disabled={processing}
                            className="
                                inline-flex
                                items-center
                                gap-1.5
                                rounded-xl
                                border
                                border-blue-200
                                bg-blue-50
                                px-3
                                py-1.5
                                text-xs
                                font-black
                                text-blue-700
                                transition
                                hover:bg-blue-100
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            <Pencil size={13} />
                            Edit Price
                        </button>
                    </div>
                </div>

                <div
                    className="
                        grid
                        grid-cols-2
                        gap-2
                        sm:grid-cols-4
                    "
                >
                    <MiniMetric
                        label="On Hand"
                        value={
                            inventory
                                .quantity_on_hand
                        }
                    />

                    <MiniMetric
                        label="Reserved"
                        value={
                            inventory
                                .quantity_reserved
                        }
                    />

                    <MiniMetric
                        label="Available"
                        value={
                            inventory
                                .available_quantity
                        }
                    />

                    <MiniMetric
                        label="Reorder"
                        value={
                            inventory
                                .reorder_level
                        }
                    />
                </div>

                <div
                    className="
                        flex
                        lg:justify-end
                    "
                >
                    <button
                        type="button"
                        onClick={
                            onToggle
                        }
                        disabled={
                            processing
                        }
                        className={`
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            border
                            px-3
                            py-2
                            text-xs
                            font-black
                            transition
                            disabled:cursor-not-allowed
                            disabled:opacity-60

                            ${
                                variant.is_active
                                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }
                        `}
                    >
                        {processing ? (
                            <LoaderCircle
                                size={15}
                                className="animate-spin"
                            />
                        ) : variant.is_active ? (
                            <CircleOff
                                size={15}
                            />
                        ) : (
                            <CheckCircle2
                                size={15}
                            />
                        )}

                        {processing
                            ? variant.is_active
                                ? 'Deactivating...'
                                : 'Activating...'
                            : variant.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                    </button>
                </div>
            </div>
        </article>
    );
};

function MiniMetric({
    label,
    value,
}: {
    label:
        string;

    value:
        number;
}) {
    return (
        <div
            className="
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                px-2
                py-2.5
                text-center
            "
        >
            <p
                className="
                    text-[9px]
                    font-bold
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
                    font-black
                    text-slate-800
                "
            >
                {value}
            </p>
        </div>
    );
}

function HeaderMetric({
    label,
    value,
    emphasis = false,
}: {
    label:
        string;

    value:
        string;

    emphasis?:
        boolean;
}) {
    return (
        <div
            className={`
                rounded-xl
                px-4
                py-2.5

                ${
                    emphasis
                        ? 'bg-blue-50'
                        : 'bg-slate-100'
                }
            `}
        >
            <p
                className={`
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wide

                    ${
                        emphasis
                            ? 'text-blue-400'
                            : 'text-slate-400'
                    }
                `}
            >
                {label}
            </p>

            <p
                className={`
                    mt-0.5
                    text-lg
                    font-black

                    ${
                        emphasis
                            ? 'text-blue-700'
                            : 'text-slate-900'
                    }
                `}
            >
                {value}
            </p>
        </div>
    );
}

function FormFieldContainer({
    label,
    optional = false,
    error,
    children,
}: {
    label:
        string;

    optional?:
        boolean;

    error?:
        string;

    children:
        ReactNode;
}) {
    return (
        <div>
            <div
                className="
                    mb-2
                    flex
                    items-center
                    justify-between
                    gap-3
                "
            >
                <label
                    className="
                        text-sm
                        font-black
                        text-slate-700
                    "
                >
                    {label}
                </label>

                {optional && (
                    <span
                        className="
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-wide
                            text-slate-400
                        "
                    >
                        Optional
                    </span>
                )}
            </div>

            {children}

            {error && (
                <p
                    className="
                        mt-2
                        text-xs
                        font-bold
                        text-red-600
                    "
                >
                    {error}
                </p>
            )}
        </div>
    );
}

function inputClass(
    hasError:
        boolean,
): string {
    return `
        w-full
        rounded-xl
        border
        bg-white
        px-4
        py-3
        text-sm
        text-slate-900
        outline-none
        transition

        ${
            hasError
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
        }
    `;
}

function formatCurrency(
    value:
        string,
): string {
    const number =
        Number(
            value,
        );

    return new Intl.NumberFormat(
        'en-PH',
        {
            style:
                'currency',

            currency:
                'PHP',
        },
    ).format(
        Number.isFinite(
            number,
        )
            ? number
            : 0,
    );
}

function capitalize(
    value:
        string,
): string {
    if (! value) {
        return value;
    }

    return (
        value
            .charAt(0)
            .toUpperCase()
        +
        value.slice(
            1,
        )
    );
}