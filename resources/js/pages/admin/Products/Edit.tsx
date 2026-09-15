import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    ImagePlus,
    Package,
    Tag,
    Trash2,
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

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type AvailabilityStatus =
    | 'available'
    | 'coming_soon'
    | 'out_of_stock'
    | 'inactive';

interface Category {
    id: number;

    name: string;

    recommended_variant_mode:
        string | null;
}

interface AvailabilityStatusOption {
    value:
        AvailabilityStatus;

    label:
        string;

    description:
        string;
}

interface Product {
    id:
        number;

    code:
        string;

    category_id:
        number;

    name:
        string;

    description:
        string | null;

    base_price:
        string;

    variant_mode:
        string;

    variant_mode_label:
        string;

    availability_status:
        AvailabilityStatus;

    preorder_enabled:
        boolean;

    expected_release_date:
        string | null;

    preorder_starts_at:
        string | null;

    preorder_ends_at:
        string | null;

    preorder_limit_per_student:
        number | null;

    preorder_capacity:
        number | null;

    image_url:
        string | null;

    is_active:
        boolean;
}

interface EditProductProps {
    product:
        Product;

    categories:
        Category[];

    availabilityStatuses:
        AvailabilityStatusOption[];
}

interface ProductFormData {
    _method:
        'put';

    category_id:
        string;

    name:
        string;

    description:
        string;

    base_price:
        string;

    availability_status:
        AvailabilityStatus;

    preorder_enabled:
        boolean;

    expected_release_date:
        string;

    preorder_starts_at:
        string;

    preorder_ends_at:
        string;

    preorder_limit_per_student:
        string;

    preorder_capacity:
        string;

    image:
        File | null;

    remove_image:
        boolean;

    is_active:
        boolean;
}

const MAX_IMAGE_SIZE_BYTES =
    5 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

/*
|--------------------------------------------------------------------------
| Edit Product
|--------------------------------------------------------------------------
*/

