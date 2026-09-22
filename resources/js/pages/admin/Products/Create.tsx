import {
    ArrowLeft,
    Check,
    ImagePlus,
    Ruler,
    School,
    Tag,
    X,
} from 'lucide-react';

import type {
    LucideIcon,
} from 'lucide-react';

import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';

import {
    type ChangeEvent,
    type FormEvent,
    useEffect,
    useRef,
    useState,
} from 'react';

import AdminLayout from '@/layouts/AdminLayout';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import { clampNumberInput } from '@/lib/utils';

type VariantMode =
    | 'program_and_size'
    | 'size_only'
    | 'standard';

type AvailabilityStatus =
    | 'available'
    | 'coming_soon'
    | 'out_of_stock'
    | 'inactive';

interface Category {
    id: number;
    name: string;

    recommended_variant_mode:
        VariantMode | null;
}

interface VariantModeOption {
    value: VariantMode;
    label: string;
    description: string;
}

interface AvailabilityStatusOption {
    value: AvailabilityStatus;
    label: string;
    description: string;
}

interface ProgramOption {
    value: string;
    label: string;
}

interface SizeOption {
    value: string;
    label: string;
    code: string;
}

interface CreateProductProps {
    categories: Category[];

    productCodePattern: string;

    variantModes:
        VariantModeOption[];

    availabilityStatuses:
        AvailabilityStatusOption[];

    programOptions:
        ProgramOption[];

    sizeOptions:
        SizeOption[];
}

interface ProductFormData {
    category_id: string;

    name: string;

    description: string;

    base_price: string;

    variant_mode:
        VariantMode | '';

    availability_status:
        AvailabilityStatus | '';

    preorder_enabled: boolean;

    expected_release_date: string;

    preorder_starts_at: string;

    preorder_ends_at: string;

    preorder_limit_per_student:
        string;

    preorder_capacity:
        string;

    programs: string[];

    sizes: string[];

    image: File | null;

    is_active: boolean;
}

const MAX_IMAGE_SIZE =
    5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

