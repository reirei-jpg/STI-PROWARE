
import {
    Head,
    Link,
    router,
    usePage,
} from '@inertiajs/react';
import {
    Archive,
    ArrowLeft,
    Box,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Image as ImageIcon,
    LoaderCircle,
    PackageCheck,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Tag,
    Truck,
    X,
} from 'lucide-react';


import type {
    FormEvent} from 'react';
import {
    useEffect,
    useMemo,
    useState,
} from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AdminLayout from '@/layouts/AdminLayout';
import { clampNumberInput } from '@/lib/utils';


type ItemType =
    | 'catalog'
    | 'manual';

interface PurchaseOrderItem {
    id: number;
    item_type: ItemType;

    product_variant_id: number | null;
    product_code: string | null;
    product_name: string | null;
    image_url: string | null;

    sku: string | null;
    variant_name: string | null;
    program: string | null;
    size: string | null;

    manual_name: string | null;
    manual_description: string | null;
    manual_sku: string | null;

    track_inventory: boolean;

    quantity_ordered: number;
    quantity_received: number;
    quantity_remaining: number;

    unit_cost: string | null;

    archived_at?: string | null;
    archived_by?: string | null;
}

interface PurchaseOrder {
    id: number;
    po_number: string;

    supplier_name: string;
    supplier_reference_number: string | null;

    expected_delivery_date: string | null;

    status: string;
    notes: string | null;

    ordered_at: string | null;
    completed_at: string | null;

    archived_at: string | null;
    archived_by: string | null;
    is_archived: boolean;

    created_by: string | null;

    total_ordered: number;
    total_received: number;
    total_remaining: number;

    items: PurchaseOrderItem[];
    archived_items?: PurchaseOrderItem[];
}

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
    image_url: string | null;
}

interface PurchaseVariant {
    id: number;
    sku: string;
    program: string | null;
    size: string | null;
    variant_name: string;
    product: VariantProduct;
    inventory: VariantInventory;
}

interface Props {
    purchaseOrder: PurchaseOrder;
    variants: PurchaseVariant[];
}

interface SharedPageProps {
    [key: string]: unknown;

    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

interface AddItemFormState {
    item_type: ItemType;
    product_variant_id: number | null;

    manual_name: string;
    manual_description: string;
    manual_sku: string;
    track_inventory: boolean;

    quantity_ordered: string;
    unit_cost: string;
}

interface EditItemFormState {
    quantity_ordered: string;
    unit_cost: string;