export default function Edit({
    product,
    categories,
    availabilityStatuses,
}: EditProductProps) {
    const [
        imagePreview,
        setImagePreview,
    ] =
        useState<string | null>(
            product.image_url,
        );

    const [
        imageClientError,
        setImageClientError,
    ] =
        useState<string | null>(
            null,
        );

    const imageInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    /*
    |--------------------------------------------------------------------------
    | Date Input Refs
    |--------------------------------------------------------------------------
    */

    const releaseDateRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const preorderStartRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const preorderEndRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const form =
        useForm<ProductFormData>({
            

            _method:
                'put',

            category_id:
                String(
                    product.category_id,
                ),

            name:
                product.name,

            description:
                product.description
                ?? '',

            base_price:
                product.base_price,

            availability_status:
                product
                    .availability_status,

            preorder_enabled:
                product
                    .preorder_enabled,

            expected_release_date:
                product
                    .expected_release_date
                ?? '',

            preorder_starts_at:
                product
                    .preorder_starts_at
                ?? '',

            preorder_ends_at:
                product
                    .preorder_ends_at
                ?? '',

            preorder_limit_per_student:
                product
                    .preorder_limit_per_student
                    !== null
                    ? String(
                        product
                            .preorder_limit_per_student,
                    )
                    : '',

            preorder_capacity:
                product
                    .preorder_capacity
                    !== null
                    ? String(
                        product
                            .preorder_capacity,
                    )
                    : '',

            image:
                null,

            remove_image:
                false,

            is_active:
                product.is_active,
        });

        const [
            showSaveConfirm,
            setShowSaveConfirm,
        ] = useState(false);

        const {
            notification,
            showSuccess,
            showError,
            clearNotification,
        } = useActionFeedback();

    const selectedAvailability =
        availabilityStatuses.find(
            (
                item,
            ) =>
                item.value
                ===
                form.data
                    .availability_status,
        )
        ?? null;

    /*
    |--------------------------------------------------------------------------
    | Cleanup Image Preview
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        return () => {
            if (
                imagePreview
                &&
                imagePreview
                !==
                product.image_url
            ) {
                URL.revokeObjectURL(
                    imagePreview,
                );
            }
        };
    }, [
        imagePreview,
        product.image_url,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Open Native Calendar Picker
    |--------------------------------------------------------------------------
    */

    const openPicker =
        (
            ref:
                React.RefObject<HTMLInputElement | null>,
        ): void => {
            const input =
                ref.current;

            if (!input) {
                return;
            }

            input.focus();

            if (
                typeof input.showPicker
                ===
                'function'
            ) {
                input.showPicker();
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Availability
    |--------------------------------------------------------------------------
    */

    const selectAvailability =
        (
            status:
                AvailabilityStatus,
        ): void => {
            form.setData(
                'availability_status',
                status,
            );

            form.clearErrors(
                'availability_status',
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
    | Preorder Toggle
    |--------------------------------------------------------------------------
    */

    const togglePreorder =
        (
            enabled:
                boolean,
        ): void => {
            form.setData(
                'preorder_enabled',
                enabled,
            );

            form.clearErrors(
                'preorder_enabled',
            );

            if (!enabled) {
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

    const handleImageChange =
        (
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
                    'Use a JPG, PNG, or WEBP image.',
                );

                event.target.value =
                    '';

                return;
            }

            if (
                file.size >
                MAX_IMAGE_SIZE_BYTES
            ) {
                setImageClientError(
                    'The image must not exceed 5 MB.',
                );

                event.target.value =
                    '';

                return;
            }

            if (
                imagePreview
                &&
                imagePreview !==
                product.image_url
            ) {
                URL.revokeObjectURL(
                    imagePreview,
                );
            }

            const preview =
                URL.createObjectURL(
                    file,
                );

            setImagePreview(
                preview,
            );

            form.setData(
                'image',
                file,
            );

            form.setData(
                'remove_image',
                false,
            );
        };

    const removeImage =
        (): void => {
            if (
                imagePreview
                &&
                imagePreview !==
                product.image_url
            ) {
                URL.revokeObjectURL(
                    imagePreview,
                );
            }

            setImagePreview(
                null,
            );

            form.setData(
                'image',
                null,
            );

            form.setData(
                'remove_image',
                true,
            );

            setImageClientError(
                null,
            );

            if (
                imageInputRef.current
            ) {
                imageInputRef
                    .current
                    .value =
                    '';
            }
        };

    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

            const submit =
                (
                    event:
                        FormEvent<HTMLFormElement>,
                ): void => {
                    event.preventDefault();

                    if (
                        imageClientError
                        || form.processing
                    ) {
                        return;
                    }

                    setShowSaveConfirm(true);
                };


                const confirmSave = (): void => {
                if (
                    form.processing
                    || imageClientError
                ) {
                    return;
                }

                form.post(
                    `/admin/products/${product.id}`,
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        preserveState: true,


                        onSuccess: () => {
                            setShowSaveConfirm(false);

                            showSuccess(
                                'Product changes saved successfully.',
                            );
                        },

                        onError: (errors) => {
                            setShowSaveConfirm(false);

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
                                'Product changes could not be saved. Please check the form and try again.',
                            );
                        },
                    },
                );
            };

    return (
        <AdminLayout>
            <Head
                title={`Edit ${product.name}`}
            />

            <div
                className="
                    mx-auto
                    max-w-6xl
                    space-y-7
                "
            >
                {/* HEADER */}
                <section
                    className="
                        flex
                        flex-col
                        gap-4
                        md:flex-row
                        md:items-start
                        md:justify-between
                    "
                >
                    <div>
                        <Link
                            href="/admin/products"
                            className="
                                inline-flex
                                items-center
                                gap-2
                                text-sm
                                font-bold
                                text-slate-500
                                transition
                                hover:text-blue-600
                            "
                        >
                            <ArrowLeft
                                size={17}
                            />

                            Back to Products
                        </Link>

                        <p
                            className="
                                mt-5
                                text-xs
                                font-black
                                uppercase
                                tracking-wide
                                text-blue-600
                            "
                        >
                            {product.code}
                        </p>

                        <h1
                            className="
                                mt-1
                                text-3xl
                                font-black
                                text-slate-900
                            "
                        >
                            Edit Product
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
                            Update merchandise
                            information, catalog
                            availability, preorder
                            configuration, and
                            product status.
                        </p>
                    </div>

                    <Link
                        href={`/admin/products/${product.id}/variants`}
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-blue-200
                            bg-blue-50
                            px-4
                            py-3
                            text-sm
                            font-black
                            text-blue-700
                            transition
                            hover:bg-blue-100
                        "
                    >
                        <Package
                            size={18}
                        />

                        Manage Variants
                    </Link>
                </section>

                <form
                    onSubmit={
                        submit
                    }
                    className="
                        grid
                        gap-7
                        xl:grid-cols-[1fr_360px]
                    "
                >
                    <div
                        className="
                            space-y-7
                        "
                    >
                        {/* BASIC INFORMATION */}
                        <section
                            className="
                                rounded-3xl
                                border
                                border-slate-200
                                bg-white
                                p-7
                                shadow-sm
                            "
                        >
                            <div
                                className="
                                    mb-6
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
                                        bg-blue-50
                                        text-blue-600
                                    "
                                >
                                    <Tag
                                        size={20}
                                    />
                                </div>

                                <div>
                                    <h2
                                        className="
                                            text-lg
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        Product Information
                                    </h2>

                                    <p
                                        className="
                                            mt-1
                                            text-sm
                                            text-slate-500
                                        "
                                    >
                                        Update the general
                                        merchandise details.
                                    </p>
                                </div>
                            </div>

                            <div
                                className="
                                    grid
                                    gap-5
                                    md:grid-cols-2
                                "
                            >
                                <div>
                                    <FieldLabel>
                                        Product Code
                                    </FieldLabel>

                                    <input
                                        value={
                                            product.code
                                        }
                                        disabled
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-slate-100
                                            px-4
                                            py-3
                                            font-mono
                                            text-sm
                                            font-bold
                                            text-slate-500
                                        "
                                    />

                                    <FieldHelp>
                                        Product codes cannot
                                        be changed after
                                        creation.
                                    </FieldHelp>
                                </div>

                                <div>
                                    <FieldLabel>
                                        Category
                                    </FieldLabel>

                                    <select
                                        value={
                                            form.data
                                                .category_id
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            form.setData(
                                                'category_id',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={
                                            inputClasses(
                                                Boolean(
                                                    form.errors
                                                        .category_id,
                                                ),
                                            )
                                        }
                                    >
                                        <option
                                            value=""
                                        >
                                            Select category
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
                                        message={
                                            form.errors
                                                .category_id
                                        }
                                    />
                                </div>

                                <div
                                    className="
                                        md:col-span-2
                                    "
                                >
                                    <FieldLabel>
                                        Product Name
                                    </FieldLabel>

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
                                        className={
                                            inputClasses(
                                                Boolean(
                                                    form.errors
                                                        .name,
                                                ),
                                            )
                                        }
                                    />

                                    <ErrorMessage
                                        message={
                                            form.errors
                                                .name
                                        }
                                    />
                                </div>

                                <div>
                                    <FieldLabel>
                                        Base Price
                                    </FieldLabel>

                                    <input
                                        type="number"
                                        min="0"
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
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={
                                            inputClasses(
                                                Boolean(
                                                    form.errors
                                                        .base_price,
                                                ),
                                            )
                                        }
                                    />

                                    <ErrorMessage
                                        message={
                                            form.errors
                                                .base_price
                                        }
                                    />
                                </div>

                                <div>
                                    <FieldLabel>
                                        Variant Tracking
                                    </FieldLabel>

                                    <input
                                        value={
                                            product
                                                .variant_mode_label
                                        }
                                        disabled
                                        className="
                                            w-full
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-slate-100
                                            px-4
                                            py-3
                                            text-sm
                                            font-bold
                                            text-slate-500
                                        "
                                    />

                                    <FieldHelp>
                                        Use Manage Variants
                                        to maintain existing
                                        product variants.
                                    </FieldHelp>
                                </div>

                                <div
                                    className="
                                        md:col-span-2
                                    "
                                >
                                    <FieldLabel>
                                        Description
                                    </FieldLabel>

                                    <textarea
                                        rows={5}
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
                                        className={
                                            inputClasses(
                                                Boolean(
                                                    form.errors
                                                        .description,
                                                ),
                                            )
                                        }
                                    />

                                    <ErrorMessage
                                        message={
                                            form.errors
                                                .description
                                        }
                                    />
                                </div>
                            </div>
                        </section>

                        {/* AVAILABILITY */}
                        <section
                            className="
                                rounded-3xl
                                border
                                border-slate-200
                                bg-white
                                p-7
                                shadow-sm
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
                                    Catalog Availability
                                </h2>

                                <p
                                    className="
                                        mt-1
                                        text-sm
                                        text-slate-500
                                    "
                                >
                                    Control how this
                                    product behaves in
                                    the Student catalog.
                                </p>
                            </div>

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
                                        const active =
                                            form.data
                                                .availability_status
                                            ===
                                            status.value;

                                        return (
                                            <button
                                                key={
                                                    status.value
                                                }
                                                type="button"
                                                onClick={() =>
                                                    selectAvailability(
                                                        status.value,
                                                    )
                                                }
                                                className={`
                                                    relative
                                                    rounded-2xl
                                                    border-2
                                                    p-5
                                                    text-left
                                                    transition

                                                    ${
                                                        active
                                                            ? 'border-blue-600 bg-blue-50 shadow-sm'
                                                            : 'border-slate-200 bg-white hover:border-blue-300'
                                                    }
                                                `}
                                            >
                                                {active && (
                                                    <div
                                                        className="
                                                            absolute
                                                            right-4
                                                            top-4
                                                            flex
                                                            h-6
                                                            w-6
                                                            items-center
                                                            justify-center
                                                            rounded-full
                                                            bg-blue-600
                                                            text-white
                                                        "
                                                    >
                                                        <CheckCircle2
                                                            size={15}
                                                        />
                                                    </div>
                                                )}

                                                <h3
                                                    className="
                                                        pr-8
                                                        font-black
                                                        text-slate-900
                                                    "
                                                >
                                                    {
                                                        status.label
                                                    }
                                                </h3>

                                                <p
                                                    className="
                                                        mt-2
                                                        pr-6
                                                        text-sm
                                                        leading-6
                                                        text-slate-500
                                                    "
                                                >
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
                                message={
                                    form.errors
                                        .availability_status
                                }
                            />

                            {selectedAvailability && (
                                <div
                                    className="
                                        mt-5
                                        rounded-2xl
                                        border
                                        border-blue-100
                                        bg-blue-50/60
                                        p-4
                                    "
                                >
                                    <p
                                        className="
                                            text-xs
                                            font-black
                                            uppercase
                                            tracking-wide
                                            text-blue-600
                                        "
                                    >
                                        Selected Status
                                    </p>

                                    <p
                                        className="
                                            mt-1
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        {
                                            selectedAvailability.label
                                        }
                                    </p>
                                </div>
                            )}

                            {/* COMING SOON */}
                            {form.data
                                .availability_status ===
                                'coming_soon' && (
                                <div
                                    className="
                                        mt-6
                                        space-y-5
                                        rounded-2xl
                                        border
                                        border-amber-200
                                        bg-amber-50/60
                                        p-5
                                    "
                                >
                                    <div>
                                        <FieldLabel>
                                            Expected Release Date
                                        </FieldLabel>

                                        <DatePickerField
                                            inputRef={
                                                releaseDateRef
                                            }
                                            type="date"
                                            value={
                                                form.data
                                                    .expected_release_date
                                            }
                                            onChange={(
                                                value,
                                            ) =>
                                                form.setData(
                                                    'expected_release_date',
                                                    value,
                                                )
                                            }
                                            onOpen={() =>
                                                openPicker(
                                                    releaseDateRef,
                                                )
                                            }
                                            hasError={
                                                Boolean(
                                                    form.errors
                                                        .expected_release_date,
                                                )
                                            }
                                        />

                                        <ErrorMessage
                                            message={
                                                form.errors
                                                    .expected_release_date
                                            }
                                        />
                                    </div>

                                    <label
                                        className="
                                            flex
                                            cursor-pointer
                                            items-start
                                            gap-3
                                            rounded-xl
                                            border
                                            border-amber-200
                                            bg-white
                                            p-4
                                        "
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                form.data
                                                    .preorder_enabled
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                togglePreorder(
                                                    event
                                                        .target
                                                        .checked,
                                                )
                                            }
                                            className="
                                                mt-1
                                                h-4
                                                w-4
                                                rounded
                                                border-slate-300
                                                text-blue-600
                                                focus:ring-blue-500
                                            "
                                        />

                                        <span>
                                            <span
                                                className="
                                                    block
                                                    text-sm
                                                    font-black
                                                    text-slate-800
                                                "
                                            >
                                                Enable Student Preorders
                                            </span>

                                            <span
                                                className="
                                                    mt-1
                                                    block
                                                    text-sm
                                                    leading-6
                                                    text-slate-500
                                                "
                                            >
                                                Students can preorder this
                                                product while the preorder
                                                period is open.
                                            </span>
                                        </span>
                                    </label>

                                    <ErrorMessage
                                        message={
                                            form.errors
                                                .preorder_enabled
                                        }
                                    />

                                    {form.data
                                        .preorder_enabled && (
                                        <div
                                            className="
                                                grid
                                                gap-5
                                                md:grid-cols-2
                                            "
                                        >
                                            <div>
                                                <FieldLabel>
                                                    Preorder Starts
                                                </FieldLabel>

                                                <DatePickerField
                                                    inputRef={
                                                        preorderStartRef
                                                    }
                                                    type="datetime-local"
                                                    value={
                                                        form.data
                                                            .preorder_starts_at
                                                    }
                                                    onChange={(
                                                        value,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_starts_at',
                                                            value,
                                                        )
                                                    }
                                                    onOpen={() =>
                                                        openPicker(
                                                            preorderStartRef,
                                                        )
                                                    }
                                                    hasError={
                                                        Boolean(
                                                            form.errors
                                                                .preorder_starts_at,
                                                        )
                                                    }
                                                />

                                                <ErrorMessage
                                                    message={
                                                        form.errors
                                                            .preorder_starts_at
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <FieldLabel>
                                                    Preorder Ends
                                                </FieldLabel>

                                                <DatePickerField
                                                    inputRef={
                                                        preorderEndRef
                                                    }
                                                    type="datetime-local"
                                                    value={
                                                        form.data
                                                            .preorder_ends_at
                                                    }
                                                    onChange={(
                                                        value,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_ends_at',
                                                            value,
                                                        )
                                                    }
                                                    onOpen={() =>
                                                        openPicker(
                                                            preorderEndRef,
                                                        )
                                                    }
                                                    hasError={
                                                        Boolean(
                                                            form.errors
                                                                .preorder_ends_at,
                                                        )
                                                    }
                                                />

                                                <ErrorMessage
                                                    message={
                                                        form.errors
                                                            .preorder_ends_at
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <FieldLabel>
                                                    Limit Per Student
                                                </FieldLabel>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="99"
                                                    step="1"
                                                    placeholder="2"
                                                    value={
                                                        form.data
                                                            .preorder_limit_per_student
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_limit_per_student',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className={
                                                        inputClasses(
                                                            Boolean(
                                                                form.errors
                                                                    .preorder_limit_per_student,
                                                            ),
                                                        )
                                                    }
                                                />

                                                <ErrorMessage
                                                    message={
                                                        form.errors
                                                            .preorder_limit_per_student
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <FieldLabel>
                                                    Total Preorder Capacity
                                                </FieldLabel>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    placeholder="100"
                                                    value={
                                                        form.data
                                                            .preorder_capacity
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        form.setData(
                                                            'preorder_capacity',
                                                            event
                                                                .target
                                                                .value,
                                                        )
                                                    }
                                                    className={
                                                        inputClasses(
                                                            Boolean(
                                                                form.errors
                                                                    .preorder_capacity,
                                                            ),
                                                        )
                                                    }
                                                />

                                                <ErrorMessage
                                                    message={
                                                        form.errors
                                                            .preorder_capacity
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* RIGHT SIDEBAR */}
                    <aside
                        className="
                            space-y-6
                        "
                    >
                        {/* IMAGE */}
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
                            <h2
                                className="
                                    font-black
                                    text-slate-900
                                "
                            >
                                Product Image
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-xs
                                    leading-5
                                    text-slate-500
                                "
                            >
                                JPG, PNG, or WEBP.
                                Maximum 5 MB.
                            </p>

                            <div
                                className="
                                    mt-5
                                    overflow-hidden
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-slate-50
                                "
                            >
                                {imagePreview ? (
                                    <img
                                        src={
                                            imagePreview
                                        }
                                        alt={
                                            form.data
                                                .name
                                            ||
                                            'Product preview'
                                        }
                                        className="
                                            aspect-square
                                            w-full
                                            object-cover
                                        "
                                    />
                                ) : (
                                    <div
                                        className="
                                            flex
                                            aspect-square
                                            items-center
                                            justify-center
                                            text-slate-300
                                        "
                                    >
                                        <ImagePlus
                                            size={48}
                                        />
                                    </div>
                                )}
                            </div>

                            <input
                                ref={
                                    imageInputRef
                                }
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                onChange={
                                    handleImageChange
                                }
                                className="
                                    mt-4
                                    block
                                    w-full
                                    text-xs
                                    text-slate-500
                                    file:mr-3
                                    file:rounded-lg
                                    file:border-0
                                    file:bg-blue-50
                                    file:px-3
                                    file:py-2
                                    file:text-xs
                                    file:font-black
                                    file:text-blue-700
                                "
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
                                        text-xs
                                        font-black
                                        text-red-600
                                        transition
                                        hover:text-red-700
                                    "
                                >
                                    <Trash2
                                        size={15}
                                    />

                                    Remove Image
                                </button>
                            )}

                            <ErrorMessage
                                message={
                                    imageClientError
                                    ??
                                    form.errors
                                        .image
                                }
                            />
                        </section>

                        {/* PRODUCT STATUS */}
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
                                    items-start
                                    gap-3
                                "
                            >
                                <div
                                    className={`
                                        flex
                                        h-10
                                        w-10
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded-xl

                                        ${
                                            form.data
                                                .is_active
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-slate-100 text-slate-500'
                                        }
                                    `}
                                >
                                    <CheckCircle2
                                        size={19}
                                    />
                                </div>

                                <div>
                                    <h2
                                        className="
                                            font-black
                                            text-slate-900
                                        "
                                    >
                                        Product Status
                                    </h2>

                                    <p
                                        className="
                                            mt-1
                                            text-xs
                                            leading-5
                                            text-slate-500
                                        "
                                    >
                                        Control whether the
                                        product remains active.
                                    </p>
                                </div>
                            </div>

                            <label
                                className="
                                    mt-5
                                    flex
                                    cursor-pointer
                                    items-center
                                    gap-3
                                    rounded-xl
                                    bg-slate-50
                                    p-4
                                "
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        form.data
                                            .is_active
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        form.setData(
                                            'is_active',
                                            event
                                                .target
                                                .checked,
                                        )
                                    }
                                    className="
                                        h-4
                                        w-4
                                        rounded
                                        border-slate-300
                                        text-blue-600
                                        focus:ring-blue-500
                                    "
                                />

                                <span
                                    className="
                                        text-sm
                                        font-black
                                        text-slate-700
                                    "
                                >
                                    Product is active
                                </span>
                            </label>

                            <ErrorMessage
                                message={
                                    form.errors
                                        .is_active
                                }
                            />
                        </section>

                        {/* PREORDER SUMMARY */}
                        {form.data
                            .availability_status ===
                            'coming_soon' && (
                            <section
                                className="
                                    rounded-3xl
                                    border
                                    border-amber-200
                                    bg-amber-50
                                    p-5
                                "
                            >
                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        text-amber-700
                                    "
                                >
                                    <CalendarDays
                                        size={18}
                                    />

                                    <h2
                                        className="
                                            font-black
                                        "
                                    >
                                        Coming Soon
                                    </h2>
                                </div>

                                <p
                                    className="
                                        mt-3
                                        text-xs
                                        leading-5
                                        text-amber-800
                                    "
                                >
                                    {form.data
                                        .preorder_enabled
                                        ? 'Student preorder access is enabled.'
                                        : 'Student preorders are currently disabled.'}
                                </p>

                                {form.data
                                    .preorder_enabled && (
                                    <div
                                        className="
                                            mt-4
                                            flex
                                            items-start
                                            gap-2
                                            rounded-xl
                                            bg-white/70
                                            p-3
                                            text-xs
                                            text-amber-800
                                        "
                                    >
                                        <Clock3
                                            size={15}
                                            className="
                                                mt-0.5
                                                shrink-0
                                            "
                                        />

                                        Click the calendar
                                        icon beside each
                                        date field to choose
                                        the date and time.
                                    </div>
                                )}
                            </section>
                        )}

                        {/* SAVE */}
                        <ActionProcessingButton
                            type="submit"
                            processing={form.processing}
                            disabled={Boolean(imageClientError)}
                            idleText="Save Changes"
                            processingText="Saving..."
                            className="
                                w-full
                                bg-[#0D6EFD]
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
                                        open={showSaveConfirm}
                                        title="Save Product Changes?"
                                        message={`Save the updated information for ${product.name}?`}
                                        confirmText="Save Changes"
                                        processingText="Saving..."
                                        processing={form.processing}
                                        tone="primary"
                                        onCancel={() =>
                                            setShowSaveConfirm(false)
                                        }
                                        onConfirm={confirmSave}
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

/*
|--------------------------------------------------------------------------
| Date Picker Field
|--------------------------------------------------------------------------
*/

function DatePickerField({
    inputRef,
    type,
    value,
    onChange,
    onOpen,
    hasError,
}: {
    inputRef:
        React.RefObject<HTMLInputElement | null>;

    type:
        'date'
        | 'datetime-local';

    value:
        string;

    onChange:
        (
            value:
                string,
        ) => void;

    onOpen:
        () => void;

    hasError:
        boolean;
}) {
    return (
        <div
            className="
                relative
            "
        >
            <input
                ref={
                    inputRef
                }
                type={
                    type
                }
                value={
                    value
                }
                onChange={(
                    event,
                ) =>
                    onChange(
                        event
                            .target
                            .value,
                    )
                }
                className={`
                    w-full
                    rounded-xl
                    border
                    bg-white
                    py-3
                    pl-4
                    pr-14
                    text-sm
                    font-medium
                    text-slate-800
                    outline-none
                    transition

                    ${
                        hasError
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                    }

                    [&::-webkit-calendar-picker-indicator]:opacity-0
                    [&::-webkit-calendar-picker-indicator]:absolute
                    [&::-webkit-calendar-picker-indicator]:right-0
                    [&::-webkit-calendar-picker-indicator]:h-full
                    [&::-webkit-calendar-picker-indicator]:w-12
                `}
            />

            <button
                type="button"
                onClick={
                    onOpen
                }
                aria-label="Open calendar"
                title="Open calendar"
                className="
                    absolute
                    right-2
                    top-1/2
                    flex
                    h-9
                    w-9
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-lg
                    text-blue-600
                    transition
                    hover:bg-blue-50
                    hover:text-blue-700
                    focus:outline-none
                    focus:ring-2
                    focus:ring-blue-200
                "
            >
                <CalendarDays
                    size={19}
                />
            </button>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Field Label
|--------------------------------------------------------------------------
*/

function FieldLabel({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <label
            className="
                mb-2
                block
                text-sm
                font-black
                text-slate-700
            "
        >
            {children}
        </label>
    );
}

/*
|--------------------------------------------------------------------------
| Field Help
|--------------------------------------------------------------------------
*/

function FieldHelp({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <p
            className="
                mt-1.5
                text-xs
                leading-5
                text-slate-400
            "
        >
            {children}
        </p>
    );
}

/*
|--------------------------------------------------------------------------
| Error Message
|--------------------------------------------------------------------------
*/

function ErrorMessage({
    message,
}: {
    message?:
        string | null;
}) {
    if (!message) {
        return null;
    }

    return (
        <p
            className="
                mt-2
                text-xs
                font-bold
                text-red-600
            "
        >
            {message}
        </p>
    );
}

/*
|--------------------------------------------------------------------------
| Input Classes
|--------------------------------------------------------------------------
*/

function inputClasses(
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
        font-medium
        text-slate-800
        outline-none
        transition

        ${
            hasError
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
        }
    `;
}