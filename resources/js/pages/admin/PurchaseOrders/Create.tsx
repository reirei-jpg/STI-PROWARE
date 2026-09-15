import {
    ArrowLeft,
    ClipboardList,
    PackagePlus,
    Plus,
    Search,
    Pencil,
    Truck,
    X,
} from 'lucide-react';

import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';

import {
    FormEvent,
    useMemo,
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

type AddMode =
    | 'existing_catalog'
    | 'new_inventory';

type SourceType =
    | 'existing_catalog'
    | 'new_inventory';

type VariantMode =
    | 'standard'
    | 'size_only'
    | 'program_and_size';

interface VariantInventory {
    quantity_on_hand: number;
    quantity_reserved: number;
    available_quantity: number;
    reorder_level: number;
}

interface VariantProduct {
    id: number;
    code: string;
    name: string;
    category: string;
}

interface PurchaseVariant {
    id: number;
    sku: string;
    variant_name: string;
    program: string | null;
    size: string | null;
    product: VariantProduct;
    inventory: VariantInventory;
}

interface CategoryOption {
    id: number;
    name: string;
}

interface ConfigurationOption {
    value: string;
    label: string;
    code?: string;
}

interface ProductConfiguration {
    variant_modes: Array<{
        value: VariantMode;
        label: string;
    }>;
    programs: ConfigurationOption[];
    sizes: ConfigurationOption[];
}

interface Props {
    variants: PurchaseVariant[];
    categories: CategoryOption[];
    productConfiguration: ProductConfiguration;
}

interface PurchaseOrderItemForm {
    source_type: SourceType;

    product_variant_id: number | null;

    category_id: number | null;
    product_name: string | null;
    product_description: string | null;
    base_price: string | null;
    variant_mode: VariantMode | null;
    programs: string[];
    sizes: string[];

    quantity_ordered: number;
    unit_cost: string;
}

interface PurchaseOrderForm {
    supplier_name: string;
    supplier_reference_number: string;
    expected_delivery_date: string;
    notes: string;
    items: PurchaseOrderItemForm[];
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Create({
    variants,
    categories,
    productConfiguration,
}: Props) {
    const [
        addMode,
        setAddMode,
    ] = useState<AddMode>(
        'existing_catalog',
    );

    /*
    |--------------------------------------------------------------------------
    | Existing Product State
    |--------------------------------------------------------------------------
    */

    const [
        search,
        setSearch,
    ] = useState('');

    const [
        selectedVariantId,
        setSelectedVariantId,
    ] = useState<number | null>(
        null,
    );

    /*
    |--------------------------------------------------------------------------
    | Shared Quantity / Cost
    |--------------------------------------------------------------------------
    */

    const [
        quantity,
        setQuantity,
    ] = useState('1');

    const [
        unitCost,
        setUnitCost,
    ] = useState('');

    /*
    |--------------------------------------------------------------------------
    | New Inventory Product State
    |--------------------------------------------------------------------------
    */

    const [
        newCategoryId,
        setNewCategoryId,
    ] = useState('');

    const [
        newProductName,
        setNewProductName,
    ] = useState('');

    const [
        newProductDescription,
        setNewProductDescription,
    ] = useState('');

    const [
        newBasePrice,
        setNewBasePrice,
    ] = useState('');

    const [
        newVariantMode,
        setNewVariantMode,
    ] = useState<VariantMode>(
        'standard',
    );

    const [
        newPrograms,
        setNewPrograms,
    ] = useState<string[]>([]);

    const [
        newSizes,
        setNewSizes,
    ] = useState<string[]>([]);

    /*
    |--------------------------------------------------------------------------
    | Errors / Editing
    |--------------------------------------------------------------------------
    */

    const [
        localError,
        setLocalError,
    ] = useState<string | null>(
        null,
    );

    const [
        editingIndex,
        setEditingIndex,
    ] = useState<number | null>(
        null,
    );

    const [
        editQuantity,
        setEditQuantity,
    ] = useState('1');

    const [
        editUnitCost,
        setEditUnitCost,
    ] = useState('');

    const [
        editCategoryId,
        setEditCategoryId,
    ] = useState('');

    const [
        editProductName,
        setEditProductName,
    ] = useState('');

    const [
        editProductDescription,
        setEditProductDescription,
    ] = useState('');

    const [
        editBasePrice,
        setEditBasePrice,
    ] = useState('');

    const [
        editVariantMode,
        setEditVariantMode,
    ] = useState<VariantMode>(
        'standard',
    );

    const [
        editPrograms,
        setEditPrograms,
    ] = useState<string[]>([]);

    const [
        editSizes,
        setEditSizes,
    ] = useState<string[]>([]);

    const [
        editError,
        setEditError,
    ] = useState<string | null>(
        null,
    );

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



    /*
    |--------------------------------------------------------------------------
    | Inertia Form
    |--------------------------------------------------------------------------
    */

    const form =
        useForm<PurchaseOrderForm>({
            supplier_name: '',
            supplier_reference_number: '',
            expected_delivery_date: '',
            notes: '',
            items: [],
        });

    /*
    |--------------------------------------------------------------------------
    | Existing Product Search
    |--------------------------------------------------------------------------
    */

    const filteredVariants =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            if (!query) {
                return variants;
            }

            return variants.filter(
                (variant) => {
                    const searchable =
                        [
                            variant.product.code,
                            variant.product.name,
                            variant.product.category,
                            variant.sku,
                            variant.variant_name,
                            variant.program ?? '',
                            variant.size ?? '',
                        ]
                            .join(' ')
                            .toLowerCase();

                    return searchable.includes(
                        query,
                    );
                },
            );
        }, [
            variants,
            search,
        ]);

    const selectedVariant =
        selectedVariantId
            ? variants.find(
                  (variant) =>
                      variant.id ===
                      selectedVariantId,
              )
            : undefined;

    /*
    |--------------------------------------------------------------------------
    | Summary
    |--------------------------------------------------------------------------
    |
    | For a new product, the backend creates one PO line for every generated
    | variant. Therefore the summary counts quantity × generated variants.
    |
    */

    const totalUnits =
        form.data.items.reduce(
            (
                total,
                item,
            ) =>
                total
                + item.quantity_ordered
                    * getItemVariantCount(
                        item,
                    ),
            0,
        );

    const estimatedCost =
        form.data.items.reduce(
            (
                total,
                item,
            ) => {
                const price =
                    Number(
                        item.unit_cost ||
                            0,
                    );

                return (
                    total
                    + price
                        * item.quantity_ordered
                        * getItemVariantCount(
                            item,
                        )
                );
            },
            0,
        );

    /*
    |--------------------------------------------------------------------------
    | Add Existing Product
    |--------------------------------------------------------------------------
    */

    const addCatalogItem =
        (): void => {
            setLocalError(
                null,
            );

            if (!selectedVariant) {
                setLocalError(
                    'Select a product variant first.',
                );

                return;
            }

            const parsedQuantity =
                parsePositiveInteger(
                    quantity,
                );

            if (parsedQuantity === null) {
                setLocalError(
                    'Quantity must be at least 1.',
                );

                return;
            }

            if (
                !isValidMoney(
                    unitCost,
                    false,
                )
            ) {
                setLocalError(
                    'Unit cost must be a valid amount.',
                );

                return;
            }

            const duplicate =
                form.data.items.some(
                    (
                        item,
                    ) =>
                        item.source_type ===
                            'existing_catalog'
                        && item.product_variant_id ===
                            selectedVariant.id,
                );

            if (duplicate) {
                setLocalError(
                    'This catalog variant is already included in the purchase order.',
                );

                return;
            }

            form.setData(
                'items',
                [
                    ...form.data.items,
                    {
                        source_type:
                            'existing_catalog',

                        product_variant_id:
                            selectedVariant.id,

                        category_id:
                            null,

                        product_name:
                            null,

                        product_description:
                            null,

                        base_price:
                            null,

                        variant_mode:
                            null,

                        programs:
                            [],

                        sizes:
                            [],

                        quantity_ordered:
                            parsedQuantity,

                        unit_cost:
                            unitCost.trim(),
                    },
                ],
            );

            setSelectedVariantId(
                null,
            );

            setQuantity(
                '1',
            );

            setUnitCost(
                '',
            );

            setSearch(
                '',
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Add New Inventory Item
    |--------------------------------------------------------------------------
    */

    const addNewInventoryItem =
        (): void => {
            setLocalError(
                null,
            );

            const validationError =
                validateNewInventoryItem({
                    categoryId:
                        newCategoryId,

                    productName:
                        newProductName,

                    basePrice:
                        newBasePrice,

                    variantMode:
                        newVariantMode,

                    programs:
                        newPrograms,

                    sizes:
                        newSizes,

                    quantity,

                    unitCost,
                });

            if (validationError) {
                setLocalError(
                    validationError,
                );

                return;
            }

            const parsedQuantity =
                Number(
                    quantity,
                );

            form.setData(
                'items',
                [
                    ...form.data.items,
                    {
                        source_type:
                            'new_inventory',

                        product_variant_id:
                            null,

                        category_id:
                            Number(
                                newCategoryId,
                            ),

                        product_name:
                            newProductName
                                .trim(),

                        product_description:
                            newProductDescription
                                .trim()
                            || null,

                        base_price:
                            newBasePrice
                                .trim(),

                        variant_mode:
                            newVariantMode,

                        programs:
                            newVariantMode ===
                            'program_and_size'
                                ? newPrograms
                                : [],

                        sizes:
                            newVariantMode ===
                            'standard'
                                ? []
                                : newSizes,

                        quantity_ordered:
                            parsedQuantity,

                        unit_cost:
                            unitCost.trim(),
                    },
                ],
            );

            resetNewInventoryFields();
        };

    /*
    |--------------------------------------------------------------------------
    | Reset New Product Form
    |--------------------------------------------------------------------------
    */

    const resetNewInventoryFields =
        (): void => {
            setNewCategoryId(
                '',
            );

            setNewProductName(
                '',
            );

            setNewProductDescription(
                '',
            );

            setNewBasePrice(
                '',
            );

            setNewVariantMode(
                'standard',
            );

            setNewPrograms(
                [],
            );

            setNewSizes(
                [],
            );

            setQuantity(
                '1',
            );

            setUnitCost(
                '',
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Variant Mode Change
    |--------------------------------------------------------------------------
    */

    const changeNewVariantMode =
        (
            mode: VariantMode,
        ): void => {
            setNewVariantMode(
                mode,
            );

            if (
                mode ===
                'standard'
            ) {
                setNewPrograms(
                    [],
                );

                setNewSizes(
                    [],
                );
            }

            if (
                mode ===
                'size_only'
            ) {
                setNewPrograms(
                    [],
                );
            }

            setLocalError(
                null,
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Edit Item
    |--------------------------------------------------------------------------
    */

    const startEditingItem =
        (
            index: number,
        ): void => {
            const item =
                form.data.items[
                    index
                ];

            if (!item) {
                return;
            }

            setEditingIndex(
                index,
            );

            setEditQuantity(
                String(
                    item.quantity_ordered,
                ),
            );

            setEditUnitCost(
                item.unit_cost,
            );

            if (
                item.source_type ===
                'new_inventory'
            ) {
                setEditCategoryId(
                    item.category_id
                        ? String(
                              item.category_id,
                          )
                        : '',
                );

                setEditProductName(
                    item.product_name
                    ?? '',
                );

                setEditProductDescription(
                    item.product_description
                    ?? '',
                );

                setEditBasePrice(
                    item.base_price
                    ?? '',
                );

                setEditVariantMode(
                    item.variant_mode
                    ?? 'standard',
                );

                setEditPrograms(
                    item.programs,
                );

                setEditSizes(
                    item.sizes,
                );
            }

            setEditError(
                null,
            );
        };

    const cancelEditingItem =
        (): void => {
            setEditingIndex(
                null,
            );

            setEditError(
                null,
            );
        };

    const saveEditedItem =
        (): void => {
            if (
                editingIndex ===
                null
            ) {
                return;
            }

            const currentItem =
                form.data.items[
                    editingIndex
                ];

            if (!currentItem) {
                return;
            }

            const parsedQuantity =
                parsePositiveInteger(
                    editQuantity,
                );

            if (
                parsedQuantity ===
                null
            ) {
                setEditError(
                    'Quantity must be at least 1.',
                );

                return;
            }

            if (
                !isValidMoney(
                    editUnitCost,
                    false,
                )
            ) {
                setEditError(
                    'Unit cost must be a valid amount.',
                );

                return;
            }

            if (
                currentItem.source_type ===
                'new_inventory'
            ) {
                const validationError =
                    validateNewInventoryItem({
                        categoryId:
                            editCategoryId,

                        productName:
                            editProductName,

                        basePrice:
                            editBasePrice,

                        variantMode:
                            editVariantMode,

                        programs:
                            editPrograms,

                        sizes:
                            editSizes,

                        quantity:
                            editQuantity,

                        unitCost:
                            editUnitCost,
                    });

                if (
                    validationError
                ) {
                    setEditError(
                        validationError,
                    );

                    return;
                }
            }

            const updatedItems =
                form.data.items.map(
                    (
                        item,
                        index,
                    ) => {
                        if (
                            index !==
                            editingIndex
                        ) {
                            return item;
                        }

                        if (
                            item.source_type ===
                            'existing_catalog'
                        ) {
                            return {
                                ...item,

                                quantity_ordered:
                                    parsedQuantity,

                                unit_cost:
                                    editUnitCost
                                        .trim(),
                            };
                        }

                        return {
                            ...item,

                            category_id:
                                Number(
                                    editCategoryId,
                                ),

                            product_name:
                                editProductName
                                    .trim(),

                            product_description:
                                editProductDescription
                                    .trim()
                                || null,

                            base_price:
                                editBasePrice
                                    .trim(),

                            variant_mode:
                                editVariantMode,

                            programs:
                                editVariantMode ===
                                'program_and_size'
                                    ? editPrograms
                                    : [],

                            sizes:
                                editVariantMode ===
                                'standard'
                                    ? []
                                    : editSizes,

                            quantity_ordered:
                                parsedQuantity,

                            unit_cost:
                                editUnitCost
                                    .trim(),
                        };
                    },
                );

            form.setData(
                'items',
                updatedItems,
            );

            setEditingIndex(
                null,
            );

            setEditError(
                null,
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Remove Item
    |--------------------------------------------------------------------------
    */



    /*
    |--------------------------------------------------------------------------
    | Submit
    |--------------------------------------------------------------------------
    */

    const submit =
        (
            event: FormEvent,
        ): void => {
            event.preventDefault();

            setLocalError(
                null,
            );

            if (
                !form.data
                    .supplier_name
                    .trim()
            ) {
                setLocalError(
                    'Supplier name is required.',
                );

                return;
            }

            if (
                form.data.items.length ===
                0
            ) {
                setLocalError(
                    'Add at least one item to the purchase order.',
                );

                return;
            }

            setShowCreateConfirm(
                true,
            );
        };

const confirmCreatePurchaseOrder =
    (): void => {
        form.post(
            '/admin/purchase-orders',
            {
                preserveScroll:
                    true,

                onSuccess:
                    () => {
                        setShowCreateConfirm(
                            false,
                        );

                        showSuccess(
                            'Purchase order created successfully.',
                        );
                    },

                onError:
                    () => {
                        setShowCreateConfirm(
                            false,
                        );

                        showError(
                            'Purchase order could not be created. Please check the information and try again.',
                        );
                    },
            },
        );
    };


    return (
        <AdminLayout>
            <Head title="Create Purchase Order" />

            <div className="space-y-7">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/purchase-orders"
                        className="
                            flex h-12 w-12
                            items-center
                            justify-center
                            rounded-2xl
                            border border-slate-200
                            bg-white
                            text-slate-600
                            shadow-sm
                            transition
                            hover:border-blue-300
                            hover:bg-blue-50
                            hover:text-blue-700
                        "
                    >
                        <ArrowLeft
                            size={20}
                        />
                    </Link>

                    <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            Create Purchase Order
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Order existing merchandise or register a new inventory product while preparing the purchase order.
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={
                        submit
                    }
                    className="
                        grid
                        items-start
                        gap-7
                        xl:grid-cols-[minmax(0,1fr)_360px]
                    "
                >
                    <div className="space-y-6">
                        {/* Supplier Information */}
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Truck
                                        size={21}
                                    />
                                </div>

                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Supplier Information
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Information about this purchase order.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Supplier Name *
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            form.data
                                                .supplier_name
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            form.setData(
                                                'supplier_name',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="ABC Uniform Supplier"
                                        className={inputClass}
                                    />

                                    {form.errors
                                        .supplier_name && (
                                        <p className="mt-2 text-sm font-semibold text-red-600">
                                            {
                                                form
                                                    .errors
                                                    .supplier_name
                                            }
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Supplier Reference
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            form.data
                                                .supplier_reference_number
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            form.setData(
                                                'supplier_reference_number',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="Optional"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Expected Delivery
                                    </label>

                                    <input
                                        type="date"
                                        value={
                                            form.data
                                                .expected_delivery_date
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            form.setData(
                                                'expected_delivery_date',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Notes
                                    </label>

                                    <textarea
                                        value={
                                            form.data
                                                .notes
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            form.setData(
                                                'notes',
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="Optional notes"
                                        className={`${inputClass} min-h-28 resize-y`}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Add Item */}
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                Add Item
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                Purchase Order Items
                            </h2>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddMode(
                                            'existing_catalog',
                                        );

                                        setLocalError(
                                            null,
                                        );

                                        setQuantity(
                                            '1',
                                        );

                                        setUnitCost(
                                            '',
                                        );
                                    }}
                                    className={modeClass(
                                        addMode ===
                                            'existing_catalog',
                                    )}
                                >
                                    Existing Product
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setAddMode(
                                            'new_inventory',
                                        );

                                        setLocalError(
                                            null,
                                        );

                                        setSelectedVariantId(
                                            null,
                                        );

                                        setQuantity(
                                            '1',
                                        );

                                        setUnitCost(
                                            '',
                                        );
                                    }}
                                    className={modeClass(
                                        addMode ===
                                            'new_inventory',
                                    )}
                                >
                                    New Inventory Item
                                </button>
                            </div>

                            {addMode ===
                            'existing_catalog' ? (
                                <div className="mt-6">
                                    <div className="relative">
                                        <Search
                                            size={17}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="text"
                                            value={
                                                search
                                            }
                                            onChange={(
                                                event,
                                            ) => {
                                                setSearch(
                                                    event
                                                        .target
                                                        .value,
                                                );

                                                setSelectedVariantId(
                                                    null,
                                                );
                                            }}
                                            placeholder="Search product, category, SKU, program, or size..."
                                            className="
                                                w-full
                                                rounded-xl
                                                border
                                                border-slate-300
                                                bg-white
                                                py-3
                                                pl-11
                                                pr-4
                                                text-sm
                                                text-slate-900
                                                placeholder:text-slate-400
                                                outline-none
                                                focus:border-blue-500
                                                focus:ring-4
                                                focus:ring-blue-500/10
                                            "
                                        />
                                    </div>

                                    <div className="mt-4 max-h-96 overflow-y-auto rounded-2xl border border-slate-200">
                                        {filteredVariants.map(
                                            (
                                                variant,
                                            ) => {
                                                const added =
                                                    form.data.items.some(
                                                        (
                                                            item,
                                                        ) =>
                                                            item.source_type ===
                                                                'existing_catalog'
                                                            && item.product_variant_id ===
                                                                variant.id,
                                                    );

                                                const selected =
                                                    selectedVariantId ===
                                                    variant.id;

                                                return (
                                                    <button
                                                        key={
                                                            variant.id
                                                        }
                                                        type="button"
                                                        disabled={
                                                            added
                                                        }
                                                        onClick={() => {
                                                            setSelectedVariantId(
                                                                variant.id,
                                                            );

                                                            setLocalError(
                                                                null,
                                                            );
                                                        }}
                                                        className={`
                                                            w-full
                                                            border-b
                                                            border-slate-100
                                                            p-4
                                                            text-left
                                                            transition
                                                            last:border-b-0
                                                            ${
                                                                selected
                                                                    ? 'bg-blue-50'
                                                                    : 'bg-white hover:bg-slate-50'
                                                            }
                                                            ${
                                                                added
                                                                    ? 'cursor-not-allowed opacity-50'
                                                                    : ''
                                                            }
                                                        `}
                                                    >
                                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                            <div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    <span className="font-mono text-xs font-black text-blue-600">
                                                                        {
                                                                            variant
                                                                                .product
                                                                                .code
                                                                        }
                                                                    </span>

                                                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                                                                        {
                                                                            variant
                                                                                .product
                                                                                .category
                                                                        }
                                                                    </span>

                                                                    {added && (
                                                                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">
                                                                            ADDED
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className="mt-1 font-black text-slate-900">
                                                                    {
                                                                        variant
                                                                            .product
                                                                            .name
                                                                    }
                                                                </p>

                                                                <p className="mt-1 text-sm text-slate-500">
                                                                    {
                                                                        variant.variant_name
                                                                    }
                                                                </p>

                                                                <p className="mt-1 text-xs text-slate-400">
                                                                    SKU:{' '}
                                                                    {
                                                                        variant.sku
                                                                    }
                                                                </p>
                                                            </div>

                                                            <div className="grid grid-cols-4 gap-2 text-center">
                                                                <StockBox
                                                                    label="On Hand"
                                                                    value={
                                                                        variant
                                                                            .inventory
                                                                            .quantity_on_hand
                                                                    }
                                                                />

                                                                <StockBox
                                                                    label="Reserved"
                                                                    value={
                                                                        variant
                                                                            .inventory
                                                                            .quantity_reserved
                                                                    }
                                                                />

                                                                <StockBox
                                                                    label="Available"
                                                                    value={
                                                                        variant
                                                                            .inventory
                                                                            .available_quantity
                                                                    }
                                                                />

                                                                <StockBox
                                                                    label="Reorder"
                                                                    value={
                                                                        variant
                                                                            .inventory
                                                                            .reorder_level
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            },
                                        )}

                                        {filteredVariants.length ===
                                            0 && (
                                            <div className="p-8 text-center text-sm text-slate-500">
                                                No matching merchandise found.
                                            </div>
                                        )}
                                    </div>

                                    {selectedVariant && (
                                        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                                Selected Catalog Item
                                            </p>

                                            <h3 className="mt-1 font-black text-slate-900">
                                                {
                                                    selectedVariant
                                                        .product
                                                        .name
                                                }
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-600">
                                                {
                                                    selectedVariant.variant_name
                                                }
                                            </p>

                                            <QuantityCostInputs
                                                quantity={
                                                    quantity
                                                }
                                                setQuantity={
                                                    setQuantity
                                                }
                                                unitCost={
                                                    unitCost
                                                }
                                                setUnitCost={
                                                    setUnitCost
                                                }
                                            />

                                            <button
                                                type="button"
                                                onClick={
                                                    addCatalogItem
                                                }
                                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
                                            >
                                                <Plus
                                                    size={17}
                                                />

                                                Add Existing Product
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                        <p className="text-sm font-black text-blue-900">
                                            Register a new PROWARE inventory product
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-blue-700">
                                            PROWARE will automatically generate the permanent product code, variants, SKUs, and zero-stock inventory records when this purchase order is created.
                                        </p>
                                    </div>

                                    <div className="mt-5 grid gap-5 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Product Name *
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    newProductName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setNewProductName(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Example: Black Boots"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Category *
                                            </label>

                                            <select
                                                value={
                                                    newCategoryId
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setNewCategoryId(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={inputClass}
                                            >
                                                <option value="">
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
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Selling Price *
                                            </label>

                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={
                                                    newBasePrice
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setNewBasePrice(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Example: 650.00"
                                                className={inputClass}
                                            />

                                            <p className="mt-2 text-xs text-slate-400">
                                                This becomes the product&apos;s base selling price in PROWARE.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Variant Mode *
                                            </label>

                                            <select
                                                value={
                                                    newVariantMode
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    changeNewVariantMode(
                                                        event
                                                            .target
                                                            .value as VariantMode,
                                                    )
                                                }
                                                className={inputClass}
                                            >
                                                {productConfiguration.variant_modes.map(
                                                    (
                                                        mode,
                                                    ) => (
                                                        <option
                                                            key={
                                                                mode.value
                                                            }
                                                            value={
                                                                mode.value
                                                            }
                                                        >
                                                            {
                                                                mode.label
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Description
                                            </label>

                                            <textarea
                                                value={
                                                    newProductDescription
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setNewProductDescription(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Optional product description"
                                                className={`${inputClass} min-h-24 resize-y`}
                                            />
                                        </div>
                                    </div>

                                    {newVariantMode ===
                                        'program_and_size' && (
                                        <div className="mt-5">
                                            <OptionChecklist
                                                title="Programs *"
                                                description="Select every program that needs this product."
                                                options={
                                                    productConfiguration.programs
                                                }
                                                selected={
                                                    newPrograms
                                                }
                                                onToggle={(
                                                    value,
                                                ) =>
                                                    setNewPrograms(
                                                        toggleValue(
                                                            newPrograms,
                                                            value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                    )}

                                    {(newVariantMode ===
                                        'size_only'
                                        || newVariantMode ===
                                            'program_and_size') && (
                                        <div className="mt-5">
                                            <OptionChecklist
                                                title="Sizes *"
                                                description="Select every size that will be ordered."
                                                options={
                                                    productConfiguration.sizes
                                                }
                                                selected={
                                                    newSizes
                                                }
                                                onToggle={(
                                                    value,
                                                ) =>
                                                    setNewSizes(
                                                        toggleValue(
                                                            newSizes,
                                                            value,
                                                        ),
                                                    )
                                                }
                                            />
                                        </div>
                                    )}

                                    <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Generated Inventory Variants
                                        </p>

                                        <p className="mt-1 text-2xl font-black text-slate-900">
                                            {getVariantCount(
                                                newVariantMode,
                                                newPrograms,
                                                newSizes,
                                            )}
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            Quantity below is applied to each generated variant. Physical stock remains zero until the Specialist receives the delivery.
                                        </p>
                                    </div>

                                    <QuantityCostInputs
                                        quantity={
                                            quantity
                                        }
                                        setQuantity={
                                            setQuantity
                                        }
                                        unitCost={
                                            unitCost
                                        }
                                        setUnitCost={
                                            setUnitCost
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            addNewInventoryItem
                                        }
                                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
                                    >
                                        <Plus
                                            size={17}
                                        />

                                        Add New Inventory Item
                                    </button>
                                </div>
                            )}

                            {localError && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {
                                        localError
                                    }
                                </div>
                            )}

                            {form.errors
                                .items && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {
                                        form.errors
                                            .items
                                    }
                                </div>
                            )}
                        </section>

                        {/* Selected PO Items */}
                        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-6 py-5">
                                <h2 className="font-black text-slate-900">
                                    Selected PO Items
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Existing catalog merchandise and new inventory products can be included in the same purchase order.
                                </p>
                            </div>

                            {form.data.items.length >
                            0 ? (
                                <div className="divide-y divide-slate-100">
                                    {form.data.items.map(
                                        (
                                            item,
                                            index,
                                        ) => {
                                            const variant =
                                                item.product_variant_id
                                                    ? variants.find(
                                                          (
                                                              candidate,
                                                          ) =>
                                                              candidate.id ===
                                                              item.product_variant_id,
                                                      )
                                                    : undefined;

                                            const category =
                                                item.category_id
                                                    ? categories.find(
                                                          (
                                                              candidate,
                                                          ) =>
                                                              candidate.id ===
                                                              item.category_id,
                                                      )
                                                    : undefined;

                                            return (
                                                <article
                                                    key={`${item.source_type}-${index}`}
                                                    className="p-5"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <span
                                                                className={`
                                                                    inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase
                                                                    ${
                                                                        item.source_type ===
                                                                        'existing_catalog'
                                                                            ? 'bg-blue-100 text-blue-700'
                                                                            : 'bg-violet-100 text-violet-700'
                                                                    }
                                                                `}
                                                            >
                                                                {item.source_type ===
                                                                'existing_catalog'
                                                                    ? 'Existing Product'
                                                                    : 'New Inventory Item'}
                                                            </span>

                                                            <p className="mt-2 font-black text-slate-900">
                                                                {item.source_type ===
                                                                'existing_catalog'
                                                                    ? variant
                                                                          ?.product
                                                                          .name
                                                                      ?? 'Catalog Item'
                                                                    : item.product_name}
                                                            </p>

                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {item.source_type ===
                                                                'existing_catalog'
                                                                    ? variant
                                                                          ?.variant_name
                                                                      ?? ''
                                                                    : category
                                                                          ?.name
                                                                      ?? 'Category unavailable'}
                                                            </p>

                                                            {item.source_type ===
                                                                'existing_catalog' ? (
                                                                <p className="mt-1 text-xs text-slate-400">
                                                                    SKU:{' '}
                                                                    {
                                                                        variant
                                                                            ?.sku
                                                                        ?? 'N/A'
                                                                    }
                                                                </p>
                                                            ) : (
                                                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                                                                        {formatVariantMode(
                                                                            item.variant_mode,
                                                                        )}
                                                                    </span>

                                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                                                                        {getItemVariantCount(
                                                                            item,
                                                                        )}{' '}
                                                                        variant(s)
                                                                    </span>

                                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                                                                        Selling:{' '}
                                                                        {item.base_price
                                                                            ? formatCurrency(
                                                                                  item.base_price,
                                                                              )
                                                                            : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    startEditingItem(
                                                                        index,
                                                                    )
                                                                }
                                                                className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
                                                            >
                                                                <Pencil
                                                                    size={15}
                                                                />

                                                                Edit
                                                            </button>

                                                            
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                                        <InfoBox
                                                            label="Qty / Variant"
                                                            value={String(
                                                                item.quantity_ordered,
                                                            )}
                                                        />

                                                        <InfoBox
                                                            label="Variants"
                                                            value={String(
                                                                getItemVariantCount(
                                                                    item,
                                                                ),
                                                            )}
                                                        />

                                                        <InfoBox
                                                            label="Unit Cost"
                                                            value={
                                                                item.unit_cost
                                                                    ? formatCurrency(
                                                                          item.unit_cost,
                                                                      )
                                                                    : 'Not set'
                                                            }
                                                        />

                                                        <InfoBox
                                                            label="Line Cost"
                                                            value={
                                                                item.unit_cost
                                                                    ? formatCurrency(
                                                                          String(
                                                                              Number(
                                                                                  item.unit_cost,
                                                                              )
                                                                              * item.quantity_ordered
                                                                              * getItemVariantCount(
                                                                                  item,
                                                                              ),
                                                                          ),
                                                                      )
                                                                    : 'Not set'
                                                            }
                                                        />
                                                    </div>
                                                </article>
                                            );
                                        },
                                    )}
                                </div>
                            ) : (
                                <div className="px-6 py-14 text-center">
                                    <ClipboardList
                                        size={42}
                                        className="mx-auto text-slate-300"
                                    />

                                    <p className="mt-4 font-black text-slate-800">
                                        No items added
                                    </p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* PO Summary */}
                    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28">
                        <h2 className="text-xl font-black text-slate-900">
                            PO Summary
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            PO number and new product codes are generated automatically.
                        </p>

                        <div className="mt-6 space-y-4">
                            <SummaryRow
                                label="Item Groups"
                                value={String(
                                    form.data.items
                                        .length,
                                )}
                            />

                            <SummaryRow
                                label="Total Units"
                                value={String(
                                    totalUnits,
                                )}
                            />

                            <SummaryRow
                                label="Estimated Cost"
                                value={
                                    estimatedCost >
                                    0
                                        ? formatCurrency(
                                              String(
                                                  estimatedCost,
                                              ),
                                          )
                                        : 'Not set'
                                }
                            />
                        </div>

                        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-sm font-black text-blue-900">
                                Incoming stock only
                            </p>

                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                Creating this purchase order will not increase physical inventory. Stock is added only after Specialist receiving is confirmed.
                            </p>
                        </div>

                 <ActionProcessingButton
                    type="submit"
                    processing={form.processing}
                    disabled={
                        !form.data.supplier_name.trim()
                        || form.data.items.length === 0
                    }
                    idleText="Create Purchase Order"
                    processingText="Creating PO..."
                    className="
                        mt-6 w-full
                        bg-[#0D6EFD]
                        px-5 py-4
                        text-white
                        hover:bg-blue-700
                    "
                />

                        <Link
                            href="/admin/purchase-orders"
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            <ArrowLeft
                                size={17}
                            />

                            Cancel
                        </Link>
                    </aside>
                </form>
            </div>

            {/* Edit Modal */}
            {editingIndex !==
                null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                    Purchase Order Item
                                </p>

                                <h2 className="mt-1 text-xl font-black text-slate-900">
                                    Edit Item
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    cancelEditingItem
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X
                                    size={20}
                                />
                            </button>
                        </div>

                        <div className="max-h-[75vh] overflow-y-auto p-6">
                            {form.data.items[
                                editingIndex
                            ]?.source_type ===
                            'existing_catalog' ? (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                    {(() => {
                                        const item =
                                            form.data
                                                .items[
                                                editingIndex
                                            ];

                                        const variant =
                                            item
                                                ?.product_variant_id
                                                ? variants.find(
                                                      (
                                                          candidate,
                                                      ) =>
                                                          candidate.id ===
                                                          item.product_variant_id,
                                                  )
                                                : undefined;

                                        return (
                                            <>
                                                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                                    Existing Product
                                                </p>

                                                <h3 className="mt-1 font-black text-slate-900">
                                                    {
                                                        variant
                                                            ?.product
                                                            .name
                                                        ?? 'Catalog Item'
                                                    }
                                                </h3>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    {
                                                        variant
                                                            ?.variant_name
                                                        ?? ''
                                                    }
                                                </p>

                                                <p className="mt-1 font-mono text-xs text-slate-400">
                                                    SKU:{' '}
                                                    {
                                                        variant
                                                            ?.sku
                                                        ?? 'N/A'
                                                    }
                                                </p>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Product Name *
                                            </label>

                                            <input
                                                type="text"
                                                value={
                                                    editProductName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setEditProductName(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Category *
                                            </label>

                                            <select
                                                value={
                                                    editCategoryId
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setEditCategoryId(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={inputClass}
                                            >
                                                <option value="">
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
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Selling Price *
                                            </label>

                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={
                                                    editBasePrice
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setEditBasePrice(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Variant Mode *
                                            </label>

                                            <select
                                                value={
                                                    editVariantMode
                                                }
                                                onChange={(
                                                    event,
                                                ) => {
                                                    const mode =
                                                        event
                                                            .target
                                                            .value as VariantMode;

                                                    setEditVariantMode(
                                                        mode,
                                                    );

                                                    if (
                                                        mode ===
                                                        'standard'
                                                    ) {
                                                        setEditPrograms(
                                                            [],
                                                        );

                                                        setEditSizes(
                                                            [],
                                                        );
                                                    }

                                                    if (
                                                        mode ===
                                                        'size_only'
                                                    ) {
                                                        setEditPrograms(
                                                            [],
                                                        );
                                                    }
                                                }}
                                                className={inputClass}
                                            >
                                                {productConfiguration.variant_modes.map(
                                                    (
                                                        mode,
                                                    ) => (
                                                        <option
                                                            key={
                                                                mode.value
                                                            }
                                                            value={
                                                                mode.value
                                                            }
                                                        >
                                                            {
                                                                mode.label
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Description
                                            </label>

                                            <textarea
                                                value={
                                                    editProductDescription
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    setEditProductDescription(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className={`${inputClass} min-h-24 resize-y`}
                                            />
                                        </div>
                                    </div>

                                    {editVariantMode ===
                                        'program_and_size' && (
                                        <OptionChecklist
                                            title="Programs *"
                                            description="Select every program that needs this product."
                                            options={
                                                productConfiguration.programs
                                            }
                                            selected={
                                                editPrograms
                                            }
                                            onToggle={(
                                                value,
                                            ) =>
                                                setEditPrograms(
                                                    toggleValue(
                                                        editPrograms,
                                                        value,
                                                    ),
                                                )
                                            }
                                        />
                                    )}

                                    {(editVariantMode ===
                                        'size_only'
                                        || editVariantMode ===
                                            'program_and_size') && (
                                        <OptionChecklist
                                            title="Sizes *"
                                            description="Select every size that will be ordered."
                                            options={
                                                productConfiguration.sizes
                                            }
                                            selected={
                                                editSizes
                                            }
                                            onToggle={(
                                                value,
                                            ) =>
                                                setEditSizes(
                                                    toggleValue(
                                                        editSizes,
                                                        value,
                                                    ),
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            )}

                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Quantity to Order *
                                    </label>

                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        value={
                                            editQuantity
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditQuantity(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-slate-700">
                                        Unit Cost
                                    </label>

                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={
                                            editUnitCost
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditUnitCost(
                                                event
                                                    .target
                                                    .value,
                                            )
                                        }
                                        placeholder="Optional"
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {editError && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {
                                        editError
                                    }
                                </div>
                            )}

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={
                                        cancelEditingItem
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        saveEditedItem
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                                >
                                    <Pencil
                                        size={17}
                                    />

                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ActionConfirmModal
                open={showCreateConfirm}
                title="Create Purchase Order?"
                message={`Create this purchase order for ${form.data.supplier_name} with ${form.data.items.length} item group(s)?`}
                confirmText="Create Purchase Order"
                processingText="Creating PO..."
                processing={form.processing}
                tone="primary"
                onCancel={() =>
                    setShowCreateConfirm(false)
                }
                onConfirm={confirmCreatePurchaseOrder}
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
| New Product Validation
|--------------------------------------------------------------------------
*/

function validateNewInventoryItem({
    categoryId,
    productName,
    basePrice,
    variantMode,
    programs,
    sizes,
    quantity,
    unitCost,
}: {
    categoryId: string;
    productName: string;
    basePrice: string;
    variantMode: VariantMode;
    programs: string[];
    sizes: string[];
    quantity: string;
    unitCost: string;
}): string | null {
    if (
        !categoryId
        || Number(categoryId) < 1
    ) {
        return 'Select a category for the new product.';
    }

    if (
        !productName.trim()
    ) {
        return 'Product name is required.';
    }

    if (
        !isValidMoney(
            basePrice,
            true,
        )
    ) {
        return 'Selling price is required and must be a valid amount.';
    }

    if (
        variantMode ===
            'size_only'
        && sizes.length ===
            0
    ) {
        return 'Select at least one size.';
    }

    if (
        variantMode ===
        'program_and_size'
    ) {
        if (
            programs.length ===
            0
        ) {
            return 'Select at least one program.';
        }

        if (
            sizes.length ===
            0
        ) {
            return 'Select at least one size.';
        }
    }

    if (
        parsePositiveInteger(
            quantity,
        ) === null
    ) {
        return 'Quantity must be at least 1.';
    }

    if (
        !isValidMoney(
            unitCost,
            false,
        )
    ) {
        return 'Unit cost must be a valid amount.';
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function parsePositiveInteger(
    value: string,
): number | null {
    const parsed =
        Number(
            value,
        );

    if (
        !Number.isInteger(
            parsed,
        )
        || parsed < 1
    ) {
        return null;
    }

    return parsed;
}

function isValidMoney(
    value: string,
    required: boolean,
): boolean {
    const trimmed =
        value.trim();

    if (!trimmed) {
        return !required;
    }

    const parsed =
        Number(
            trimmed,
        );

    return (
        !Number.isNaN(
            parsed,
        )
        && parsed >= 0
    );
}

function toggleValue(
    values: string[],
    value: string,
): string[] {
    return values.includes(
        value,
    )
        ? values.filter(
              (
                  current,
              ) =>
                  current !==
                  value,
          )
        : [
              ...values,
              value,
          ];
}

function getVariantCount(
    mode: VariantMode,
    programs: string[],
    sizes: string[],
): number {
    if (
        mode ===
        'standard'
    ) {
        return 1;
    }

    if (
        mode ===
        'size_only'
    ) {
        return sizes.length;
    }

    return (
        programs.length
        * sizes.length
    );
}

function getItemVariantCount(
    item:
        PurchaseOrderItemForm,
): number {
    if (
        item.source_type ===
        'existing_catalog'
    ) {
        return 1;
    }

    return getVariantCount(
        item.variant_mode
        ?? 'standard',
        item.programs,
        item.sizes,
    );
}

function formatVariantMode(
    mode:
        VariantMode | null,
): string {
    switch (
        mode
    ) {
        case 'size_only':
            return 'Size Only';

        case 'program_and_size':
            return 'Program and Size';

        default:
            return 'Standard';
    }
}

/*
|--------------------------------------------------------------------------
| Option Checklist
|--------------------------------------------------------------------------
*/

function OptionChecklist({
    title,
    description,
    options,
    selected,
    onToggle,
}: {
    title: string;
    description: string;
    options: ConfigurationOption[];
    selected: string[];
    onToggle:
        (
            value: string,
        ) => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-black text-slate-900">
                {title}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
                {description}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {options.map(
                    (
                        option,
                    ) => (
                        <label
                            key={
                                option.value
                            }
                            className={`
                                flex cursor-pointer
                                items-center gap-3
                                rounded-xl border
                                px-4 py-3
                                transition
                                ${
                                    selected.includes(
                                        option.value,
                                    )
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={
                                    selected.includes(
                                        option.value,
                                    )
                                }
                                onChange={() =>
                                    onToggle(
                                        option.value,
                                    )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />

                            <span className="text-sm font-bold text-slate-700">
                                {
                                    option.label
                                }
                            </span>
                        </label>
                    ),
                )}
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Quantity / Cost
|--------------------------------------------------------------------------
*/

function QuantityCostInputs({
    quantity,
    setQuantity,
    unitCost,
    setUnitCost,
}: {
    quantity: string;
    setQuantity:
        (
            value: string,
        ) => void;
    unitCost: string;
    setUnitCost:
        (
            value: string,
        ) => void;
}) {
    return (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                    Quantity to Order *
                </label>

                <input
                    type="number"
                    min={1}
                    step={1}
                    value={
                        quantity
                    }
                    onChange={(
                        event,
                    ) =>
                        setQuantity(
                            event.target
                                .value,
                        )
                    }
                    className={inputClass}
                />
            </div>

            <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                    Unit Cost
                </label>

                <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={
                        unitCost
                    }
                    onChange={(
                        event,
                    ) =>
                        setUnitCost(
                            event.target
                                .value,
                        )
                    }
                    placeholder="Optional"
                    className={inputClass}
                />
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Shared Styles / Components
|--------------------------------------------------------------------------
*/

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
    placeholder:text-slate-400
    outline-none
    transition
    focus:border-blue-500
    focus:ring-4
    focus:ring-blue-500/10
`;

function modeClass(
    selected: boolean,
): string {
    return `
        rounded-xl
        border
        px-4
        py-3
        text-sm
        font-black
        transition
        ${
            selected
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        }
    `;
}

function StockBox({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-[9px] font-black uppercase text-slate-400">
                {label}
            </p>

            <p className="mt-1 font-black text-slate-900">
                {value}
            </p>
        </div>
    );
}

function InfoBox({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-black text-slate-800">
                {value}
            </p>
        </div>
    );
}

function SummaryRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-slate-600">
                {label}
            </span>

            <span className="font-black text-slate-900">
                {value}
            </span>
        </div>
    );
}

function formatCurrency(
    amount: string,
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