    manual_name: string;
    manual_description: string;
    manual_sku: string;
    track_inventory: boolean;
}

const emptyAddItemForm =
    (): AddItemFormState => ({
        item_type:
            'catalog',

        product_variant_id:
            null,

        manual_name:
            '',

        manual_description:
            '',

        manual_sku:
            '',

        track_inventory:
            true,

        quantity_ordered:
            '1',

        unit_cost:
            '',
    });

export default function Show({
    purchaseOrder,
    variants,
}: Props) {
    const page =
        usePage<SharedPageProps>();

    const flash =
        page.props.flash;

    const [
        addModalOpen,
        setAddModalOpen,
    ] =
        useState(
            false,
        );

    const [
        addItemForm,
        setAddItemForm,
    ] =
        useState<AddItemFormState>(
            emptyAddItemForm(),
        );

    const [
        addSearch,
        setAddSearch,
    ] =
        useState('');

    const [
        addingItem,
        setAddingItem,
    ] =
        useState(
            false,
        );

    const [
        showAddItemConfirm,
        setShowAddItemConfirm,
    ] = useState(false);

    const {
        notification,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();  

        useEffect(() => {
            if (flash?.success) {
                showSuccess(
                    flash.success,
                );

                return;
            }

            if (flash?.error) {
                showError(
                    flash.error,
                );
            }
        }, [
            flash?.success,
            flash?.error,
        ]);

    const [
        editItem,
        setEditItem,
    ] =
        useState<PurchaseOrderItem | null>(
            null,
        );

    const [
        editItemForm,
        setEditItemForm,
    ] =
        useState<EditItemFormState | null>(
            null,
        );

    const [
        savingItem,
        setSavingItem,
    ] =
        useState(
            false,
        );

    const [
        showEditItemConfirm,
        setShowEditItemConfirm,
    ] = useState(false);    

    const [
        archiveItem,
        setArchiveItem,
    ] =
        useState<PurchaseOrderItem | null>(
            null,
        );

    const [
        archivingItem,
        setArchivingItem,
    ] =
        useState(
            false,
        );

    const [
        archivePoOpen,
        setArchivePoOpen,
    ] =
        useState(
            false,
        );

    const [
        archivingPo,
        setArchivingPo,
    ] =
        useState(
            false,
        );

    const [
        restorePoOpen,
        setRestorePoOpen,
    ] =
        useState(
            false,
        );

    const [
        restoringPo,
        setRestoringPo,
    ] =
        useState(
            false,
        );

    const [
        itemToRestore,
        setItemToRestore,
    ] =
        useState<PurchaseOrderItem | null>(
            null,
        );

    const [
        restoringItem,
        setRestoringItem,
    ] =
        useState(
            false,
        );

    const [
        localError,
        setLocalError,
    ] =
        useState<string | null>(
            null,
        );

    const estimatedCost =
        purchaseOrder.items.reduce(
            (
                total,
                item,
            ) => {
                const unitCost =
                    Number(
                        item.unit_cost
                        ?? 0,
                    );

                return (
                    total
                    + unitCost
                        * item.quantity_ordered
                );
            },
            0,
        );

    const canModifyPo =
        !purchaseOrder.is_archived
        && purchaseOrder.status !==
            'completed';

    const filteredVariants =
        useMemo(
            () => {
                const query =
                    addSearch
                        .trim()
                        .toLowerCase();

                if (
                    !query
                ) {
                    return variants;
                }

                return variants.filter(
                    (
                        variant,
                    ) => {
                        const searchable =
                            [
                                variant
                                    .product
                                    .code,

                                variant
                                    .product
                                    .name,

                                variant
                                    .sku,

                                variant
                                    .variant_name,

                                variant
                                    .program
                                ?? '',

                                variant
                                    .size
                                ?? '',
                            ]
                                .join(
                                    ' ',
                                )
                                .toLowerCase();

                        return searchable.includes(
                            query,
                        );
                    },
                );
            },
            [
                variants,
                addSearch,
            ],
        );

    const selectedAddVariant =
        addItemForm
            .product_variant_id
            ? variants.find(
                (
                    variant,
                ) =>
                    variant.id
                    === addItemForm
                        .product_variant_id,
            )
            : undefined;

    const openAddModal =
        (): void => {
            if (
                !canModifyPo
            ) {
                return;
            }

            setLocalError(
                null,
            );

            setAddSearch(
                '',
            );

            setAddItemForm(
                emptyAddItemForm(),
            );

            setAddModalOpen(
                true,
            );
        };

    const closeAddModal =
        (): void => {
            if (
                addingItem
            ) {
                return;
            }

            setAddModalOpen(
                false,
            );

            setLocalError(
                null,
            );
        };

    const submitAddItem =
        (
            event: FormEvent,
        ): void => {
            event.preventDefault();

            setLocalError(
                null,
            );

            const quantity =
                Number(
                    addItemForm
                        .quantity_ordered,
                );

            if (
                !Number.isInteger(
                    quantity,
                )
                || quantity < 1
            ) {
                setLocalError(
                    'Quantity must be at least 1.',
                );

                return;
            }

            if (
                addItemForm
                    .unit_cost
                    .trim()
                && (
                    Number.isNaN(
                        Number(
                            addItemForm
                                .unit_cost,
                        ),
                    )
                    || Number(
                        addItemForm
                            .unit_cost,
                    ) < 0
                )
            ) {
                setLocalError(
                    'Unit cost must be a valid amount.',
                );

                return;
            }

            if (
                addItemForm
                    .item_type
                === 'catalog'
            ) {
                if (
                    !addItemForm
                        .product_variant_id
                ) {
                    setLocalError(
                        'Select a product variant first.',
                    );

                    return;
                }

                const duplicate =
                    purchaseOrder
                        .items
                        .some(
                            (
                                item,
                            ) =>
                                item
                                    .item_type
                                    === 'catalog'
                                && item
                                    .product_variant_id
                                    === addItemForm
                                        .product_variant_id,
                        );

                if (
                    duplicate
                ) {
                    setLocalError(
                        'This product variant is already included in the purchase order.',
                    );

                    return;
                }
            }

            if (
                addItemForm
                    .item_type
                === 'manual'
                && !addItemForm
                    .manual_name
                    .trim()
            ) {
                setLocalError(
                    'Manual item name is required.',
                );

                return;
            }

            setShowAddItemConfirm(
                true,
            );

            return;

            };


        const confirmAddItem =
            (): void => {
                setAddingItem(
                    true,
                );

                router.post(
                    `/admin/purchase-orders/${purchaseOrder.id}/items`,
                    {
                        item_type:
                            addItemForm.item_type,

                        merchandise_origin:
                            addItemForm.item_type === 'catalog'
                                ? 'existing'
                                : 'new',

                        product_variant_id:
                            addItemForm.item_type === 'catalog'
                                ? addItemForm.product_variant_id
                                : null,

                        manual_name:
                            addItemForm.item_type === 'manual'
                                ? addItemForm.manual_name.trim()
                                : null,

                        manual_description:
                            addItemForm.item_type === 'manual'
                                ? (
                                    addItemForm.manual_description.trim()
                                    || null
                                )
                                : null,

                        manual_sku:
                            addItemForm.item_type === 'manual'
                                ? (
                                    addItemForm.manual_sku.trim()
                                    || null
                                )
                                : null,

                        track_inventory: true,

                        quantity_ordered:
                            Number(
                                addItemForm.quantity_ordered,
                            ),

                        unit_cost:
                            addItemForm.unit_cost.trim()
                            || null,
                    },
                    {
                        preserveScroll: true,

                        onSuccess:
                            () => {
                                setShowAddItemConfirm(
                                    false,
                                );

                                setAddModalOpen(
                                    false,
                                );

                                setAddItemForm(
                                    emptyAddItemForm(),
                                );

                                setAddSearch(
                                    '',
                                );

                                showSuccess(
                                    'Purchase order item added successfully.',
                                );
                            },

                        onError:
                            () => {
                                setShowAddItemConfirm(
                                    false,
                                );

                                showError(
                                    'Purchase order item could not be added.',
                                );
                            },

                        onFinish:
                            () => {
                                setAddingItem(
                                    false,
                                );
                            },
                    },
                );
            };    

    const openEditItem =
        (
            item:
                PurchaseOrderItem,
        ): void => {
            if (
                !canModifyPo
            ) {
                return;
            }

            setLocalError(
                null,
            );

            setEditItem(
                item,
            );

            setEditItemForm({
                quantity_ordered:
                    String(
                        item
                            .quantity_ordered,
                    ),

                unit_cost:
                    item
                        .unit_cost
                    ?? '',

                manual_name:
                    item
                        .manual_name
                    ?? '',

                manual_description:
                    item
                        .manual_description
                    ?? '',

                manual_sku:
                    item
                        .manual_sku
                    ?? '',

                track_inventory:
                    item
                        .track_inventory,
            });
        };

    const closeEditItem =
        (): void => {
            if (
                savingItem
            ) {
                return;
            }

            setEditItem(
                null,
            );

            setEditItemForm(
                null,
            );

            setLocalError(
                null,
            );
        };

    const submitEditItem =
        (
            event: FormEvent,
        ): void => {
            event.preventDefault();

            if (
                !editItem
                || !editItemForm
            ) {
                return;
            }

            setLocalError(
                null,
            );

            const quantity =
                Number(
                    editItemForm
                        .quantity_ordered,
                );

            if (
                !Number.isInteger(
                    quantity,
                )
                || quantity < 1
            ) {
                setLocalError(
                    'Quantity must be at least 1.',
                );

                return;
            }

            if (
                quantity
                < editItem
                    .quantity_received
            ) {
                setLocalError(
                    `Quantity ordered cannot be lower than the ${editItem.quantity_received} unit(s) already received.`,
                );

                return;
            }

            if (
                editItemForm
                    .unit_cost
                    .trim()
                && (
                    Number.isNaN(
                        Number(
                            editItemForm
                                .unit_cost,
                        ),
                    )
                    || Number(
                        editItemForm
                            .unit_cost,
                    ) < 0
                )
            ) {
                setLocalError(
                    'Unit cost must be a valid amount.',
                );

                return;
            }

            if (
                editItem
                    .item_type
                === 'manual'
                && !editItemForm
                    .manual_name
                    .trim()
            ) {
                setLocalError(
                    'Manual item name is required.',
                );

                return;
            }

            setShowEditItemConfirm(
    true,
);

return;
};

    const confirmEditItem =
        (): void => {
            if (
                !editItem
                || !editItemForm
            ) {
                return;
            }

            const quantity =
                Number(
                    editItemForm
                        .quantity_ordered,
                );

            setSavingItem(
                true,
            );

            router.patch(
                `/admin/purchase-orders/${purchaseOrder.id}/items/${editItem.id}`,
                {
                    quantity_ordered:
                        quantity,

                    unit_cost:
                        editItemForm
                            .unit_cost
                            .trim()
                        || null,

                    manual_name:
                        editItem
                            .item_type
                            === 'manual'
                        ? editItemForm
                            .manual_name
                            .trim()
                        : null,

                    manual_description:
                        editItem
                            .item_type
                            === 'manual'
                        ? (
                            editItemForm
                                .manual_description
                                .trim()
                            || null
                        )
                        : null,

                    manual_sku:
                        editItem
                            .item_type
                            === 'manual'
                        ? (
                            editItemForm
                                .manual_sku
                                .trim()
                            || null
                        )
                        : null,

                    track_inventory:
                        editItem
                            .item_type
                            === 'manual'
                        ? editItemForm
                            .track_inventory
                        : true,
                },
                {
                    preserveScroll:
                        true,

                    onSuccess:
                        () => {
                            setShowEditItemConfirm(
                                false,
                            );

                            setEditItem(
                                null,
                            );

                            setEditItemForm(
                                null,
                            );

                            showSuccess(
                                'Purchase order item updated successfully.',
                            );
                        },

                    onError:
                        () => {
                            setShowEditItemConfirm(
                                false,
                            );

                            showError(
                                'Purchase order item could not be updated.',
                            );
                        },

                    onFinish:
                        () => {
                            setSavingItem(
                                false,
                            );
                        },
                },
            );
        };

    const openArchiveItem =
        (
            item:
                PurchaseOrderItem,
        ): void => {
            if (
                !canModifyPo
                || item
                    .quantity_received
                    > 0
            ) {
                return;
            }

            setLocalError(
                null,
            );

            setArchiveItem(
                item,
            );
        };

    const closeArchiveItem =
        (): void => {
            if (
                archivingItem
            ) {
                return;
            }

            setArchiveItem(
                null,
            );
        };

    const confirmArchiveItem =
        (): void => {
            if (
                !archiveItem
                || archivingItem
            ) {
                return;
            }

            setArchivingItem(
                true,
            );

            router.patch(
                `/admin/purchase-orders/${purchaseOrder.id}/items/${archiveItem.id}/archive`,
                {},
                {
                    preserveScroll:
                        true,

                    onSuccess:
                    () => {
                        showSuccess(
                            'Purchase order item archived successfully.',
                        );

                        setArchiveItem(
                            null,
                        );
                    },

                    onError:
                        () => {
                            showError(
                                'Purchase order item could not be archived.',
                            );
                        },

                    onFinish:
                        () => {
                            setArchivingItem(
                                false,
                            );
                        },
                },
            );
        };

    const openArchivePo =
        (): void => {
            if (
                purchaseOrder
                    .is_archived
            ) {
                return;
            }

            setArchivePoOpen(
                true,
            );
        };

    const closeArchivePo =
        (): void => {
            if (
                archivingPo
            ) {
                return;
            }

            setArchivePoOpen(
                false,
            );
        };

    const confirmArchivePo =
        (): void => {
            if (
                archivingPo
            ) {
                return;
            }

            setArchivingPo(
                true,
            );

            router.patch(
                `/admin/purchase-orders/${purchaseOrder.id}/archive`,
                {},
                {
                    preserveScroll: true,

                    onSuccess:
                        () => {
                            setArchivePoOpen(
                                false,
                            );

                            showSuccess(
                                'Purchase order archived successfully.',
                            );
                        },

                    onError:
                        () => {
                            setArchivePoOpen(
                                false,
                            );

                            showError(
                                'Purchase order could not be archived.',
                            );
                        },

                    onFinish:
                        () => {
                            setArchivingPo(
                                false,
                            );
                        },
                },
            );
        };

    const openRestorePo =
        (): void => {
            if (
                !purchaseOrder
                    .is_archived
            ) {
                return;
            }

            setRestorePoOpen(
                true,
            );
        };

    const closeRestorePo =
        (): void => {
            if (
                restoringPo
            ) {
                return;
            }

            setRestorePoOpen(
                false,
            );
        };

    const confirmRestorePo =
        (): void => {
            if (
                restoringPo
            ) {
                return;
            }

            setRestoringPo(
                true,
            );

            router.patch(
                `/admin/purchase-orders/${purchaseOrder.id}/restore`,
                {},
                {
                    preserveScroll: true,

                    onSuccess:
                        () => {
                            setRestorePoOpen(
                                false,
                            );

                            showSuccess(
                                'Purchase order restored successfully.',
                            );
                        },

                    onError:
                        () => {
                            setRestorePoOpen(
                                false,
                            );

                            showError(
                                'Purchase order could not be restored.',
                            );
                        },

                    onFinish:
                        () => {
                            setRestoringPo(
                                false,
                            );
                        },
                },
            );
        };

    const confirmRestoreItem =
        (): void => {
            if (
                !itemToRestore
                || restoringItem
            ) {
                return;
            }

            setRestoringItem(
                true,
            );

            router.patch(
                `/admin/purchase-orders/${purchaseOrder.id}/items/${itemToRestore.id}/restore`,
                {},
                {
                    preserveScroll: true,

                    onSuccess:
                        () => {
                            setItemToRestore(
                                null,
                            );

                            showSuccess(
                                'Purchase order item restored successfully.',
                            );
                        },

                    onError:
                        () => {
                            showError(
                                'Purchase order item could not be restored.',
                            );
                        },

                    onFinish:
                        () => {
                            setRestoringItem(
                                false,
                            );
                        },
                },
            );
        };

    return (
        <AdminLayout>
            <Head
                title={`Purchase Order ${purchaseOrder.po_number}`}
            />

            <div className="space-y-7">
                {/* HEADER */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Link
                            href="/admin/purchase-orders"
                            className="
                                flex
                                h-12
                                w-12
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                border
                                border-slate-200
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

                            <div className="mt-1 flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-black text-slate-900">
                                    {
                                        purchaseOrder.po_number
                                    }
                                </h1>

                                <StatusBadge
                                    status={
                                        purchaseOrder.status
                                    }
                                />

                                {purchaseOrder
                                    .is_archived && (
                                    <span className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-black text-white">
                                        Archived
                                    </span>
                                )}
                            </div>

                            <p className="mt-2 text-sm text-slate-500">
                                Purchase order details,
                                item management, and
                                incoming stock status.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {canModifyPo && (
                            <button
                                type="button"
                                onClick={
                                    openAddModal
                                }
                                className="
                                    inline-flex
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
                                    shadow-lg
                                    shadow-blue-500/20
                                    transition
                                    hover:bg-blue-700
                                "
                            >
                                <Plus
                                    size={18}
                                />

                                Add Item
                            </button>
                        )}

                        {!purchaseOrder
                            .is_archived && (
                            <button
                                type="button"
                                onClick={
                                    openArchivePo
                                }
                                className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-red-200
                                    bg-red-50
                                    px-5
                                    py-3
                                    text-sm
                                    font-black
                                    text-red-700
                                    transition
                                    hover:bg-red-100
                                "
                            >
                                <Archive
                                    size={18}
                                />

                                Archive PO
                            </button>
                        )}

                        {purchaseOrder
                            .is_archived && (
                            <button
                                type="button"
                                onClick={
                                    openRestorePo
                                }
                                className="
                                    inline-flex
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-emerald-200
                                    bg-emerald-50
                                    px-5
                                    py-3
                                    text-sm
                                    font-black
                                    text-emerald-700
                                    transition
                                    hover:bg-emerald-100
                                "
                            >
                                <RotateCcw
                                    size={18}
                                />

                                Restore PO
                            </button>
                        )}
                    </div>
                </div>

    

                {purchaseOrder
                    .is_archived && (
                    <div className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4 text-sm text-slate-700">
                        <p className="font-black">
                            This purchase order is archived.
                        </p>

                        <p className="mt-1">
                            Archived at{' '}
                            <strong>
                                {
                                    purchaseOrder.archived_at
                                    ?? 'Unknown date'
                                }
                            </strong>

                            {purchaseOrder
                                .archived_by
                                ? (
                                    <>
                                        {' '}by{' '}
                                        <strong>
                                            {
                                                purchaseOrder.archived_by
                                            }
                                        </strong>
                                    </>
                                )
                                : null}
                            .
                        </p>
                    </div>
                )}

                {/* SUMMARY */}
                <section className="grid gap-4 md:grid-cols-4">
                    <SummaryCard
                        label="Ordered"
                        value={String(
                            purchaseOrder.total_ordered,
                        )}
                        description="Active units ordered"
                        icon={
                            ClipboardList
                        }
                    />

                    <SummaryCard
                        label="Received"
                        value={String(
                            purchaseOrder.total_received,
                        )}
                        description="Units received so far"
                        icon={
                            PackageCheck
                        }
                    />

                    <SummaryCard
                        label="Incoming"
                        value={String(
                            purchaseOrder.total_remaining,
                        )}
                        description="Units still expected"
                        icon={
                            Truck
                        }
                    />

                    <SummaryCard
                        label="Estimated Cost"
                        value={
                            estimatedCost > 0
                                ? formatCurrency(
                                    estimatedCost,
                                )
                                : 'Not set'
                        }
                        description="Based on active line items"
                        icon={
                            Tag
                        }
                    />
                </section>

                <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-6">
                        {/* ITEMS */}
                        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">
                                        Purchase Order Items
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Active catalog and
                                        manual items included
                                        in this PO.
                                    </p>
                                </div>

                                {canModifyPo && (
                                    <button
                                        type="button"
                                        onClick={
                                            openAddModal
                                        }
                                        className="
                                            inline-flex
                                            items-center
                                            justify-center
                                            gap-2
                                            rounded-xl
                                            bg-blue-50
                                            px-4
                                            py-2.5
                                            text-sm
                                            font-black
                                            text-blue-700
                                            transition
                                            hover:bg-blue-100
                                        "
                                    >
                                        <Plus
                                            size={16}
                                        />

                                        Add Item
                                    </button>
                                )}
                            </div>

                            {purchaseOrder.items.length >
                            0 ? (
                                <div className="divide-y divide-slate-100">
                                    {purchaseOrder.items.map(
                                        (
                                            item,
                                        ) => {
                                            const canArchiveItem =
                                                canModifyPo
                                                && item
                                                    .quantity_received
                                                    === 0
                                                && purchaseOrder
                                                    .items
                                                    .length
                                                    > 1;

                                            return (
                                                <article
                                                    key={
                                                        item.id
                                                    }
                                                    className="p-6"
                                                >
                                                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                                        <div className="flex min-w-0 gap-4">
                                                            <ProductImage
                                                                src={
                                                                    item.image_url
                                                                }
                                                                name={
                                                                    getItemName(
                                                                        item,
                                                                    )
                                                                }
                                                            />

                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span
                                                                        className={`
                                                                            inline-flex
                                                                            rounded-full
                                                                            px-2.5
                                                                            py-1
                                                                            text-[10px]
                                                                            font-black
                                                                            uppercase

                                                                            ${
                                                                                item.item_type ===
                                                                                'catalog'
                                                                                    ? 'bg-blue-100 text-blue-700'
                                                                                    : 'bg-violet-100 text-violet-700'
                                                                            }
                                                                        `}
                                                                    >
                                                                        {item.item_type ===
                                                                        'catalog'
                                                                            ? 'Catalog Item'
                                                                            : 'Manual Item'}
                                                                    </span>

                                                                    {item.track_inventory ? (
                                                                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                                                                            Inventory Tracked
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
                                                                            Non-Inventory
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <h3 className="mt-3 text-lg font-black text-slate-900">
                                                                    {
                                                                        getItemName(
                                                                            item,
                                                                        )
                                                                    }
                                                                </h3>

                                                                {getItemVariant(
                                                                    item,
                                                                ) && (
                                                                    <p className="mt-1 text-sm font-semibold text-slate-600">
                                                                        {
                                                                            getItemVariant(
                                                                                item,
                                                                            )
                                                                        }
                                                                    </p>
                                                                )}

                                                                {item.sku && (
                                                                    <p className="mt-1 font-mono text-xs font-bold text-slate-400">
                                                                        SKU:{' '}
                                                                        {
                                                                            item.sku
                                                                        }
                                                                    </p>
                                                                )}

                                                                {item
                                                                    .item_type
                                                                    === 'catalog'
                                                                    && item
                                                                        .product_code && (
                                                                    <p className="mt-2 text-xs font-bold text-slate-500">
                                                                        Product Code:{' '}
                                                                        {
                                                                            item.product_code
                                                                        }
                                                                    </p>
                                                                )}

                                                                {item
                                                                    .item_type
                                                                    === 'manual'
                                                                    && item
                                                                        .manual_description && (
                                                                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                                                                        {
                                                                            item.manual_description
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
                                                                <QuantityBox
                                                                    label="Ordered"
                                                                    value={
                                                                        item.quantity_ordered
                                                                    }
                                                                />

                                                                <QuantityBox
                                                                    label="Received"
                                                                    value={
                                                                        item.quantity_received
                                                                    }
                                                                />

                                                                <QuantityBox
                                                                    label="Remaining"
                                                                    value={
                                                                        item.quantity_remaining
                                                                    }
                                                                    emphasized
                                                                />
                                                            </div>

                                                            {canModifyPo && (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            openEditItem(
                                                                                item,
                                                                            )
                                                                        }
                                                                        className="
                                                                            inline-flex
                                                                            items-center
                                                                            gap-2
                                                                            rounded-xl
                                                                            bg-blue-50
                                                                            px-3
                                                                            py-2
                                                                            text-sm
                                                                            font-black
                                                                            text-blue-700
                                                                            transition
                                                                            hover:bg-blue-100
                                                                        "
                                                                    >
                                                                        <Pencil
                                                                            size={
                                                                                15
                                                                            }
                                                                        />

                                                                        Edit
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            !canArchiveItem
                                                                        }
                                                                        onClick={() =>
                                                                            openArchiveItem(
                                                                                item,
                                                                            )
                                                                        }
                                                                        title={
                                                                            getArchiveItemDisabledReason(
                                                                                item,
                                                                                purchaseOrder
                                                                                    .items
                                                                                    .length,
                                                                            )
                                                                        }
                                                                        className="
                                                                            inline-flex
                                                                            items-center
                                                                            gap-2
                                                                            rounded-xl
                                                                            bg-red-50
                                                                            px-3
                                                                            py-2
                                                                            text-sm
                                                                            font-black
                                                                            text-red-700
                                                                            transition
                                                                            hover:bg-red-100
                                                                            disabled:cursor-not-allowed
                                                                            disabled:bg-slate-100
                                                                            disabled:text-slate-400
                                                                        "
                                                                    >
                                                                        <Archive
                                                                            size={
                                                                                15
                                                                            }
                                                                        />

                                                                        Archive
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                                        <InfoBox
                                                            label="Unit Cost"
                                                            value={
                                                                item.unit_cost
                                                                    ? formatCurrency(
                                                                        Number(
                                                                            item.unit_cost,
                                                                        ),
                                                                    )
                                                                    : 'Not set'
                                                            }
                                                        />

                                                        <InfoBox
                                                            label="Line Cost"
                                                            value={
                                                                item.unit_cost
                                                                    ? formatCurrency(
                                                                        Number(
                                                                            item.unit_cost,
                                                                        )
                                                                        * item.quantity_ordered,
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
                                    <Box
                                        size={42}
                                        className="mx-auto text-slate-300"
                                    />

                                    <p className="mt-4 font-black text-slate-800">
                                        No active purchase
                                        order items
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* ARCHIVED ITEM HISTORY */}
                        {(purchaseOrder.archived_items ?? []).length > 0 && (
                            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                            <Archive
                                                size={18}
                                            />
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-black text-slate-900">
                                                Archived Items History
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500">
                                                PO items that were archived instead of deleted. Each can be restored to the active list.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {(purchaseOrder.archived_items ?? []).map(
                                        (item) => (
                                            <article
                                                key={
                                                    item.id
                                                }
                                                className="bg-slate-50/50 p-6"
                                            >
                                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="flex min-w-0 gap-4">
                                                        <ProductImage
                                                            src={
                                                                item.image_url
                                                            }
                                                            name={
                                                                getItemName(
                                                                    item,
                                                                )
                                                            }
                                                        />

                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">
                                                                    Archived
                                                                </span>

                                                                <span
                                                                    className={`
                                                                        inline-flex
                                                                        rounded-full
                                                                        px-2.5
                                                                        py-1
                                                                        text-[10px]
                                                                        font-black
                                                                        uppercase

                                                                        ${
                                                                            item.item_type ===
                                                                            'catalog'
                                                                                ? 'bg-blue-100 text-blue-700'
                                                                                : 'bg-violet-100 text-violet-700'
                                                                        }
                                                                    `}
                                                                >
                                                                    {item.item_type ===
                                                                    'catalog'
                                                                        ? 'Catalog Item'
                                                                        : 'Manual Item'}
                                                                </span>
                                                            </div>

                                                            <h3 className="mt-3 text-lg font-black text-slate-900">
                                                                {
                                                                    getItemName(
                                                                        item,
                                                                    )
                                                                }
                                                            </h3>

                                                            {getItemVariant(
                                                                item,
                                                            ) && (
                                                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                                                    {
                                                                        getItemVariant(
                                                                            item,
                                                                        )
                                                                    }
                                                                </p>
                                                            )}

                                                            {item.sku && (
                                                                <p className="mt-1 font-mono text-xs font-bold text-slate-400">
                                                                    SKU:{' '}
                                                                    {
                                                                        item.sku
                                                                    }
                                                                </p>
                                                            )}

                                                            {item.item_type ===
                                                                'manual'
                                                                && item.manual_description && (
                                                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                                                                    {
                                                                        item.manual_description
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
                                                        <QuantityBox
                                                            label="Ordered"
                                                            value={
                                                                item.quantity_ordered
                                                            }
                                                        />

                                                        <QuantityBox
                                                            label="Received"
                                                            value={
                                                                item.quantity_received
                                                            }
                                                        />

                                                        <QuantityBox
                                                            label="Remaining"
                                                            value={
                                                                item.quantity_remaining
                                                            }
                                                            emphasized
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                    <InfoBox
                                                        label="Unit Cost"
                                                        value={
                                                            item.unit_cost
                                                                ? formatCurrency(
                                                                    Number(
                                                                        item.unit_cost,
                                                                    ),
                                                                )
                                                                : 'Not set'
                                                        }
                                                    />

                                                    <InfoBox
                                                        label="Line Cost"
                                                        value={
                                                            item.unit_cost
                                                                ? formatCurrency(
                                                                    Number(
                                                                        item.unit_cost,
                                                                    )
                                                                    * item.quantity_ordered,
                                                                )
                                                                : 'Not set'
                                                        }
                                                    />

                                                    <InfoBox
                                                        label="Archived By"
                                                        value={
                                                            item.archived_by
                                                            ?? 'Unknown'
                                                        }
                                                    />

                                                    <InfoBox
                                                        label="Archived At"
                                                        value={
                                                            item.archived_at
                                                            ?? 'Unknown'
                                                        }
                                                    />
                                                </div>

                                                {!purchaseOrder
                                                    .is_archived && (
                                                    <div className="mt-4 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setItemToRestore(
                                                                    item,
                                                                )
                                                            }
                                                            className="
                                                                inline-flex
                                                                items-center
                                                                gap-2
                                                                rounded-xl
                                                                bg-emerald-50
                                                                px-4
                                                                py-2.5
                                                                text-sm
                                                                font-black
                                                                text-emerald-700
                                                                transition
                                                                hover:bg-emerald-100
                                                            "
                                                        >
                                                            <RotateCcw
                                                                size={15}
                                                            />

                                                            Restore Item
                                                        </button>
                                                    </div>
                                                )}
                                            </article>
                                        ),
                                    )}
                                </div>
                            </section>
                        )}

                    </div>

                    {/* SIDE DETAILS */}
                    <aside className="space-y-5">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-black text-slate-900">
                                Supplier Details
                            </h2>

                            <div className="mt-5 space-y-4">
                                <DetailRow
                                    label="Supplier"
                                    value={
                                        purchaseOrder.supplier_name
                                    }
                                />

                                <DetailRow
                                    label="Supplier Reference"
                                    value={
                                        purchaseOrder.supplier_reference_number
                                        ?? 'Not provided'
                                    }
                                />

                                <DetailRow
                                    label="Expected Delivery"
                                    value={
                                        purchaseOrder.expected_delivery_date
                                        ?? 'Not set'
                                    }
                                />

                                <DetailRow
                                    label="Created By"
                                    value={
                                        purchaseOrder.created_by
                                        ?? 'Unknown'
                                    }
                                />

                                <DetailRow
                                    label="Ordered At"
                                    value={
                                        purchaseOrder.ordered_at
                                        ?? 'Not available'
                                    }
                                />

                                {purchaseOrder.completed_at && (
                                    <DetailRow
                                        label="Completed At"
                                        value={
                                            purchaseOrder.completed_at
                                        }
                                    />
                                )}
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3">
                                <CalendarDays
                                    size={20}
                                    className="text-blue-600"
                                />

                                <h2 className="text-lg font-black text-slate-900">
                                    Status
                                </h2>
                            </div>

                            <div className="mt-5">
                                <StatusBadge
                                    status={
                                        purchaseOrder.status
                                    }
                                />
                            </div>

                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                    Incoming Units
                                </p>

                                <p className="mt-1 text-3xl font-black text-slate-950">
                                    {
                                        purchaseOrder.total_remaining
                                    }
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    These units are not
                                    physical inventory until
                                    Specialist receiving is
                                    confirmed.
                                </p>
                            </div>
                        </section>

                        {purchaseOrder.notes && (
                            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-black text-slate-900">
                                    Notes
                                </h2>

                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                    {
                                        purchaseOrder.notes
                                    }
                                </p>
                            </section>
                        )}
                    </aside>
                </div>
            </div>


    <ActionConfirmModal
        open={showAddItemConfirm}
        title="Add Item to Purchase Order?"
        message="Add this item to the current purchase order?"
        confirmText="Add Item"
        processingText="Adding Item..."
        processing={addingItem}
        tone="primary"
        onCancel={() =>
            setShowAddItemConfirm(false)
        }
        onConfirm={confirmAddItem}
    />

<ActionConfirmModal
    open={showEditItemConfirm}
    title="Save Item Changes?"
    message="Save the changes made to this purchase order item?"
    confirmText="Save Changes"
    processingText="Saving..."
    processing={savingItem}
    tone="primary"
    onCancel={() =>
        setShowEditItemConfirm(false)
    }
    onConfirm={confirmEditItem}
/>

            {notification && (
            <ActionNotification
                type={notification.type}
                message={notification.message}
                onClose={clearNotification}
            />
        )}

            {/* ADD ITEM MODAL */}
            {addModalOpen && (
                <ModalShell
                    title="Add PO Item"
                    subtitle="Add another item to this saved purchase order."
                    onClose={
                        closeAddModal
                    }
                    disabled={
                        addingItem
                    }
                >
                    <form
                        onSubmit={
                            submitAddItem
                        }
                    >
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setAddItemForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,

                                            item_type:
                                                'catalog',

                                            product_variant_id:
                                                null,
                                        }),
                                    );

                                    setLocalError(
                                        null,
                                    );
                                }}
                                className={modeClass(
                                    addItemForm
                                        .item_type
                                        === 'catalog',
                                )}
                            >
                                Existing Merchandise
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setAddItemForm(
                                        (
                                            current,
                                        ) => ({
                                            ...current,

                                            item_type:
                                                'manual',

                                            product_variant_id:
                                                null,
                                        }),
                                    );

                                    setLocalError(
                                        null,
                                    );
                                }}
                                className={modeClass(
                                    addItemForm
                                        .item_type
                                        === 'manual',
                                )}
                            >
                                New Merchandise
                            </button>
                        </div>

                        {addItemForm
                            .item_type
                            === 'catalog' ? (
                            <div className="mt-5">
                                <div className="relative">
                                    <Search
                                        size={17}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="text"
                                        value={
                                            addSearch
                                        }
                                        onChange={(
                                            event,
                                        ) => {
                                            setAddSearch(
                                                event
                                                    .target
                                                    .value,
                                            );

                                            setAddItemForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    product_variant_id:
                                                        null,
                                                }),
                                            );
                                        }}
                                        placeholder="Search product, SKU, program, or size..."
                                        className={`${inputClass} pl-11`}
                                    />
                                </div>

                                <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
                                    {filteredVariants.map(
                                        (
                                            variant,
                                        ) => {
                                            const alreadyAdded =
                                                purchaseOrder
                                                    .items
                                                    .some(
                                                        (
                                                            item,
                                                        ) =>
                                                            item
                                                                .item_type
                                                                === 'catalog'
                                                            && item
                                                                .product_variant_id
                                                                === variant
                                                                    .id,
                                                    );

                                            const selected =
                                                addItemForm
                                                    .product_variant_id
                                                === variant
                                                    .id;

                                            return (
                                                <button
                                                    key={
                                                        variant.id
                                                    }
                                                    type="button"
                                                    disabled={
                                                        alreadyAdded
                                                    }
                                                    onClick={() => {
                                                        setAddItemForm(
                                                            (
                                                                current,
                                                            ) => ({
                                                                ...current,

                                                                product_variant_id:
                                                                    variant
                                                                        .id,
                                                            }),
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
                                                            alreadyAdded
                                                                ? 'cursor-not-allowed opacity-50'
                                                                : ''
                                                        }
                                                    `}
                                                >
                                                    <div className="flex gap-3">
                                                        <SmallVariantImage
                                                            src={
                                                                variant
                                                                    .product
                                                                    .image_url
                                                            }
                                                        />

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-mono text-xs font-black text-blue-600">
                                                                    {
                                                                        variant
                                                                            .product
                                                                            .code
                                                                    }
                                                                </span>

                                                                {alreadyAdded && (
                                                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-700">
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
                                                                    variant
                                                                        .variant_name
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-xs text-slate-400">
                                                                SKU:{' '}
                                                                {
                                                                    variant.sku
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        },
                                    )}
                                </div>

                                {selectedAddVariant && (
                                    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                            Selected Item
                                        </p>

                                        <p className="mt-1 font-black text-slate-900">
                                            {
                                                selectedAddVariant
                                                    .product
                                                    .name
                                            }
                                        </p>

                                        <p className="mt-1 text-sm text-slate-600">
                                            {
                                                selectedAddVariant
                                                    .variant_name
                                            }
                                        </p>

                                        <div className="mt-4 grid grid-cols-4 gap-2">
                                            <StockBox
                                                label="On Hand"
                                                value={
                                                    selectedAddVariant
                                                        .inventory
                                                        .quantity_on_hand
                                                }
                                            />

                                            <StockBox
                                                label="Reserved"
                                                value={
                                                    selectedAddVariant
                                                        .inventory
                                                        .quantity_reserved
                                                }
                                            />

                                            <StockBox
                                                label="Available"
                                                value={
                                                    selectedAddVariant
                                                        .inventory
                                                        .available_quantity
                                                }
                                            />

                                            <StockBox
                                                label="Reorder"
                                                value={
                                                    selectedAddVariant
                                                        .inventory
                                                        .reorder_level
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="mt-5 grid gap-4">
                                <FormField
                                    label="Item Name *"
                                >
                                    <input
                                        type="text"
                                        value={
                                            addItemForm
                                                .manual_name
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setAddItemForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    manual_name:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label="Supplier SKU / Code"
                                >
                                    <input
                                        type="text"
                                        value={
                                            addItemForm
                                                .manual_sku
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setAddItemForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    manual_sku:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label="Description"
                                >
                                    <textarea
                                        value={
                                            addItemForm
                                                .manual_description
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setAddItemForm(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    manual_description:
                                                        event
                                                            .target
                                                            .value,
                                                }),
                                            )
                                        }
                                        className={`${inputClass} min-h-24 resize-y`}
                                    />
                                </FormField>

                            </div>
                        )}

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <FormField
                                label="Quantity to Order *"
                            >
                                <input
                                    type="number"
                                    min={1}
                                    max={10000}
                                    step={1}
                                    value={
                                        addItemForm
                                            .quantity_ordered
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setAddItemForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                quantity_ordered:
                                                    clampNumberInput(
                                                        event
                                                            .target
                                                            .value,
                                                        10000,
                                                    ),
                                            }),
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </FormField>

                            <FormField
                                label="Unit Cost"
                            >
                                <input
                                    type="number"
                                    min={0}
                                    max="10000"
                                    step="0.01"
                                    value={
                                        addItemForm
                                            .unit_cost
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setAddItemForm(
                                            (
                                                current,
                                            ) => ({
                                                ...current,

                                                unit_cost:
                                                    clampNumberInput(
                                                        event
                                                            .target
                                                            .value,
                                                        10000,
                                                    ),
                                            }),
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </FormField>
                        </div>

                        {localError && (
                            <LocalError
                                message={
                                    localError
                                }
                            />
                        )}

                        <ModalActions>
                            <button
                                type="button"
                                disabled={
                                    addingItem
                                }
                                onClick={
                                    closeAddModal
                                }
                                className={
                                    secondaryButtonClass
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    addingItem
                                }
                                className={
                                    primaryButtonClass
                                }
                            >
                                {addingItem ? (
                                    <>
                                        <LoaderCircle
                                            size={
                                                17
                                            }
                                            className="animate-spin"
                                        />

                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus
                                            size={
                                                17
                                            }
                                        />

                                        Add Item
                                    </>
                                )}
                            </button>
                        </ModalActions>
                    </form>
                </ModalShell>
            )}

            {/* EDIT ITEM MODAL */}
            {editItem
                && editItemForm && (
                <ModalShell
                    title="Edit PO Item"
                    subtitle={
                        getItemName(
                            editItem,
                        )
                    }
                    onClose={
                        closeEditItem
                    }
                    disabled={
                        savingItem
                    }
                >
                    <form
                        onSubmit={
                            submitEditItem
                        }
                    >
                        {editItem
                            .quantity_received
                            > 0 && (
                            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                <strong>
                                    {
                                        editItem.quantity_received
                                    }
                                </strong>{' '}
                                unit(s) have already
                                been received. Ordered
                                quantity cannot be
                                reduced below this
                                number.
                            </div>
                        )}

                        {editItem
                            .item_type
                            === 'manual' && (
                            <div className="grid gap-4">
                                <FormField
                                    label="Item Name *"
                                >
                                    <input
                                        type="text"
                                        value={
                                            editItemForm
                                                .manual_name
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditItemForm(
                                                (
                                                    current,
                                                ) =>
                                                    current
                                                        ? {
                                                            ...current,

                                                            manual_name:
                                                                event
                                                                    .target
                                                                    .value,
                                                        }
                                                        : current,
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label="Supplier SKU / Code"
                                >
                                    <input
                                        type="text"
                                        value={
                                            editItemForm
                                                .manual_sku
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditItemForm(
                                                (
                                                    current,
                                                ) =>
                                                    current
                                                        ? {
                                                            ...current,

                                                            manual_sku:
                                                                event
                                                                    .target
                                                                    .value,
                                                        }
                                                        : current,
                                            )
                                        }
                                        className={
                                            inputClass
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label="Description"
                                >
                                    <textarea
                                        value={
                                            editItemForm
                                                .manual_description
                                        }
                                        onChange={(
                                            event,
                                        ) =>
                                            setEditItemForm(
                                                (
                                                    current,
                                                ) =>
                                                    current
                                                        ? {
                                                            ...current,

                                                            manual_description:
                                                                event
                                                                    .target
                                                                    .value,
                                                        }
                                                        : current,
                                            )
                                        }
                                        className={`${inputClass} min-h-24 resize-y`}
                                    />
                                </FormField>

                            </div>
                        )}

                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <FormField
                                label="Quantity Ordered *"
                            >
                                <input
                                    type="number"
                                    min={
                                        Math.max(
                                            1,
                                            editItem
                                                .quantity_received,
                                        )
                                    }
                                    max={10000}
                                    step={1}
                                    value={
                                        editItemForm
                                            .quantity_ordered
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setEditItemForm(
                                            (
                                                current,
                                            ) =>
                                                current
                                                    ? {
                                                        ...current,

                                                        quantity_ordered:
                                                            clampNumberInput(
                                                                event
                                                                    .target
                                                                    .value,
                                                                10000,
                                                            ),
                                                    }
                                                    : current,
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </FormField>

                            <FormField
                                label="Unit Cost"
                            >
                                <input
                                    type="number"
                                    min={0}
                                    max="10000"
                                    step="0.01"
                                    value={
                                        editItemForm
                                            .unit_cost
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setEditItemForm(
                                            (
                                                current,
                                            ) =>
                                                current
                                                    ? {
                                                        ...current,

                                                        unit_cost:
                                                            clampNumberInput(
                                                                event
                                                                    .target
                                                                    .value,
                                                                10000,
                                                            ),
                                                    }
                                                    : current,
                                        )
                                    }
                                    className={
                                        inputClass
                                    }
                                />
                            </FormField>
                        </div>

                        {localError && (
                            <LocalError
                                message={
                                    localError
                                }
                            />
                        )}

                        <ModalActions>
                            <button
                                type="button"
                                disabled={
                                    savingItem
                                }
                                onClick={
                                    closeEditItem
                                }
                                className={
                                    secondaryButtonClass
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    savingItem
                                }
                                className={
                                    primaryButtonClass
                                }
                            >
                                {savingItem ? (
                                    <>
                                        <LoaderCircle
                                            size={
                                                17
                                            }
                                            className="animate-spin"
                                        />

                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2
                                            size={
                                                17
                                            }
                                        />

                                        Save Changes
                                    </>
                                )}
                            </button>
                        </ModalActions>
                    </form>
                </ModalShell>
            )}

            {/* ARCHIVE ITEM MODAL */}
            {archiveItem && (
                <ConfirmArchiveModal
                    title="Archive PO Item"
                    name={
                        getItemName(
                            archiveItem,
                        )
                    }
                    description="This item will disappear from the active PO but remain stored for historical tracking."
                    processing={
                        archivingItem
                    }
                    processingText="Archiving..."
                    confirmText="Archive Item"
                    onCancel={
                        closeArchiveItem
                    }
                    onConfirm={
                        confirmArchiveItem
                    }
                />
            )}

            {/* ARCHIVE PO MODAL */}
            {archivePoOpen && (
                <ConfirmArchiveModal
                    title="Archive Purchase Order"
                    name={
                        purchaseOrder.po_number
                    }
                    description="The purchase order will be removed from the active PO list but will not be permanently deleted."
                    processing={
                        archivingPo
                    }
                    processingText="Archiving..."
                    confirmText="Archive Purchase Order"
                    onCancel={
                        closeArchivePo
                    }
                    onConfirm={
                        confirmArchivePo
                    }
                />
            )}

            {/* RESTORE PO MODAL */}
            <ActionConfirmModal
                open={restorePoOpen}
                title="Restore Purchase Order?"
                message={`Confirm restoring ${purchaseOrder.po_number}. It will become active again and appear in the main Purchase Orders list.`}
                confirmText="Restore"
                processingText="Restoring..."
                processing={restoringPo}
                tone="primary"
                onCancel={closeRestorePo}
                onConfirm={confirmRestorePo}
            />

            {/* RESTORE ITEM MODAL */}
            <ActionConfirmModal
                open={itemToRestore !== null}
                title="Restore Purchase Order Item?"
                message={`Confirm restoring ${itemToRestore ? getItemName(itemToRestore) : 'this item'} back to the active PO.`}
                confirmText="Restore"
                processingText="Restoring..."
                processing={restoringItem}
                tone="primary"
                onCancel={() => setItemToRestore(null)}
                onConfirm={confirmRestoreItem}
            />
        </AdminLayout>
    );
}

function getItemName(
    item:
        PurchaseOrderItem,
): string {
    return (
        item.product_name
        ?? item.manual_name
        ?? 'Purchase Order Item'
    );
}

function getItemVariant(
    item:
        PurchaseOrderItem,
): string | null {
    if (
        item.item_type
        !== 'catalog'
    ) {
        return null;
    }

    const fallback =
        [
            item.program,
            item.size,
        ]
            .filter(
                Boolean,
            )
            .join(
                ' / ',
            );

    return (
        item.variant_name
        ?? (
            fallback
                ? fallback
                : null
        )
    );
}

function getArchiveItemDisabledReason(
    item:
        PurchaseOrderItem,
    activeItemCount:
        number,
): string {
    if (
        item.quantity_received
        > 0
    ) {
        return 'This item already has received merchandise and cannot be archived.';
    }

    if (
        activeItemCount
        <= 1
    ) {
        return 'The last active item cannot be archived. Archive the whole PO instead.';
    }

    return 'Archive purchase order item';
}

function ProductImage({
    src,
    name,
}: {
    src: string | null;
    name: string;
}) {
    return (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {src ? (
                <img
                    src={src}
                    alt={name}
                    className="h-full w-full object-cover"
                />
            ) : (
                <ImageIcon
                    size={26}
                    className="text-slate-300"
                />
            )}
        </div>
    );
}

function SmallVariantImage({
    src,
}: {
    src: string | null;
}) {
    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
            {src ? (
                <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                />
            ) : (
                <ImageIcon
                    size={20}
                    className="text-slate-300"
                />
            )}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
}: {
    label: string;
    value: string;
    description: string;
    icon: typeof ClipboardList;
}) {
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-600">
                        {label}
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-950">
                        {value}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                        {description}
                    </p>
                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon
                        size={20}
                    />
                </div>
            </div>
        </article>
    );
}

function QuantityBox({
    label,
    value,
    emphasized = false,
}: {
    label: string;
    value: number;
    emphasized?: boolean;
}) {
    return (
        <div
            className={`
                min-w-20
                rounded-xl
                px-3
                py-3

                ${
                    emphasized
                        ? 'bg-blue-50'
                        : 'bg-slate-50'
                }
            `}
        >
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p
                className={`
                    mt-1
                    text-lg
                    font-black

                    ${
                        emphasized
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

function StockBox({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl bg-white px-2 py-2 text-center">
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
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-black text-slate-800">
                {value}
            </p>
        </div>
    );
}

function DetailRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 break-words text-sm font-bold text-slate-800">
                {value}
            </p>
        </div>
    );
}

function FormField({
    label,
    children,
}: {
    label: string;
    children:
        React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
                {label}
            </label>

            {children}
        </div>
    );
}

function LocalError({
    message,
}: {
    message: string;
}) {
    return (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {message}
        </div>
    );
}

function ModalShell({
    title,
    subtitle,
    onClose,
    disabled,
    children,
}: {
    title: string;
    subtitle: string;
    onClose:
        () => void;
    disabled: boolean;
    children:
        React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-5">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                            Purchase Order
                        </p>

                        <h2 className="mt-1 text-xl font-black text-slate-900">
                            {title}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {subtitle}
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={
                            disabled
                        }
                        onClick={
                            onClose
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X
                            size={20}
                        />
                    </button>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}

function ModalActions({
    children,
}: {
    children:
        React.ReactNode;
}) {
    return (
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            {children}
        </div>
    );
}

function ConfirmArchiveModal({
    title,
    name,
    description,
    processing,
    processingText,
    confirmText,
    onCancel,
    onConfirm,
}: {
    title: string;
    name: string;
    description: string;
    processing: boolean;
    processingText: string;
    confirmText: string;
    onCancel:
        () => void;
    onConfirm:
        () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                    <Archive
                        size={25}
                    />
                </div>

                <p className="mt-5 text-xs font-black uppercase tracking-wide text-red-600">
                    {title}
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                    {name}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                    {description}
                </p>

                <p className="mt-3 text-sm font-bold text-slate-700">
                    Nothing will be permanently
                    deleted.
                </p>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        disabled={
                            processing
                        }
                        onClick={
                            onCancel
                        }
                        className={
                            secondaryButtonClass
                        }
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        disabled={
                            processing
                        }
                        onClick={
                            onConfirm
                        }
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-red-600
                            px-5
                            py-3
                            text-sm
                            font-black
                            text-white
                            transition
                            hover:bg-red-700
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {processing ? (
                            <>
                                <LoaderCircle
                                    size={
                                        17
                                    }
                                    className="animate-spin"
                                />

                                {
                                    processingText
                                }
                            </>
                        ) : (
                            <>
                                <Archive
                                    size={
                                        17
                                    }
                                />

                                {
                                    confirmText
                                }
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({
    status,
}: {
    status: string;
}) {
    const config =
        getStatusConfig(
            status,
        );

    return (
        <span
            className={`
                inline-flex
                rounded-full
                px-3
                py-1.5
                text-xs
                font-black
                ${config.className}
            `}
        >
            {config.label}
        </span>
    );
}

function getStatusConfig(
    status: string,
): {
    label: string;
    className: string;
} {
    switch (
        status
    ) {
        case 'ordered':
            return {
                label:
                    'Ordered',

                className:
                    'bg-blue-100 text-blue-700',
            };

        case 'partially_received':
            return {
                label:
                    'Partially Received',

                className:
                    'bg-amber-100 text-amber-700',
            };

        case 'completed':
            return {
                label:
                    'Completed',

                className:
                    'bg-emerald-100 text-emerald-700',
            };

        case 'cancelled':
            return {
                label:
                    'Cancelled',

                className:
                    'bg-red-100 text-red-700',
            };

        default:
            return {
                label:
                    'Draft',

                className:
                    'bg-slate-100 text-slate-700',
            };
    }
}

function formatCurrency(
    amount: number,
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
        amount,
    );
}

function modeClass(
    selected:
        boolean,
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
    placeholder:text-slate-400
    focus:border-blue-500
    focus:ring-4
    focus:ring-blue-500/10
`;

const primaryButtonClass = `
    inline-flex
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
    disabled:cursor-not-allowed
    disabled:opacity-60
`;

const secondaryButtonClass = `
    inline-flex
    items-center
    justify-center
    gap-2
    rounded-xl
    border
    border-slate-200
    bg-white
    px-5
    py-3
    text-sm
    font-black
    text-slate-700
    transition
    hover:bg-slate-50
    disabled:cursor-not-allowed
    disabled:opacity-50
`;