export default function Create({
    categories,
    productCodePattern,
    variantModes,
    availabilityStatuses,
    programOptions,
    sizeOptions,
}: CreateProductProps) {
    const [
        imagePreview,
        setImagePreview,
    ] = useState<string | null>(
        null,
    );

    const [
        imageClientError,
        setImageClientError,
    ] = useState<string | null>(
        null,
    );

    const imageInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const form =
        useForm<ProductFormData>({
            category_id: '',

            name: '',

            description: '',

            base_price: '',

            variant_mode: '',

            availability_status:
                'available',

            preorder_enabled:
                false,

            expected_release_date:
                '',

            preorder_starts_at:
                '',

            preorder_ends_at:
                '',

            preorder_limit_per_student:
                '',

            preorder_capacity:
                '',

            programs: [],

            sizes: [],

            image: null,

            is_active: true,
        });


        const [
            showCreateConfirm,
            setShowCreateConfirm,
        ] = useState(false);

        const {
            notification,
            showSuccess,
            showError,
            clearNotification,
        } = useActionFeedback();

    const selectedCategory =
        categories.find(
            (category) =>
                String(
                    category.id,
                ) ===
                form.data
                    .category_id,
        ) ?? null;

    /*
    |--------------------------------------------------------------------------
    | Image Cleanup
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        return () => {
            if (
                imagePreview
            ) {
                URL.revokeObjectURL(
                    imagePreview,
                );
            }
        };
    }, [
        imagePreview,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Category
    |--------------------------------------------------------------------------
    */

    const handleCategoryChange = (
        categoryId: string,
    ): void => {
        form.setData(
            'category_id',
            categoryId,
        );

        form.clearErrors(
            'category_id',
        );

        const category =
            categories.find(
                (item) =>
                    String(
                        item.id,
                    ) ===
                    categoryId,
            ) ?? null;

        if (
            category
                ?.recommended_variant_mode
        ) {
            handleVariantModeChange(
                category
                    .recommended_variant_mode,
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Variant Mode
    |--------------------------------------------------------------------------
    */

    const handleVariantModeChange = (
        mode: VariantMode,
    ): void => {
        form.setData(
            'variant_mode',
            mode,
        );

        form.clearErrors(
            'variant_mode',
            'programs',
            'sizes',
        );

        if (
            mode ===
            'size_only'
        ) {
            form.setData(
                'programs',
                [],
            );
        }

        if (
            mode ===
            'standard'
        ) {
            form.setData(
                'programs',
                [],
            );

            form.setData(
                'sizes',
                [],
            );
        }
    };

    /*
    |--------------------------------------------------------------------------
    | Programs
    |--------------------------------------------------------------------------
    */

    const toggleProgram = (
        value: string,
    ): void => {
        const exists =
            form.data
                .programs
                .includes(
                    value,
                );

        form.setData(
            'programs',

            exists
                ? form.data
                    .programs
                    .filter(
                        (program) =>
                            program !==
                            value,
                    )
                : [
                    ...form.data
                        .programs,

                    value,
                ],
        );

        form.clearErrors(
            'programs',
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Sizes
    |--------------------------------------------------------------------------
    */

    const toggleSize = (
        value: string,
    ): void => {
        const exists =
            form.data
                .sizes
                .includes(
                    value,
                );

        form.setData(
            'sizes',

            exists
                ? form.data
                    .sizes
                    .filter(
                        (size) =>
                            size !==
                            value,
                    )
                : [
                    ...form.data
                        .sizes,

                    value,
                ],
        );

        form.clearErrors(
            'sizes',
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Availability
    |--------------------------------------------------------------------------
    */

    const handleAvailabilityChange =
        (
            status:
                AvailabilityStatus,
        ): void => {
            form.setData(
                'availability_status',
                status,
            );

            form.setData(
                'is_active',
                status !==
                    'inactive',
            );

            if (
                status !==
                'coming_soon'
            ) {
                form.setData(
                    'preorder_enabled',
                    false,
                );

                form.setData(
                    'expected_release_date',
                    '',
                );

                form.setData(
                    'preorder_starts_at',
                    '',
                );

                form.setData(
                    'preorder_ends_at',
                    '',
                );

                form.setData(
                    'preorder_limit_per_student',
                    '',
                );

                form.setData(
                    'preorder_capacity',
                    '',
                );
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Image
    |--------------------------------------------------------------------------
    */

    const handleImageChange = (
        event:
            ChangeEvent<HTMLInputElement>,
    ): void => {
        const file =
            event.target
                .files?.[0]
            ?? null;

        setImageClientError(
            null,
        );

        form.clearErrors(
            'image',
        );

        if (!file) {
            return;
        }

        if (
            !ACCEPTED_IMAGE_TYPES
                .includes(
                    file.type,
                )
        ) {
            setImageClientError(
                'Image must be JPG, PNG, or WEBP.',
            );

            event.target.value =
                '';

            return;
        }

        if (
            file.size >
            MAX_IMAGE_SIZE
        ) {
            setImageClientError(
                'Image must not exceed 5 MB.',
            );

            event.target.value =
                '';

            return;
        }

        if (
            imagePreview
        ) {
            URL.revokeObjectURL(
                imagePreview,
            );
        }

        form.setData(
            'image',
            file,
        );

        setImagePreview(
            URL.createObjectURL(
                file,
            ),
        );
    };

    const removeImage =
        (): void => {
            if (
                imagePreview
            ) {
                URL.revokeObjectURL(
                    imagePreview,
                );
            }

            setImagePreview(
                null,
            );

            setImageClientError(
                null,
            );

            form.setData(
                'image',
                null,
            );

            if (
                imageInputRef.current
            ) {
                imageInputRef
                    .current
                    .value = '';
            }
        };

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

        if (
            imageClientError ||
            form.processing
        ) {
            return;
        }

        setShowCreateConfirm(true);
    };

    const confirmCreateProduct = (): void => {
        if (form.processing) {
            return;
        }

        form.post(
            '/admin/products',
            {
                forceFormData: true,
                preserveScroll: true,

                onSuccess: () => {
                    setShowCreateConfirm(false);

                    showSuccess(
                        'Product created successfully.',
                    );
                },

                onError: (errors) => {
                    setShowCreateConfirm(false);

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
                        'Product could not be created. Please check the form and try again.',
                    );
                },
            },
        );
    };

    const variantCount =
        calculateVariantCount(
            form.data
                .variant_mode,

            form.data
                .programs,

            form.data
                .sizes,
        );

    return (
        <AdminLayout>
            <Head title="Add Product" />

            <div
                className="
                    mx-auto
                    max-w-6xl
                    space-y-7
                "
            >
                {/* HEADER */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/products"
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
                        <h1 className="text-3xl font-black text-slate-900">
                            Add Product
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Create a completely
                            new merchandise
                            product and its
                            initial variants.
                        </p>
                    </div>
                </div>

                {/* IMPORTANT INFO */}
                <section
                    className="
                        rounded-2xl
                        border
                        border-blue-200
                        bg-blue-50
                        p-5
                    "
                >
                    <p className="font-black text-blue-900">
                        Adding a new size or
                        program to an existing
                        product?
                    </p>

                    <p className="mt-2 text-sm leading-6 text-blue-700">
                        Do not create the
                        product again. Return
                        to Products and use
                        <strong>
                            {' '}
                            Manage Variants
                        </strong>
                        .
                    </p>
                </section>

                <form
                    onSubmit={submit}
                    encType="multipart/form-data"
                    className="
                        grid
                        gap-7
                        xl:grid-cols-[minmax(0,1fr)_350px]
                    "
                >
                    {/* ERRORS */}
                    {Object.keys(
                        form.errors,
                    ).length > 0 && (
                        <section
                            className="
                                rounded-2xl
                                border
                                border-red-200
                                bg-red-50
                                p-5
                                xl:col-span-2
                            "
                        >
                            <p className="font-black text-red-900">
                                Product could not
                                be saved
                            </p>

                            <ul className="mt-3 space-y-1 text-sm text-red-700">
                                {Object.entries(
                                    form.errors,
                                ).map(
                                    ([
                                        key,
                                        message,
                                    ]) => (
                                        <li
                                            key={
                                                key
                                            }
                                        >
                                            {
                                                message
                                            }
                                        </li>
                                    ),
                                )}
                            </ul>
                        </section>
                    )}

                    {/* LEFT */}
                    <div className="space-y-7">
                        {/* INFORMATION */}
                        <section
                            className="
                                space-y-5
                                rounded-3xl
                                border
                                border-slate-100
                                bg-white
                                p-7
                                shadow-sm
                            "
                        >
                            <SectionHeading
                                title="Product Information"
                                description="Basic merchandise information shown to students."
                            />

                            <div
                                className="
                                    rounded-2xl
                                    border
                                    border-blue-100
                                    bg-blue-50
                                    p-4
                                "
                            >
                                <p className="text-xs font-bold uppercase text-blue-500">
                                    Product Code
                                </p>

                                <p className="mt-1 font-mono text-xl font-black text-blue-700">
                                    {
                                        productCodePattern
                                    }
                                </p>

                                <p className="mt-1 text-xs text-blue-600">
                                    Generated
                                    automatically
                                    when saved.
                                </p>
                            </div>

                            {/* CATEGORY */}
                            <Field>
                                <label className={labelClass}>
                                    Category
                                </label>

                                <select
                                    value={
                                        form.data
                                            .category_id
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        handleCategoryChange(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                >
                                    <option value="">
                                        Select
                                        category
                                    </option>

                                    {categories.map(
                                        (
                                            category,
                                        ) => (
                                            <option
                                                key={
                                                    category.id
                                                }
                                                value={
                                                    category.id
                                                }
                                            >
                                                {
                                                    category.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>

                                <ErrorMessage
                                    value={
                                        form
                                            .errors
                                            .category_id
                                    }
                                />
                            </Field>

                            {/* NAME */}
                            <Field>
                                <label className={labelClass}>
                                    Product Name
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.data
                                            .name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'name',
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="STI College Uniform"
                                    className={
                                        inputClass
                                    }
                                />

                                <ErrorMessage
                                    value={
                                        form.errors
                                            .name
                                    }
                                />
                            </Field>

                            {/* DESCRIPTION */}
                            <Field>
                                <label className={labelClass}>
                                    Description
                                </label>

                                <textarea
                                    value={
                                        form.data
                                            .description
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'description',
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    rows={5}
                                    maxLength={
                                        2000
                                    }
                                    placeholder="Product description..."
                                    className={`${inputClass} resize-none`}
                                />

                                <ErrorMessage
                                    value={
                                        form
                                            .errors
                                            .description
                                    }
                                />
                            </Field>

                            {/* PRICE */}
                            <Field>
                                <label className={labelClass}>
                                    Base Price
                                </label>

                                <input
                                    type="number"
                                    min="0.01"
                                    max="99999999.99"
                                    step="0.01"
                                    value={
                                        form.data
                                            .base_price
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'base_price',
                                            clampNumberInput(
                                                event
                                                    .target
                                                    .value,
                                                99999999.99,
                                            ),
                                        )
                                    }
                                    placeholder="650.00"
                                    className={
                                        inputClass
                                    }
                                />

                                <ErrorMessage
                                    value={
                                        form
                                            .errors
                                            .base_price
                                    }
                                />
                            </Field>
                        </section>

                        {/* VARIANTS */}
                        <section
                            className="
                                rounded-3xl
                                border
                                border-slate-100
                                bg-white
                                p-7
                                shadow-sm
                            "
                        >
                            <SectionHeading
                                title="Initial Variants"
                                description="Choose how this new product will be tracked."
                            />

                            <div
                                className="
                                    mt-6
                                    grid
                                    gap-4
                                    lg:grid-cols-3
                                "
                            >
                                {variantModes.map(
                                    (
                                        mode,
                                    ) => (
                                        <VariantModeButton
                                            key={
                                                mode.value
                                            }
                                            mode={
                                                mode
                                            }
                                            selected={
                                                form
                                                    .data
                                                    .variant_mode ===
                                                mode.value
                                            }
                                            onClick={() =>
                                                handleVariantModeChange(
                                                    mode.value,
                                                )
                                            }
                                        />
                                    ),
                                )}
                            </div>

                            <ErrorMessage
                                value={
                                    form.errors
                                        .variant_mode
                                }
                            />

                            {form.data
                                .variant_mode ===
                                'program_and_size' && (
                                <OptionSection
                                    title="College Programs"
                                    options={
                                        programOptions
                                    }
                                    selected={
                                        form.data
                                            .programs
                                    }
                                    onToggle={
                                        toggleProgram
                                    }
                                    error={
                                        form.errors
                                            .programs
                                    }
                                />
                            )}

                            {(form.data
                                .variant_mode ===
                                'program_and_size'
                                || form.data
                                    .variant_mode ===
                                    'size_only') && (
                                <OptionSection
                                    title="Sizes"
                                    options={
                                        sizeOptions
                                    }
                                    selected={
                                        form.data
                                            .sizes
                                    }
                                    onToggle={
                                        toggleSize
                                    }
                                    error={
                                        form.errors
                                            .sizes
                                    }
                                />
                            )}

                            {form.data
                                .variant_mode ===
                                'standard' && (
                                <div
                                    className="
                                        mt-6
                                        rounded-2xl
                                        border
                                        border-emerald-200
                                        bg-emerald-50
                                        p-5
                                    "
                                >
                                    <p className="font-black text-emerald-900">
                                        Standard
                                        Variant
                                    </p>

                                    <p className="mt-2 text-sm text-emerald-700">
                                        One Standard
                                        variant and
                                        inventory
                                        record will
                                        be created.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* AVAILABILITY */}
                        <section
                            className="
                                rounded-3xl
                                border
                                border-slate-100
                                bg-white
                                p-7
                                shadow-sm
                            "
                        >
                            <SectionHeading
                                title="Catalog Availability"
                                description="Choose how this merchandise should appear in the catalog."
                            />

                            <div
                                className="
                                    mt-6
                                    grid
                                    gap-4
                                    md:grid-cols-2
                                "
                            >
                                {availabilityStatuses.map(
                                    (
                                        status,
                                    ) => {
                                        const selected =
                                            form
                                                .data
                                                .availability_status ===
                                            status.value;

                                        return (
                                            <button
                                                key={
                                                    status.value
                                                }
                                                type="button"
                                                onClick={() =>
                                                    handleAvailabilityChange(
                                                        status.value,
                                                    )
                                                }
                                                className={`
                                                    rounded-2xl
                                                    border-2
                                                    p-5
                                                    text-left
                                                    transition

                                                    ${
                                                        selected
                                                            ? 'border-blue-600 bg-blue-50'
                                                            : 'border-slate-200 hover:border-blue-300'
                                                    }
                                                `}
                                            >
                                                <h3 className="font-black text-slate-900">
                                                    {
                                                        status.label
                                                    }
                                                </h3>

                                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                                    {
                                                        status.description
                                                    }
                                                </p>
                                            </button>
                                        );
                                    },
                                )}
                            </div>

                            <ErrorMessage
                                value={
                                    form
                                        .errors
                                        .availability_status
                                }
                            />

                            {form.data
                                .availability_status ===
                                'coming_soon' && (
                                <div className="mt-6 space-y-5 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                                    <Field>
                                        <label className={labelClass}>
                                            Expected
                                            Release
                                            Date
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                form
                                                    .data
                                                    .expected_release_date
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                form.setData(
                                                    'expected_release_date',
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className={
                                                inputClass
                                            }
                                        />

                                        <ErrorMessage
                                            value={
                                                form
                                                    .errors
                                                    .expected_release_date
                                            }
                                        />
                                    </Field>

                                    <label
                                        className="
                                            flex
                                            cursor-pointer
                                            items-start
                                            gap-3
                                            rounded-xl
                                            bg-white
                                            p-4
                                        "
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                form
                                                    .data
                                                    .preorder_enabled
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                form.setData(
                                                    'preorder_enabled',
                                                    event
                                                        .target
                                                        .checked,
                                                )
                                            }
                                            className="mt-1"
                                        />

                                        <div>
                                            <p className="font-black text-slate-800">
                                                Enable
                                                Preorders
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Allow
                                                students
                                                to
                                                preorder
                                                this
                                                Coming
                                                Soon
                                                item.
                                            </p>
                                        </div>
                                    </label>

                                    {form.data
                                        .preorder_enabled && (
                                        <div
                                            className="
                                                grid
                                                gap-5
                                                md:grid-cols-2
                                            "
                                        >
                                            <Field>
                                                <label className={labelClass}>
                                                    Preorder
                                                    Starts
                                                </label>

                                                <input
                                                    type="datetime-local"
                                                    value={
                                                        form
                                                            .data
                                                            .preorder_starts_at
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_starts_at',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />

                                                <ErrorMessage
                                                    value={
                                                        form
                                                            .errors
                                                            .preorder_starts_at
                                                    }
                                                />
                                            </Field>

                                            <Field>
                                                <label className={labelClass}>
                                                    Preorder
                                                    Ends
                                                </label>

                                                <input
                                                    type="datetime-local"
                                                    value={
                                                        form
                                                            .data
                                                            .preorder_ends_at
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_ends_at',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />

                                                <ErrorMessage
                                                    value={
                                                        form
                                                            .errors
                                                            .preorder_ends_at
                                                    }
                                                />
                                            </Field>

                                            <Field>
                                                <label className={labelClass}>
                                                    Limit
                                                    Per
                                                    Student
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="1000"
                                                    value={
                                                        form
                                                            .data
                                                            .preorder_limit_per_student
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_limit_per_student',
                                                            clampNumberInput(
                                                                event
                                                                    .target
                                                                    .value,
                                                                1000,
                                                            ),
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />

                                                <ErrorMessage
                                                    value={
                                                        form
                                                            .errors
                                                            .preorder_limit_per_student
                                                    }
                                                />
                                            </Field>

                                            <Field>
                                                <label className={labelClass}>
                                                    Total
                                                    Capacity
                                                </label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10000"
                                                    value={
                                                        form
                                                            .data
                                                            .preorder_capacity
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_capacity',
                                                            clampNumberInput(
                                                                event
                                                                    .target
                                                                    .value,
                                                                10000,
                                                            ),
                                                        )
                                                    }
                                                    className={
                                                        inputClass
                                                    }
                                                />

                                                <ErrorMessage
                                                    value={
                                                        form
                                                            .errors
                                                            .preorder_capacity
                                                    }
                                                />
                                            </Field>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT */}
                    <aside className="space-y-6">
                        {/* IMAGE */}
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
                            <h2 className="font-black text-slate-900">
                                Product Image
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                JPG, PNG or WEBP,
                                maximum 5 MB.
                            </p>

                            <label
                                htmlFor="image"
                                className="
                                    mt-5
                                    flex
                                    min-h-64
                                    cursor-pointer
                                    items-center
                                    justify-center
                                    overflow-hidden
                                    rounded-2xl
                                    border-2
                                    border-dashed
                                    border-slate-300
                                    bg-slate-50
                                "
                            >
                                {imagePreview ? (
                                    <img
                                        src={
                                            imagePreview
                                        }
                                        alt="Preview"
                                        className="h-64 w-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <ImagePlus
                                            size={
                                                34
                                            }
                                            className="mx-auto text-slate-400"
                                        />

                                        <p className="mt-3 text-sm font-bold text-slate-700">
                                            Select
                                            Image
                                        </p>
                                    </div>
                                )}
                            </label>

                            <input
                                ref={
                                    imageInputRef
                                }
                                id="image"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={
                                    handleImageChange
                                }
                                className="hidden"
                            />

                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={
                                        removeImage
                                    }
                                    className="
                                        mt-3
                                        inline-flex
                                        items-center
                                        gap-2
                                        text-sm
                                        font-bold
                                        text-red-600
                                    "
                                >
                                    <X
                                        size={
                                            16
                                        }
                                    />

                                    Remove Image
                                </button>
                            )}

                            <ErrorMessage
                                value={
                                    imageClientError
                                    ?? form
                                        .errors
                                        .image
                                }
                            />
                        </section>

                        {/* SUMMARY */}
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
                            <h2 className="font-black text-slate-900">
                                Product Summary
                            </h2>

                            <div className="mt-5 space-y-4">
                                <Summary
                                    label="Category"
                                    value={
                                        selectedCategory
                                            ?.name
                                        ??
                                        'Not selected'
                                    }
                                />

                                <Summary
                                    label="Variant Mode"
                                    value={
                                        form.data
                                            .variant_mode
                                        ||
                                        'Not selected'
                                    }
                                />

                                <Summary
                                    label="Variants to Create"
                                    value={String(
                                        variantCount,
                                    )}
                                />

                                <Summary
                                    label="Catalog Status"
                                    value={
                                        form.data
                                            .availability_status
                                    }
                                />
                            </div>
                        </section>

                        {/* SUBMIT */}
                        <ActionProcessingButton
                            type="submit"
                            processing={form.processing}
                            disabled={Boolean(
                                imageClientError,
                            )}
                            idleText="Save Product"
                            processingText="Saving Product..."
                            className="
                                w-full
                                bg-[#0D6EFD]
                                px-5
                                py-4
                                text-white
                                shadow-lg
                                shadow-blue-500/20
                                hover:bg-blue-700
                            "
                        />
                    </aside>
                </form>
            </div>

        <ActionConfirmModal
            open={showCreateConfirm}
            title="Create Product?"
            message={`Create ${form.data.name || 'this product'} and its initial variants?`}
            confirmText="Create Product"
            processingText="Saving Product..."
            processing={form.processing}
            tone="primary"
            onCancel={() =>
                setShowCreateConfirm(false)
            }
            onConfirm={confirmCreateProduct}
        />

        {notification && (
            <ActionNotification
                type={notification.type}
                message={notification.message}
                onClose={clearNotification}
            />
        )}


        </AdminLayout>
    );
}

function SectionHeading({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div>
            <h2 className="text-lg font-black text-slate-900">
                {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
                {description}
            </p>
        </div>
    );
}

function Field({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <div className="space-y-2">
            {children}
        </div>
    );
}

function ErrorMessage({
    value,
}: {
    value?:
        string | null;
}) {
    if (!value) {
        return null;
    }

    return (
        <p className="text-sm font-semibold text-red-600">
            {value}
        </p>
    );
}

function VariantModeButton({
    mode,
    selected,
    onClick,
}: {
    mode:
        VariantModeOption;

    selected:
        boolean;

    onClick:
        () => void;
}) {
    const Icon =
        variantIcon(
            mode.value,
        );

    return (
        <button
            type="button"
            onClick={
                onClick
            }
            className={`
                rounded-2xl
                border-2
                p-5
                text-left
                transition

                ${
                    selected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300'
                }
            `}
        >
            <Icon
                size={22}
                className={
                    selected
                        ? 'text-blue-600'
                        : 'text-slate-500'
                }
            />

            <h3 className="mt-4 font-black text-slate-900">
                {
                    mode.label
                }
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {
                    mode.description
                }
            </p>
        </button>
    );
}

interface Option {
    value: string;
    label: string;
}

function OptionSection({
    title,
    options,
    selected,
    onToggle,
    error,
}: {
    title:
        string;

    options:
        Option[];

    selected:
        string[];

    onToggle:
        (
            value:
                string,
        ) => void;

    error?:
        string;
}) {
    return (
        <div
            className="
                mt-6
                rounded-2xl
                border
                border-slate-200
                p-5
            "
        >
            <h3 className="font-black text-slate-900">
                {title}
            </h3>

            <div
                className="
                    mt-4
                    grid
                    gap-3
                    sm:grid-cols-2
                    lg:grid-cols-3
                "
            >
                {options.map(
                    (
                        option,
                    ) => {
                        const checked =
                            selected.includes(
                                option.value,
                            );

                        return (
                            <button
                                key={
                                    option.value
                                }
                                type="button"
                                onClick={() =>
                                    onToggle(
                                        option.value,
                                    )
                                }
                                className={`
                                    flex
                                    items-center
                                    justify-between
                                    rounded-xl
                                    border-2
                                    px-4
                                    py-3
                                    text-sm
                                    font-bold
                                    transition

                                    ${
                                        checked
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : 'border-slate-200 text-slate-700'
                                    }
                                `}
                            >
                                {
                                    option.label
                                }

                                {checked && (
                                    <Check
                                        size={
                                            16
                                        }
                                    />
                                )}
                            </button>
                        );
                    },
                )}
            </div>

            <ErrorMessage
                value={
                    error
                }
            />
        </div>
    );
}

function Summary({
    label,
    value,
}: {
    label:
        string;

    value:
        string;
}) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-500">
                {label}
            </span>

            <span className="text-right text-sm font-black text-slate-800">
                {value}
            </span>
        </div>
    );
}

function calculateVariantCount(
    mode:
        VariantMode | '',

    programs:
        string[],

    sizes:
        string[],
): number {
    if (
        mode ===
        'program_and_size'
    ) {
        return (
            programs.length
            *
            sizes.length
        );
    }

    if (
        mode ===
        'size_only'
    ) {
        return sizes.length;
    }

    if (
        mode ===
        'standard'
    ) {
        return 1;
    }

    return 0;
}

function variantIcon(
    mode:
        VariantMode,
): LucideIcon {
    if (
        mode ===
        'program_and_size'
    ) {
        return School;
    }

    if (
        mode ===
        'size_only'
    ) {
        return Ruler;
    }

    return Tag;
}

const labelClass =
    'block text-sm font-black text-slate-700';

const inputClass = `
    w-full
    rounded-xl
    border
    border-slate-300
    bg-white
    px-4
    py-3
    text-sm
    text-slate-900
    outline-none
    transition
    focus:border-blue-500
    focus:ring-4
    focus:ring-blue-100
`;