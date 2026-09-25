
import {
    Head,
    Link,
    useForm,
    usePage,
} from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    LoaderCircle,
    PackagePlus,
    X,
} from 'lucide-react';

import {
    
    useEffect,
    useState
} from 'react';
import type {FormEvent} from 'react';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import AwaitingItemsPicker from '@/components/admin/stock-receipts/AwaitingItemsPicker';
import CurrentStockCard from '@/components/admin/stock-receipts/CurrentStockCard';
import ReceiveStockForm from '@/components/admin/stock-receipts/ReceiveStockForm';
import { DatePicker } from '@/components/ui/date-picker';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';
import { clampNumberInput } from '@/lib/utils';
import specialist from '@/routes/specialist';

import type {
    ReceiveStockFormData,
    StockReceiptPageProps,
    StockReceiptProduct,
    StockReceiptVariant,
} from '@/types/stock-receipt';

/*
|--------------------------------------------------------------------------
| Shared Page Props
|--------------------------------------------------------------------------
*/

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

    flash?: {
        success?: string;
        error?: string;
    };
}

/*
|--------------------------------------------------------------------------
| Create Stock Receipt Page
|--------------------------------------------------------------------------
*/

export default function Create({
    products,
    purchaseOrders,
    categories,
}: StockReceiptPageProps) {

    const page =
        usePage<SharedPageProps>();

        const {
        notification,
        showSuccess,
        showError,
        clearNotification,
    } = useActionFeedback();

    const [
    showReceiveConfirm,
    setShowReceiveConfirm,
] = useState(false);

const [
    showLinkVariantConfirm,
    setShowLinkVariantConfirm,
] = useState(false);

const [
    showRegisterProductConfirm,
    setShowRegisterProductConfirm,
] = useState(false);

const [
    showPreorderConfigConfirm,
    setShowPreorderConfigConfirm,
] = useState(false);

    const currentRole =
        page.props.auth?.user?.role ??
        null;

    /*
    |--------------------------------------------------------------------------
    | Local State
    |--------------------------------------------------------------------------
    */

    const [
        successMessage,
        setSuccessMessage,
    ] = useState<string | null>(
        page.props.flash?.success ??
            null,
    );

    const [
        errorMessage,
        setErrorMessage,
    ] = useState<string | null>(
        page.props.flash?.error ??
            null,
    );

    /*
    |--------------------------------------------------------------------------
    | Form
    |--------------------------------------------------------------------------
    */

    const form =
        useForm<ReceiveStockFormData>({
            purchase_order_id:
                '',

            purchase_order_item_id:
                '',

            product_variant_id:
                '',

            quantity:
                '',

            supplier_reference_number:
                '',

            notes:
                '',
        });

/*
|--------------------------------------------------------------------------
| Register Legacy PO Item Form
|--------------------------------------------------------------------------
*/

const registerProductForm =
    useForm<{
        category_id: string;
        name: string;
        description: string;
        base_price: string;
        image: File | null;
    }>({
        category_id: '',
        name: '',
        description: '',
        base_price: '',
        image: null,
    });
/*
|--------------------------------------------------------------------------
| Link Existing PO Item Form
|--------------------------------------------------------------------------
*/

const linkVariantForm =
    useForm<{
        product_variant_id: string;
    }>({
        product_variant_id: '',
    });

const [
    linkProductId,
    setLinkProductId,
] = useState('');


/*
|--------------------------------------------------------------------------
| Preorder Launch Configuration Form
|--------------------------------------------------------------------------
*/

const preorderConfigForm =
    useForm<{
        preorder_enabled: boolean;
        expected_release_date: string;
        preorder_starts_at: string;
        preorder_ends_at: string;
        preorder_limit_per_student: string;
        preorder_capacity: string;
        preorder_payment_deadline_hours: string;
        preorder_early_bird_slots: string;
        preorder_early_bird_discount_percent: string;
        new_badge_duration_days: string;
    }>({
        preorder_enabled: true,
        expected_release_date: '',
        preorder_starts_at: '',
        preorder_ends_at: '',
        preorder_limit_per_student: '1',
        preorder_capacity: '',
        preorder_payment_deadline_hours: '72',
        preorder_early_bird_slots: '',
        preorder_early_bird_discount_percent: '',
        new_badge_duration_days: '7',
    });
    /*
    |--------------------------------------------------------------------------
    | Selected Purchase Order
    |--------------------------------------------------------------------------
    */

    const selectedPurchaseOrder =
        purchaseOrders.find(
            (purchaseOrder) =>
                String(
                    purchaseOrder.id,
                ) ===
                form.data
                    .purchase_order_id,
        ) ?? null;

    /*
    |--------------------------------------------------------------------------
    | Available PO Items
    |--------------------------------------------------------------------------
    */

        const availablePurchaseOrderItems =
            selectedPurchaseOrder
                ? selectedPurchaseOrder.items.filter(
                    (item) =>
                        item.quantity_remaining >
                        0,
                )
                : [];

    const selectedPurchaseOrderItem =
        availablePurchaseOrderItems.find(
            (item) =>
                String(item.id) ===
                form.data
                    .purchase_order_item_id,
        ) ?? null;


            /*
            |--------------------------------------------------------------------------
            | Preorder Configuration Eligibility
            |--------------------------------------------------------------------------
            */

const canConfigurePreorder =
    currentRole === 'specialist' &&
    selectedPurchaseOrderItem !== null &&
    selectedPurchaseOrderItem.merchandise_origin === 'new' &&
    selectedPurchaseOrderItem.product_variant_id !== null;

/*
|--------------------------------------------------------------------------
| Preorder Date Floors
|--------------------------------------------------------------------------
|
| Neither the preorder period nor the release date can be set in the
| past. Preorder End additionally can't be before Preorder Start.
| These floors both constrain the native picker widget (via `min`) and
| clamp anything typed or pasted in directly, since this form submits
| through Inertia rather than a native <form> and so never runs the
| browser's own min/max constraint validation.
*/

const minPreorderStart = nowDateTimeLocalValue();

const minPreorderEnd =
    preorderConfigForm.data.preorder_starts_at
    && preorderConfigForm.data.preorder_starts_at > minPreorderStart
        ? preorderConfigForm.data.preorder_starts_at
        : minPreorderStart;

useEffect(() => {
    setLinkProductId('');

    linkVariantForm.reset();

    if (
        selectedPurchaseOrderItem
            ?.item_type === 'manual' &&
        !selectedPurchaseOrderItem
            .product_variant_id
    ) {
        registerProductForm.setData({
            category_id:
                selectedPurchaseOrderItem
                    .proposed_category_id
                    ? String(
                          selectedPurchaseOrderItem
                              .proposed_category_id,
                      )
                    : '',

            name:
                selectedPurchaseOrderItem
                    .manual_name ?? '',

            description:
                selectedPurchaseOrderItem
                    .manual_description ?? '',

            base_price:
                selectedPurchaseOrderItem
                    .proposed_selling_price !==
                    null &&
                selectedPurchaseOrderItem
                    .proposed_selling_price !==
                    undefined
                    ? String(
                          selectedPurchaseOrderItem
                              .proposed_selling_price,
                      )
                    : '',

            image: null,
        });

        return;
    }

    registerProductForm.reset();
}, [
    selectedPurchaseOrderItem?.id,
]);


    /*
    |--------------------------------------------------------------------------
    | Linked Catalog Variant for PO Receiving
    |--------------------------------------------------------------------------
    |
    | A PO item may already point directly to a product variant.
    | Find that variant from the product collection so the existing
    | CurrentStockCard / ReceiveStockForm components can still receive
    | the correct StockReceiptVariant object.
    |
    */

    const selectedPurchaseOrderVariant =
        findVariantAcrossProducts(
            products,
            form.data
                .product_variant_id,
        );

    /*
    |--------------------------------------------------------------------------
    | Variant Used by Receive Form
    |--------------------------------------------------------------------------
    */

    const activeSelectedVariant =
        selectedPurchaseOrderVariant;

    /*
    |--------------------------------------------------------------------------
    | Purchase Order Receiving Gate
    |--------------------------------------------------------------------------
    |
    | An unlinked PO item must first be linked to an existing PROWARE
    | variant or registered as a new PROWARE product. Linking/registering
    | identifies the inventory record only; it does not receive stock.
    |
    */

    const isUnlinkedPurchaseOrderItem =
        selectedPurchaseOrderItem !==
            null &&
        !selectedPurchaseOrderItem
            .product_variant_id;

    const canReceiveStock =
        Boolean(
            selectedPurchaseOrderItem &&
                selectedPurchaseOrderItem
                    .product_variant_id &&
                activeSelectedVariant,
        );

    /*
    |--------------------------------------------------------------------------
    | Flash Success Message
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (
            page.props.flash
                ?.success
        ) {
            setSuccessMessage(
                page.props.flash
                    .success,
            );
        }
    }, [
        page.props.flash
            ?.success,
    ]);

    useEffect(() => {
        if (
            page.props.flash
                ?.error
        ) {
            setErrorMessage(
                page.props.flash
                    .error,
            );
        }
    }, [
        page.props.flash
            ?.error,
    ]);

    useEffect(() => {
        if (!successMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setSuccessMessage(
                        null,
                    );
                },
                8000,
            );

        return () =>
            window.clearTimeout(
                timeout,
            );
    }, [successMessage]);

    useEffect(() => {
        if (!errorMessage) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setErrorMessage(
                        null,
                    );
                },
                10000,
            );

        return () =>
            window.clearTimeout(
                timeout,
            );
    }, [errorMessage]);

    /*
    |--------------------------------------------------------------------------
    | Select Purchase Order
    |--------------------------------------------------------------------------
    */

    const handlePurchaseOrderChange =
        (
            purchaseOrderId:
                string,
        ): void => {
            form.setData(
                'purchase_order_id',
                purchaseOrderId,
            );

            form.setData(
                'purchase_order_item_id',
                '',
            );

            form.setData(
                'product_variant_id',
                '',
            );

            form.setData(
                'quantity',
                '',
            );

            form.setData(
                'supplier_reference_number',
                '',
            );

            form.clearErrors();

            setSuccessMessage(
                null,
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Select Purchase Order Item
    |--------------------------------------------------------------------------
    */

    const handlePurchaseOrderItemChange =
        (
            itemId:
                string,
        ): void => {
            form.setData(
                'purchase_order_item_id',
                itemId,
            );

            const item =
                availablePurchaseOrderItems.find(
                    (
                        purchaseOrderItem,
                    ) =>
                        String(
                            purchaseOrderItem.id,
                        ) ===
                        itemId,
                );

            form.setData(
                'product_variant_id',
                item
                    ?.product_variant_id
                    ? String(
                          item.product_variant_id,
                      )
                    : '',
            );

            form.setData(
                'quantity',
                '',
            );

            form.clearErrors();

            setSuccessMessage(
                null,
            );
        };

    /*
    |--------------------------------------------------------------------------
    | Select Awaiting Item Directly (Specialist)
    |--------------------------------------------------------------------------
    |
    | Used by the calendar/list picker: identifies both the PO and the
    | item in one click, instead of the two-step dropdown flow above.
    */

    const selectAwaitingItem = (
        purchaseOrderId: string,
        itemId: string,
    ): void => {
        const targetOrder = purchaseOrders.find(
            (purchaseOrder) => String(purchaseOrder.id) === purchaseOrderId,
        );

        const item = targetOrder?.items.find(
            (purchaseOrderItem) => String(purchaseOrderItem.id) === itemId,
        );

        form.setData('purchase_order_id', purchaseOrderId);
        form.setData('purchase_order_item_id', itemId);

        form.setData(
            'product_variant_id',
            item?.product_variant_id
                ? String(item.product_variant_id)
                : '',
        );

        form.setData('quantity', '');
        form.setData('supplier_reference_number', '');

        form.clearErrors();

        setSuccessMessage(null);
    };

    /*
|--------------------------------------------------------------------------
| Submit
|--------------------------------------------------------------------------
*/

const submit = (
    event: FormEvent<HTMLFormElement>,
): void => {
    event.preventDefault();

    setSuccessMessage(null);
    setErrorMessage(null);

    if (
        selectedPurchaseOrderItem &&
        !selectedPurchaseOrderItem
            .product_variant_id
    ) {
        setErrorMessage(
            'This purchase order item is not linked to PROWARE inventory yet. Link it to an existing product variant or register it as a new product before receiving stock.',
        );

        return;
    }

    if (!canReceiveStock) {
        setErrorMessage(
            'Select a valid linked purchase order item before receiving stock.',
        );

        return;
    }

    setShowReceiveConfirm(true);
};


/*
|--------------------------------------------------------------------------
| Confirm Receive Stock
|--------------------------------------------------------------------------
*/

const confirmReceiveStock = (): void => {
    if (
        form.processing ||
        !canReceiveStock
    ) {
        return;
    }

    form.post(
        '/staff/stock-receipts',
        {
            preserveScroll: true,

            onSuccess: () => {
                setShowReceiveConfirm(false);

                form.reset(
                    'purchase_order_id',
                    'purchase_order_item_id',
                    'product_variant_id',
                    'quantity',
                    'supplier_reference_number',
                    'notes',
                );

                showSuccess(
                    'Stock received successfully.',
                );
            },

            onError: (errors) => {
                setShowReceiveConfirm(false);

                const firstError =
                    Object.values(errors)[0];

                setSuccessMessage(null);

                if (
                    typeof firstError ===
                    'string'
                ) {
                    setErrorMessage(
                        firstError,
                    );

                    showError(
                        firstError,
                    );

                    return;
                }

                showError(
                    'Stock could not be received. Please check the form and try again.',
                );
            },
        },
    );
};

        

/*
|--------------------------------------------------------------------------
| Layout
|--------------------------------------------------------------------------
|
| Specialist receives the Specialist workspace.
| Admin receives the Admin workspace.
|
*/

const Layout =
    currentRole === 'specialist'
        ? SpecialistLayout
        : AdminLayout;

/*
|--------------------------------------------------------------------------
| Register New Product
|--------------------------------------------------------------------------
*/

const submitProductRegistration = (
    event: FormEvent<HTMLFormElement>,
): void => {
    event.preventDefault();

    if (
        !selectedPurchaseOrderItem ||
        registerProductForm.processing
    ) {
        return;
    }

    setShowRegisterProductConfirm(true);
};



/*
|--------------------------------------------------------------------------
| Confirm Register PROWARE Product
|--------------------------------------------------------------------------
*/

const confirmProductRegistration = (): void => {
    if (
        !selectedPurchaseOrderItem ||
        registerProductForm.processing
    ) {
        return;
    }

    registerProductForm.post(
        `/staff/stock-receipts/purchase-order-items/${selectedPurchaseOrderItem.id}/register-product`,
        {
            forceFormData: true,
            preserveScroll: true,

            onSuccess: () => {
                setShowRegisterProductConfirm(false);

                registerProductForm.reset();

                showSuccess(
                    'PROWARE product registered successfully.',
                );
            },

            onError: (errors) => {
                setShowRegisterProductConfirm(false);

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
                    'Product could not be registered. Please check the form and try again.',
                );
            },
        },
    );
};
/*
|--------------------------------------------------------------------------
| Existing Product Selected for PO Link
|--------------------------------------------------------------------------
*/

const linkedProduct =
    findSelectedProduct(
        products,
        linkProductId,
    );

/*
|--------------------------------------------------------------------------
| Change Existing Product
|--------------------------------------------------------------------------
*/

const handleLinkProductChange = (
    productId: string,
): void => {
    setLinkProductId(
        productId,
    );

    linkVariantForm.setData(
        'product_variant_id',
        '',
    );

    linkVariantForm.clearErrors();
};

/*
|--------------------------------------------------------------------------
| Change Existing Variant
|--------------------------------------------------------------------------
*/

const handleLinkVariantChange = (
    variantId: string,
): void => {
    linkVariantForm.setData(
        'product_variant_id',
        variantId,
    );

    linkVariantForm.clearErrors(
        'product_variant_id',
    );
};

/*
|--------------------------------------------------------------------------
| Link Existing Variant to Purchase Order Item
|--------------------------------------------------------------------------
*/

const submitVariantLink = (
    event: FormEvent<HTMLFormElement>,
): void => {
    event.preventDefault();

    if (
        !selectedPurchaseOrderItem ||
        !linkProductId ||
        !linkVariantForm.data
            .product_variant_id
    ) {
        return;
    }

    setShowLinkVariantConfirm(true);
};





/*
|--------------------------------------------------------------------------
| Confirm Link Existing Variant
|--------------------------------------------------------------------------
*/

const confirmVariantLink = (): void => {
    if (
        linkVariantForm.processing ||
        !selectedPurchaseOrderItem ||
        !linkProductId ||
        !linkVariantForm.data
            .product_variant_id
    ) {
        return;
    }

    linkVariantForm.post(
        `/staff/stock-receipts/purchase-order-items/${selectedPurchaseOrderItem.id}/link-variant`,
        {
            preserveScroll: true,

            onSuccess: () => {
                setShowLinkVariantConfirm(false);

                linkVariantForm.reset();

                setLinkProductId('');

                showSuccess(
                    'Existing product variant linked successfully.',
                );
            },

            onError: (errors) => {
                setShowLinkVariantConfirm(false);

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
                    'Product variant could not be linked. Please try again.',
                );
            },
        },
    );
};


/*
|--------------------------------------------------------------------------
| Save Preorder Configuration
|--------------------------------------------------------------------------
*/

const submitPreorderConfiguration = (
    event: FormEvent<HTMLFormElement>,
): void => {
    event.preventDefault();

    if (
        !selectedPurchaseOrderItem ||
        !canConfigurePreorder ||
        preorderConfigForm.processing
    ) {
        return;
    }

    setErrorMessage(null);

    if (
        preorderConfigForm.data.expected_release_date
        && preorderConfigForm.data.expected_release_date
            < minPreorderStart.slice(0, 10)
    ) {
        setErrorMessage(
            'Expected release date cannot be in the past.',
        );

        return;
    }

    if (
        preorderConfigForm.data.preorder_starts_at
        && preorderConfigForm.data.preorder_starts_at
            < minPreorderStart
    ) {
        setErrorMessage(
            'Preorder start cannot be in the past.',
        );

        return;
    }

    if (
        preorderConfigForm.data.preorder_ends_at
        && preorderConfigForm.data.preorder_ends_at
            <= (
                preorderConfigForm.data.preorder_starts_at
                || minPreorderStart
            )
    ) {
        setErrorMessage(
            'Preorder end must be after preorder start.',
        );

        return;
    }

    setShowPreorderConfigConfirm(true);
};


/*
|--------------------------------------------------------------------------
| Confirm Save Preorder Configuration
|--------------------------------------------------------------------------
*/

const confirmPreorderConfiguration = (): void => {
    if (
        !selectedPurchaseOrderItem ||
        !canConfigurePreorder ||
        preorderConfigForm.processing
    ) {
        return;
    }

    preorderConfigForm.patch(
        specialist.purchaseOrderItems.preorderConfiguration.update.url(
            selectedPurchaseOrderItem.id,
        ),
        {
            preserveScroll: true,

            onSuccess: () => {
                setShowPreorderConfigConfirm(false);

                showSuccess(
                    'Preorder configuration saved successfully.',
                );
            },

            onError: (errors) => {
                setShowPreorderConfigConfirm(false);

                const firstError =
                    Object.values(errors)[0];

                if (
                    typeof firstError === 'string'
                ) {
                    showError(firstError);

                    return;
                }

                showError(
                    'Preorder configuration could not be saved. Please check the form and try again.',
                );
            },
        },
    );
};


    return (
        <Layout>
            <Head title="Receive Stock" />

            <ActionConfirmModal
                open={showReceiveConfirm}
                title="Receive Stock?"
                message={`Confirm receiving ${form.data.quantity || 'the entered quantity'} unit(s). This will update the inventory quantity on hand.`}
                confirmText="Receive Stock"
                processingText="Receiving Stock..."
                processing={form.processing}
                tone="primary"
                onCancel={() =>
                    setShowReceiveConfirm(false)
                }
                onConfirm={
                    confirmReceiveStock
                }
            />

            <ActionConfirmModal
                    open={showLinkVariantConfirm}
                    title="Link Existing Variant?"
                    message={`Confirm linking this purchase order item to ${linkedProduct?.name ?? 'the selected existing product'} inventory. This does not receive stock yet.`}
                    confirmText="Link Variant"
                    processingText="Linking..."
                    processing={linkVariantForm.processing}
                    tone="primary"
                    onCancel={() =>
                        setShowLinkVariantConfirm(false)
                    }
                    onConfirm={
                        confirmVariantLink
                    }
                />


                <ActionConfirmModal
                    open={showRegisterProductConfirm}
                    title="Register PROWARE Product?"
                    message={`Register ${registerProductForm.data.name || 'this merchandise'} as a new PROWARE product and link it to this purchase order item? This does not receive stock yet.`}
                    confirmText="Register Product"
                    processingText="Registering..."
                    processing={
                        registerProductForm.processing
                    }
                    tone="primary"
                    onCancel={() =>
                        setShowRegisterProductConfirm(
                            false,
                        )
                    }
                    onConfirm={
                        confirmProductRegistration
                    }
                />

                <ActionConfirmModal
                    open={showPreorderConfigConfirm}
                    title="Save Preorder Configuration?"
                    message="Confirm saving this preorder launch configuration for the selected new merchandise."
                    confirmText="Save Configuration"
                    processingText="Saving..."
                    processing={preorderConfigForm.processing}
                    tone="primary"
                    onCancel={() =>
                        setShowPreorderConfigConfirm(false)
                    }
                    onConfirm={
                        confirmPreorderConfiguration
                    }
                />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}

            <div className="mx-auto max-w-7xl space-y-7">
                <PageHeader
                    currentRole={
                        currentRole
                    }
                />

                {/* Flash Popups */}

                {(successMessage ||
                    errorMessage) && (
                    <div
                        className="
                            fixed
                            left-1/2
                            top-1/2
                            z-[100]
                            w-[calc(100%-2.5rem)]
                            max-w-lg
                            -translate-x-1/2
                            -translate-y-1/2
                            space-y-3
                        "
                    >
                        {successMessage && (
                            <SuccessAlert
                                message={
                                    successMessage
                                }
                                onClose={() =>
                                    setSuccessMessage(
                                        null,
                                    )
                                }
                            />
                        )}

                        {errorMessage && (
                            <ErrorAlert
                                message={
                                    errorMessage
                                }
                                onClose={() =>
                                    setErrorMessage(
                                        null,
                                    )
                                }
                            />
                        )}
                    </div>
                )}

                {/* Receiving Method */}

                {/* Main Content */}

                <div
                    className="
                        grid
                        gap-7
                        xl:grid-cols-[minmax(0,1fr)_390px]
                    "
                >
                    <div className="space-y-7">
                        {/* Purchase Order Receiving */}

                        <>
                                {/* Select PO */}

                                {currentRole !== 'specialist' && (
                                <section
                                    className="
                                        rounded-3xl
                                        border
                                        border-slate-200
                                        bg-white
                                        p-6
                                        shadow-sm
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
                                            Purchase
                                            Order
                                        </p>

                                        <h2
                                            className="
                                                mt-1
                                                text-xl
                                                font-black
                                                text-slate-900
                                            "
                                        >
                                            Select
                                            Purchase
                                            Order
                                        </h2>

                                        <p
                                            className="
                                                mt-2
                                                text-sm
                                                leading-6
                                                text-slate-500
                                            "
                                        >
                                            Choose
                                            the
                                            supplier
                                            purchase
                                            order for
                                            the
                                            delivery
                                            being
                                            received.
                                        </p>
                                    </div>

                                    <div className="mt-5">
                                        <label
                                            htmlFor="purchase_order_id"
                                            className="
                                                text-sm
                                                font-bold
                                                text-slate-700
                                            "
                                        >
                                            Purchase
                                            Order
                                        </label>

                                        <select
                                            id="purchase_order_id"
                                            value={
                                                form
                                                    .data
                                                    .purchase_order_id
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                handlePurchaseOrderChange(
                                                    event
                                                        .target
                                                        .value,
                                                )
                                            }
                                            className="
                                                mt-2
                                                w-full
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                px-4
                                                py-3
                                                text-sm
                                                font-semibold
                                                text-slate-800
                                                outline-none
                                                transition
                                                focus:border-blue-500
                                                focus:ring-4
                                                focus:ring-blue-100
                                            "
                                        >
                                            <option value="">
                                                Select
                                                a
                                                purchase
                                                order
                                            </option>

                                            {purchaseOrders.map(
                                                (
                                                    purchaseOrder,
                                                ) => (
                                                    <option
                                                        key={
                                                            purchaseOrder.id
                                                        }
                                                        value={
                                                            purchaseOrder.id
                                                        }
                                                    >
                                                        {
                                                            purchaseOrder.po_number
                                                        }

                                                        {
                                                            ' — '
                                                        }

                                                        {
                                                            purchaseOrder.supplier_name
                                                        }

                                                        {(() => {
                                                            const summary =
                                                                getPurchaseOrderItemSummary(
                                                                    purchaseOrder.items,
                                                                );

                                                            return summary
                                                                ? ` (${summary})`
                                                                : '';
                                                        })()}
                                                    </option>
                                                ),
                                            )}
                                        </select>

                                        {form
                                            .errors
                                            .purchase_order_id && (
                                            <p className="mt-2 text-sm font-semibold text-red-600">
                                                {
                                                    form
                                                        .errors
                                                        .purchase_order_id
                                                }
                                            </p>
                                        )}

                                        {purchaseOrders.length ===
                                            0 && (
                                            <div
                                                className="
                                                    mt-4
                                                    rounded-xl
                                                    border
                                                    border-amber-200
                                                    bg-amber-50
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    font-semibold
                                                    text-amber-700
                                                "
                                            >
                                                No
                                                purchase
                                                orders
                                                are
                                                currently
                                                available
                                                for
                                                receiving.
                                            </div>
                                        )}
                                    </div>

                                    {selectedPurchaseOrder && (
                                        <div
                                            className="
                                                mt-5
                                                rounded-2xl
                                                bg-slate-50
                                                p-4
                                            "
                                        >
                                            <div
                                                className="
                                                    grid
                                                    gap-4
                                                    sm:grid-cols-2
                                                "
                                            >
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                        Supplier
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-900">
                                                        {
                                                            selectedPurchaseOrder.supplier_name
                                                        }
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                        Status
                                                    </p>

                                                    <p className="mt-1 font-black capitalize text-slate-900">
                                                        {selectedPurchaseOrder.status.replace(
                                                            /_/g,
                                                            ' ',
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                        Supplier
                                                        Reference
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-900">
                                                        {selectedPurchaseOrder.supplier_reference_number ??
                                                            'Not provided'}
                                                    </p>
                                                </div>

                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                        Expected
                                                        Delivery
                                                    </p>

                                                    <p className="mt-1 font-black text-slate-900">
                                                        {formatDate(
                                                            selectedPurchaseOrder.expected_delivery_date,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </section>
                                )}

                                {/* Awaiting Items Picker (Specialist) */}

                                {currentRole === 'specialist' && (
                                    <AwaitingItemsPicker
                                        purchaseOrders={purchaseOrders}
                                        selectedPurchaseOrderId={form.data.purchase_order_id}
                                        selectedPurchaseOrderItemId={form.data.purchase_order_item_id}
                                        onSelectItem={selectAwaitingItem}
                                    />
                                )}

                                {/* Select PO Item */}

                                {currentRole !== 'specialist' && selectedPurchaseOrder && (
                                    <section
                                        className="
                                            rounded-3xl
                                            border
                                            border-slate-200
                                            bg-white
                                            p-6
                                            shadow-sm
                                        "
                                    >
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                                Purchase
                                                Order
                                                Item
                                            </p>

                                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                                Select
                                                Delivered
                                                Item
                                            </h2>

                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                Only
                                                purchase
                                                order
                                                items
                                                with
                                                remaining
                                                units
                                                are
                                                shown.
                                            </p>
                                        </div>

                                        <div className="mt-5">
                                            <label
                                                htmlFor="purchase_order_item_id"
                                                className="text-sm font-bold text-slate-700"
                                            >
                                                Purchase
                                                Order
                                                Item
                                            </label>

                                            <select
                                                id="purchase_order_item_id"
                                                value={
                                                    form
                                                        .data
                                                        .purchase_order_item_id
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    handlePurchaseOrderItemChange(
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                className="
                                                    mt-2
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-white
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    font-semibold
                                                    text-slate-800
                                                    outline-none
                                                    transition
                                                    focus:border-blue-500
                                                    focus:ring-4
                                                    focus:ring-blue-100
                                                "
                                            >
                                                <option value="">
                                                    Select
                                                    an
                                                    item
                                                </option>

                                                {availablePurchaseOrderItems.map(
                                                    (
                                                        item,
                                                    ) => (
                                                        <option
                                                            key={
                                                                item.id
                                                            }
                                                            value={
                                                                item.id
                                                            }
                                                        >
                                                            {getPurchaseOrderItemName(
                                                                item,
                                                            )}

                                                            {
                                                                ' — Remaining: '
                                                            }

                                                            {
                                                                item.quantity_remaining
                                                            }
                                                        </option>
                                                    ),
                                                )}
                                            </select>

                                            {form
                                                .errors
                                                .purchase_order_item_id && (
                                                <p className="mt-2 text-sm font-semibold text-red-600">
                                                    {
                                                        form
                                                            .errors
                                                            .purchase_order_item_id
                                                    }
                                                </p>
                                            )}
                                        </div>

                                        {availablePurchaseOrderItems.length ===
                                            0 && (
                                            <div
                                                className="
                                                    mt-4
                                                    rounded-xl
                                                    border
                                                    border-emerald-200
                                                    bg-emerald-50
                                                    px-4
                                                    py-3
                                                    text-sm
                                                    font-semibold
                                                    text-emerald-700
                                                "
                                            >
                                                This
                                                purchase
                                                order
                                                has no
                                                outstanding
                                                items
                                                left
                                                to
                                                receive.
                                            </div>
                                        )}
                                    </section>
                                )}

                                {/* Selected PO Item */}

                                {selectedPurchaseOrderItem && (
                                    <section
                                        className="
                                            rounded-3xl
                                            border
                                            border-blue-100
                                            bg-blue-50/50
                                            p-6
                                            shadow-sm
                                        "
                                    >
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                                                Selected
                                                Delivery
                                            </p>

                                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                                {getPurchaseOrderItemName(
                                                    selectedPurchaseOrderItem,
                                                )}
                                            </h2>

                                            {selectedPurchaseOrder && (
                                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                                    {selectedPurchaseOrder.po_number}
                                                    {' — '}
                                                    {selectedPurchaseOrder.supplier_name}
                                                    {' — Expected '}
                                                    {formatDate(
                                                        selectedPurchaseOrder.expected_delivery_date,
                                                    )}
                                                </p>
                                            )}

                                            <div
                                                className="
                                                    mt-2
                                                    flex
                                                    flex-wrap
                                                    gap-x-3
                                                    gap-y-1
                                                    text-sm
                                                    text-slate-500
                                                "
                                            >
                                                {(selectedPurchaseOrderItem.sku ??
                                                    selectedPurchaseOrderItem.manual_sku) && (
                                                    <span>
                                                        SKU:{' '}
                                                        <strong className="text-slate-700">
                                                            {selectedPurchaseOrderItem.sku ??
                                                                selectedPurchaseOrderItem.manual_sku}
                                                        </strong>
                                                    </span>
                                                )}

                                                {selectedPurchaseOrderItem.variant_name && (
                                                    <span>
                                                        Variant:{' '}
                                                        <strong className="text-slate-700">
                                                            {
                                                                selectedPurchaseOrderItem.variant_name
                                                            }
                                                        </strong>
                                                    </span>
                                                )}

                                                {selectedPurchaseOrderItem.program && (
                                                    <span>
                                                        Program:{' '}
                                                        <strong className="text-slate-700">
                                                            {
                                                                selectedPurchaseOrderItem.program
                                                            }
                                                        </strong>
                                                    </span>
                                                )}

                                                {selectedPurchaseOrderItem.size && (
                                                    <span>
                                                        Size:{' '}
                                                        <strong className="text-slate-700">
                                                            {
                                                                selectedPurchaseOrderItem.size
                                                            }
                                                        </strong>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div
                                            className="
                                                mt-5
                                                grid
                                                gap-3
                                                sm:grid-cols-3
                                            "
                                        >
                                            <QuantityCard
                                                label="Ordered"
                                                value={
                                                    selectedPurchaseOrderItem.quantity_ordered
                                                }
                                            />

                                            <QuantityCard
                                                label="Received"
                                                value={
                                                    selectedPurchaseOrderItem.quantity_received
                                                }
                                            />

                                            <QuantityCard
                                                label="Remaining"
                                                value={
                                                    selectedPurchaseOrderItem.quantity_remaining
                                                }
                                                emphasized
                                            />
                                        </div>

                                        {selectedPurchaseOrderItem.item_type ===
                                            'catalog' &&
                                            selectedPurchaseOrderItem.product_variant_id !==
                                                null && (
                                                <div
                                                    className="
                                                        mt-5
                                                        rounded-2xl
                                                        border
                                                        border-emerald-200
                                                        bg-emerald-50
                                                        p-4
                                                    "
                                                >
                                                    <p className="text-sm font-black text-emerald-800">
                                                        Inventory
                                                        variant
                                                        linked
                                                    </p>

                                                    <p className="mt-1 text-sm leading-6 text-emerald-700">
                                                        Stock
                                                        received
                                                        for
                                                        this PO
                                                        item
                                                        will
                                                        update
                                                        its
                                                        linked
                                                        PROWARE
                                                        inventory
                                                        variant.
                                                    </p>
                                                </div>
                                            )}

{canConfigurePreorder && (
    <form
        onSubmit={submitPreorderConfiguration}
        className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-5"
    >
        <div>
            <p className="text-sm font-black text-violet-900">
                Configure Preorder Launch
            </p>

            <p className="mt-1 text-sm leading-6 text-violet-700">
                Configure how this new merchandise will accept student preorders before stock is received.
            </p>

            <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-800">
                Preorder Settings
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
                Set the preorder period, student limit, available slots,
                payment deadline, early-bird discount, and how long the
                NEW badge will remain visible after the merchandise arrives.
            </p>
        </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
                <label className="text-sm font-bold text-slate-700">
                    Expected Release Date
                </label>

                <div className="mt-2">
                    <DatePicker
                        value={
                            preorderConfigForm.data
                                .expected_release_date
                        }
                        onChange={(value) =>
                            preorderConfigForm.setData(
                                'expected_release_date',
                                value,
                            )
                        }
                        placeholder="Select date"
                    />
                </div>
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700">
                    Per Student Limit
                </label>

                <input
                    type="number"
                    min="1"
                    max={selectedPurchaseOrderItem.quantity_ordered}
                    value={preorderConfigForm.data.preorder_limit_per_student}
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'preorder_limit_per_student',
                            clampNumberInput(
                                event.target.value,
                                selectedPurchaseOrderItem.quantity_ordered,
                            ),
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                />

                <p className="mt-1 text-xs text-slate-500">
                    Maximum {selectedPurchaseOrderItem.quantity_ordered} unit(s) — that's how many you ordered from the supplier.
                </p>
            </div>

            <div>
                    <label className="text-sm font-bold text-slate-700">
                        Preorder Start
                    </label>

                    <div className="mt-2 flex items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-violet-600">
            <CalendarDays size={20} />

            <input
                type="datetime-local"
                min={minPreorderStart}
                value={
                    preorderConfigForm.data
                        .preorder_starts_at
                }
                onChange={(event) =>
                    preorderConfigForm.setData(
                        'preorder_starts_at',
                        clampDateTimeLocalInput(
                            event.target.value,
                            minPreorderStart,
                        ),
                    )
                }
                onClick={(event) =>
                    event.currentTarget.showPicker?.()
                }
                className="absolute inset-0 cursor-pointer opacity-0"
            />
        </div>

        <span className="text-sm font-semibold text-slate-700">
            {preorderConfigForm.data.preorder_starts_at
                ? preorderConfigForm.data.preorder_starts_at.replace(
                    'T',
                    ' ',
                )
                : 'Select date & time'}
        </span>
        </div>
            </div>

            <div>
                        <label className="text-sm font-bold text-slate-700">
                            Preorder End
                        </label>

                        <div className="mt-2 flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-slate-300 bg-white text-violet-600">
                <CalendarDays size={20} />

                <input
                    type="datetime-local"
                    min={minPreorderEnd}
                    value={
                        preorderConfigForm.data
                            .preorder_ends_at
                    }
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'preorder_ends_at',
                            clampDateTimeLocalInput(
                                event.target.value,
                                minPreorderEnd,
                            ),
                        )
                    }
                    onClick={(event) =>
                        event.currentTarget.showPicker?.()
                    }
                    className="absolute inset-0 cursor-pointer opacity-0"
                />
            </div>

            <span className="text-sm font-semibold text-slate-700">
                {preorderConfigForm.data.preorder_ends_at
                    ? preorderConfigForm.data.preorder_ends_at.replace(
                        'T',
                        ' ',
                    )
                    : 'Select date & time'}
            </span>
</div>
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700">
                    Preorder Capacity
                </label>

                <input
                    type="number"
                    min="1"
                    max={selectedPurchaseOrderItem.quantity_ordered}
                    value={preorderConfigForm.data.preorder_capacity}
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'preorder_capacity',
                            clampNumberInput(
                                event.target.value,
                                selectedPurchaseOrderItem.quantity_ordered,
                            ),
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                />

                <p className="mt-1 text-xs text-slate-500">
                    Maximum {selectedPurchaseOrderItem.quantity_ordered} unit(s) — that's how many you ordered from the supplier.
                </p>
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700">
                    Payment Deadline (Hours)
                </label>

                <input
                    type="number"
                    min="72"
                    max="720"
                    value={
                        preorderConfigForm.data
                            .preorder_payment_deadline_hours
                    }
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'preorder_payment_deadline_hours',
                            clampNumberInput(
                                event.target.value,
                                720,
                            ),
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                />

                <p className="mt-1 text-xs text-slate-500">
                    Between 72 (3 days) and 720 (30 days) hours.
                </p>
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700">
                    Early-Bird Slots
                </label>

                <input
                    type="number"
                    min="1"
                    value={
                        preorderConfigForm.data
                            .preorder_early_bird_slots
                    }
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'preorder_early_bird_slots',
                            event.target.value,
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                />
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700">
                    Early-Bird Discount (%)
                </label>

                <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                        preorderConfigForm.data
                            .preorder_early_bird_discount_percent
                    }
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'preorder_early_bird_discount_percent',
                            clampNumberInput(
                                event.target.value,
                                100,
                            ),
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                />
            </div>

            <div>
                <label className="text-sm font-bold text-slate-700">
                    NEW Badge Duration (Days)
                </label>

                <input
                    type="number"
                    min="1"
                    max="90"
                    value={
                        preorderConfigForm.data
                            .new_badge_duration_days
                    }
                    onChange={(event) =>
                        preorderConfigForm.setData(
                            'new_badge_duration_days',
                            clampNumberInput(
                                event.target.value,
                                90,
                            ),
                        )
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500"
                />
            </div>
        </div>

        <label className="mt-5 flex items-center gap-3 rounded-xl border border-violet-200 bg-white p-4">
            <input
                type="checkbox"
                checked={
                    preorderConfigForm.data
                        .preorder_enabled
                }
                onChange={(event) =>
                    preorderConfigForm.setData(
                        'preorder_enabled',
                        event.target.checked,
                    )
                }
            />

            <div>
                <p className="text-sm font-bold text-slate-800">
                    Enable Student Preorder
                </p>

                <p className="mt-1 text-xs text-slate-500">
                    Students can preorder this new merchandise during the configured preorder period.
                </p>
            </div>
        </label>

        <button
            type="submit"
            disabled={preorderConfigForm.processing}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {preorderConfigForm.processing && (
                <LoaderCircle
                    size={18}
                    className="animate-spin"
                />
            )}

            <span>
                {preorderConfigForm.processing
                    ? 'Saving Configuration...'
                    : 'Save Preorder Configuration'}
            </span>
        </button>
    </form>
)}



        {selectedPurchaseOrderItem.item_type ===
            'manual' &&
            !selectedPurchaseOrderItem.product_variant_id && (
                <div
            className="
                mt-5
                rounded-2xl
                border
                border-amber-200
                bg-amber-50
                p-5
                text-slate-900
            "
        >
            <div>
                <p
                    className="
                        text-sm
                        font-black
                        text-amber-900
                    "
                >
                    Unlinked Purchase Order Item
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-700">
                    This purchase order item is not yet
                    connected to PROWARE inventory.
                    Link it to an existing product variant
                    if the merchandise already exists, or
                    register it as a new product if it is
                    genuinely new merchandise.
                </p>
            </div>

<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
    <div>
        <p className="text-sm font-black text-slate-900">
            Link Existing Product
        </p>

        <p className="mt-1 text-sm leading-6 text-slate-600">
            Use this when the merchandise is already
            registered in PROWARE. Select the product
            and the exact inventory variant that this
            purchase order item belongs to.
        </p>
    </div>

    <form
        onSubmit={submitVariantLink}
        className="mt-5 space-y-5"
    >
        {/* Existing Product */}
        <div>
            <label
                htmlFor="link_product_id"
                className="mb-2 block text-sm font-bold text-slate-700"
            >
                Existing Product
            </label>

            <select
                id="link_product_id"
                value={linkProductId}
                onChange={(event) =>
                    handleLinkProductChange(
                        event.target.value,
                    )
                }
                className="
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
                    focus:ring-2
                    focus:ring-blue-100
                "
            >
                <option value="">
                    Select existing product
                </option>

                {products.map((product) => (
                    <option
                        key={product.id}
                        value={String(product.id)}
                    >
                        {product.code} — {product.name}
                    </option>
                ))}
            </select>
        </div>

        {/* Exact Variant */}
        <div>
            <label
                htmlFor="link_product_variant_id"
                className="mb-2 block text-sm font-bold text-slate-700"
            >
                Exact Product Variant
            </label>

            <select
                id="link_product_variant_id"
                value={
                    linkVariantForm.data
                        .product_variant_id
                }
                onChange={(event) =>
                    handleLinkVariantChange(
                        event.target.value,
                    )
                }
                disabled={!linkedProduct}
                className="
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
                    disabled:cursor-not-allowed
                    disabled:bg-slate-100
                    disabled:text-slate-400
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                "
            >
                <option value="">
                    {linkedProduct
                        ? 'Select exact variant'
                        : 'Select a product first'}
                </option>

                {linkedProduct?.variants.map(
                    (variant) => (
                        <option
                            key={variant.id}
                            value={String(
                                variant.id,
                            )}
                        >
                            {variant.variant_name ||
                                [
                                    variant.program,
                                    variant.size,
                                ]
                                    .filter(Boolean)
                                    .join(' / ') ||
                                'Standard'}{' '}
                            — {variant.sku}
                        </option>
                    ),
                )}
            </select>

            {linkVariantForm.errors
                .product_variant_id && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                    {
                        linkVariantForm.errors
                            .product_variant_id
                    }
                </p>
            )}
        </div>

        {/* Selected Link Preview */}
        {linkedProduct &&
            linkVariantForm.data
                .product_variant_id && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                        Selected Existing Inventory
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                        {linkedProduct.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                        Product Code:{' '}
                        <span className="font-bold">
                            {linkedProduct.code}
                        </span>
                    </p>
                </div>
            )}

        <button
            type="submit"
            disabled={
                linkVariantForm.processing ||
                !linkProductId ||
                !linkVariantForm.data
                    .product_variant_id
            }
            className="
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-5
                py-3
                text-sm
                font-black
                text-white
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-50
            "
        >
            {linkVariantForm.processing && (
                    <LoaderCircle
                        size={18}
                        className="animate-spin"
                    />
                )}

                <span>
                    {linkVariantForm.processing
                        ? 'Linking...'
                        : 'Link Existing Variant'}
                </span>
        </button>
    </form>
</div>

            {selectedPurchaseOrderItem.merchandise_origin === 'new' && (
            <form
                onSubmit={
                    submitProductRegistration
                }
                className="mt-5 space-y-4"
            >

                
                {/* Product Name */}

                <div>
                    <label
                        className="
                            text-sm
                            font-bold
                            text-slate-700
                        "
                    >
                        Product Name
                    </label>

                    <input
                        type="text"
                        value={
                            registerProductForm
                                .data.name
                        }
                        onChange={(event) =>
                            registerProductForm
                                .setData(
                                    'name',
                                    event.target
                                        .value,
                                )
                        }
                        className="
                            mt-2
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            bg-white
                            px-4
                            py-3
                            text-sm
                            outline-none
                            focus:border-blue-500
                        "
                    />

                    {registerProductForm
                        .errors.name && (
                        <p
                            className="
                                mt-1
                                text-xs
                                font-semibold
                                text-red-600
                            "
                        >
                            {
                                registerProductForm
                                    .errors.name
                            }
                        </p>
                    )}
                </div>

                {/* Category */}

                <div>
                    <label
                        className="
                            text-sm
                            font-bold
                            text-slate-700
                        "
                    >
                        Category
                    </label>

                    <select
                        value={
                            registerProductForm
                                .data.category_id
                        }
                        onChange={(event) =>
                            registerProductForm
                                .setData(
                                    'category_id',
                                    event.target
                                        .value,
                                )
                        }
                        className="
                            mt-2
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            bg-white
                            px-4
                            py-3
                            text-sm
                            outline-none
                            focus:border-blue-500
                        "
                    >
                        <option value="">
                            Select category
                        </option>

                        {categories.map(
                            (category) => (
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

                    {registerProductForm
                        .errors.category_id && (
                        <p
                            className="
                                mt-1
                                text-xs
                                font-semibold
                                text-red-600
                            "
                        >
                            {
                                registerProductForm
                                    .errors
                                    .category_id
                            }
                        </p>
                    )}
                </div>

                {/* Purchasing Price */}

                {selectedPurchaseOrderItem?.unit_cost !=
                    null && (
                    <div
                        className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-slate-50
                            px-4
                            py-3
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
                            Purchasing Price
                            (from this PO item)
                        </p>

                        <p
                            className="
                                mt-1
                                text-lg
                                font-black
                                text-slate-900
                            "
                        >
                            {formatCurrency(
                                selectedPurchaseOrderItem.unit_cost,
                            )}
                        </p>

                        <p
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                            "
                        >
                            What PROWARE paid the
                            supplier for this item.
                            Use this as a reference
                            when setting the
                            Selling Price below.
                        </p>
                    </div>
                )}

                {/* Selling Price */}

                <div>
                    <label
                        className="
                            text-sm
                            font-bold
                            text-slate-700
                        "
                    >
                        Selling Price
                    </label>

                    <input
                        type="number"
                        min="0.01"
                        max="10000"
                        step="0.01"
                        value={
                            registerProductForm
                                .data.base_price
                        }
                        onChange={(event) =>
                            registerProductForm
                                .setData(
                                    'base_price',
                                    clampNumberInput(
                                        event.target
                                            .value,
                                        10000,
                                    ),
                                )
                        }
                        placeholder="0.00"
                        className="
                            mt-2
                            w-full
                            rounded-xl
                            border
                            border-slate-300
                            bg-white
                            px-4
                            py-3
                            text-sm
                            outline-none
                            focus:border-blue-500
                        "
                    />

                    {registerProductForm
                        .errors.base_price && (
                        <p
                            className="
                                mt-1
                                text-xs
                                font-semibold
                                text-red-600
                            "
                        >
                            {
                                registerProductForm
                                    .errors
                                    .base_price
                            }
                        </p>
                    )}
                </div>

                {/* Description */}

                <div>
                    <label
                        className="
                            text-sm
                            font-bold
                            text-slate-700
                        "
                    >
                        Description
                        <span
                            className="
                                ml-1
                                font-normal
                                text-slate-400
                            "
                        >
                            Optional
                        </span>
                    </label>

                    <textarea
                        rows={3}
                        value={
                            registerProductForm
                                .data.description
                        }
                        onChange={(event) =>
                            registerProductForm
                                .setData(
                                    'description',
                                    event.target
                                        .value,
                                )
                        }
                        className="
                            mt-2
                            w-full
                            resize-none
                            rounded-xl
                            border
                            border-slate-300
                            bg-white
                            px-4
                            py-3
                            text-sm
                            outline-none
                            focus:border-blue-500
                        "
                    />

                    {registerProductForm
                        .errors.description && (
                        <p
                            className="
                                mt-1
                                text-xs
                                font-semibold
                                text-red-600
                            "
                        >
                            {
                                registerProductForm
                                    .errors
                                    .description
                            }
                        </p>
                    )}
                </div>

{/* Product Image */}

<div>
    <label
        className="
            text-sm
            font-bold
            text-slate-700
        "
    >
        Product Image
    </label>

    <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) =>
            registerProductForm.setData(
                'image',
                event.target.files?.[0] ??
                    null,
            )
        }
        className="
            mt-2
            block
            w-full
            rounded-xl
            border
            border-slate-300
            bg-white
            px-4
            py-3
            text-sm
            text-slate-900
            file:mr-4
            file:rounded-lg
            file:border-0
            file:bg-blue-50
            file:px-4
            file:py-2
            file:text-sm
            file:font-bold
            file:text-blue-700
            hover:file:bg-blue-100
        "
    />

    <p className="mt-2 text-xs text-slate-500">
        Upload the product image that will be
        displayed in the PROWARE catalog.
    </p>

    {registerProductForm.errors.image && (
        <p
            className="
                mt-1
                text-xs
                font-semibold
                text-red-600
            "
        >
            {registerProductForm.errors.image}
        </p>
    )}
</div>


                {/* Inventory Structure */}

                <div
                    className="
                        rounded-xl
                        border
                        border-blue-200
                        bg-blue-50
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
                        Inventory Structure
                    </p>

                    <p
                        className="
                            mt-1
                            font-black
                            text-blue-950
                        "
                    >
                        Standard
                    </p>

                    <p
                        className="
                            mt-1
                            text-xs
                            leading-5
                            text-blue-700
                        "
                    >
                        This legacy PO line will
                        use one standard inventory
                        variant so its original
                        ordered quantity remains
                        accurate.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={
                        registerProductForm
                            .processing
                    }
                    className="
                        flex
                        w-full
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-blue-600
                        px-5
                        py-3
                        text-sm
                        font-black
                        text-white
                        transition
                        hover:bg-blue-700
                        disabled:cursor-not-allowed
                        disabled:opacity-60
                    "
                >
                    <PackagePlus
                        size={18}
                    />



                    {registerProductForm.processing ? (
                            <LoaderCircle
                                size={18}
                                className="animate-spin"
                            />
                        ) : (
                            <PackagePlus
                                size={18}
                            />
                        )}

                        <span>
                            {registerProductForm.processing
                                ? 'Registering...'
                                : 'Register as PROWARE Product'}
                        </span>
                </button>
                </form>
            )}
        </div>
    )}


                                        {activeSelectedVariant && (
                                            <div className="mt-5">
                                                <CurrentStockCard
                                                    selectedVariant={
                                                        activeSelectedVariant
                                                    }
                                                />
                                            </div>
                                        )}
                                    </section>
                                )}
                            </>
                    </div>

                    {/* Receive Form */}

                    <aside>
                        {isUnlinkedPurchaseOrderItem ? (
                            <div
                                className="
                                    rounded-3xl
                                    border
                                    border-amber-200
                                    bg-amber-50
                                    p-6
                                    shadow-sm
                                "
                            >
                                <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                                    Receiving Locked
                                </p>

                                <h3 className="mt-2 text-lg font-black text-amber-950">
                                    Link or register this item first
                                </h3>

                                <p className="mt-2 text-sm leading-6 text-amber-800">
                                    This purchase order item is not connected
                                    to a PROWARE inventory variant yet.
                                    Choose <span className="font-black">Link Existing Product</span>{' '}
                                    if the merchandise already exists, or{' '}
                                    <span className="font-black">Register New Product</span>{' '}
                                    if it is genuinely new merchandise.
                                </p>

                                <div className="mt-4 rounded-xl border border-amber-200 bg-white p-4">
                                    <p className="text-sm font-bold text-slate-900">
                                        Stock cannot be received until the PO item is linked.
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-slate-600">
                                        Linking or registering does not change inventory.
                                        The quantity on hand changes only after Receive Stock
                                        is submitted for the linked item.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ReceiveStockForm
                                form={form}
                                selectedVariant={
                                    activeSelectedVariant
                                }
                                maxReceivableQuantity={
                                    selectedPurchaseOrderItem
                                        ? selectedPurchaseOrderItem
                                            .quantity_remaining
                                        : null
                                }
                                onSubmit={
                                    submit
                                }
                            />
                        )}
                    </aside>
                </div>
            </div>
        </Layout>
    );
}

/*
|--------------------------------------------------------------------------
| Page Header
|--------------------------------------------------------------------------
*/

function PageHeader({
    currentRole,
}: {
    currentRole:
        string | null;
}) {
    const backUrl =
        currentRole ===
        'specialist'
            ? '/specialist/dashboard'
            : '/admin/purchase-orders';

    return (
        <div className="flex items-center gap-4">
            <Link
                href={backUrl}
                aria-label="Back"
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

            <div className="flex-1">
                <div className="flex items-center gap-3">
                    <div
                        className="
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-blue-100
                            text-blue-600
                        "
                    >
                        <PackagePlus
                            size={20}
                        />
                    </div>

                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Receive Stock
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Record delivered
                            merchandise and
                            update inventory
                            quantities.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Success Alert
|--------------------------------------------------------------------------
*/

interface SuccessAlertProps {
    message: string;
    onClose: () => void;
}

function SuccessAlert({
    message,
    onClose,
}: SuccessAlertProps) {
    return (
        <div
            className="
                rounded-2xl
                border
                border-emerald-200
                bg-emerald-50
                p-5
                shadow-2xl
                ring-1
                ring-black/5
            "
        >
            <div className="flex items-start gap-4">
                <div
                    className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-emerald-100
                        text-emerald-600
                    "
                >
                    <CheckCircle2
                        size={21}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-900">
                        {message.includes(
                            'COMPLETED',
                        ) ||
                        message.startsWith(
                            'Purchase Order Completed',
                        )
                            ? 'Purchase Order Completed'
                            : message.includes(
                                    'was linked to',
                                )
                              ? 'Product Linked Successfully'
                              : message.includes(
                                      'registered',
                                  )
                                ? 'Product Registered Successfully'
                                : 'Stock Received Successfully'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                        {message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss success message"
                    className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-emerald-700
                        transition
                        hover:bg-emerald-100
                    "
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Error Alert
|--------------------------------------------------------------------------
*/

interface ErrorAlertProps {
    message: string;
    onClose: () => void;
}

function ErrorAlert({
    message,
    onClose,
}: ErrorAlertProps) {
    return (
        <div
            className="
                rounded-2xl
                border
                border-red-200
                bg-red-50
                p-5
                shadow-2xl
                ring-1
                ring-black/5
            "
            role="alert"
        >
            <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-red-900">
                        Action Could Not Be Completed
                    </p>

                    <p className="mt-1 text-sm leading-6 text-red-800">
                        {message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Dismiss error message"
                    className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        text-red-700
                        transition
                        hover:bg-red-100
                    "
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Quantity Card
|--------------------------------------------------------------------------
*/

function QuantityCard({
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
                rounded-2xl
                border
                bg-white
                p-4
                ${
                    emphasized
                        ? 'border-blue-200'
                        : 'border-slate-200'
                }
            `}
        >
            <p
                className={`
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    ${
                        emphasized
                            ? 'text-blue-500'
                            : 'text-slate-400'
                    }
                `}
            >
                {label}
            </p>

            <p
                className={`
                    mt-2
                    text-2xl
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

/*
|--------------------------------------------------------------------------
| Find Selected Product
|--------------------------------------------------------------------------
*/

function findSelectedProduct(
    products:
        StockReceiptProduct[],
    selectedProductId:
        string,
): StockReceiptProduct | null {
    return (
        products.find(
            (product) =>
                String(
                    product.id,
                ) ===
                selectedProductId,
        ) ?? null
    );
}

/*
|--------------------------------------------------------------------------
| Find Variant Across Products
|--------------------------------------------------------------------------
*/

function findVariantAcrossProducts(
    products:
        StockReceiptProduct[],
    selectedVariantId:
        string,
): StockReceiptVariant | null {
    if (
        !selectedVariantId
    ) {
        return null;
    }

    for (
        const product
        of products
    ) {
        const variant =
            product.variants.find(
                (
                    productVariant,
                ) =>
                    String(
                        productVariant.id,
                    ) ===
                    selectedVariantId,
            );

        if (variant) {
            return variant;
        }
    }

    return null;
}

/*
|--------------------------------------------------------------------------
| Purchase Order Item Display Name
|--------------------------------------------------------------------------
*/

function getPurchaseOrderItemName(
    item: {
        product_name:
            string | null;

        manual_name:
            string | null;

        variant_name:
            string | null;

        program:
            string | null;

        size:
            string | null;
    },
): string {
    const baseName =
        item.product_name ??
        item.manual_name ??
        'Purchase Order Item';

    const variant =
        item.variant_name ??
        [
            item.program,
            item.size,
        ]
            .filter(Boolean)
            .join(' / ');

    if (!variant) {
        return baseName;
    }

    return `${baseName} — ${variant}`;
}

/*
|--------------------------------------------------------------------------
| Purchase Order Item Summary
|--------------------------------------------------------------------------
|
| So a purchase order with several products is still recognizable at a
| glance in a dropdown: the first item's name, then how many more, e.g.
| "Golden Jacket +4 more".
*/

function getPurchaseOrderItemSummary(
    items: {
        product_name:
            string | null;

        manual_name:
            string | null;
    }[],
): string | null {
    if (items.length === 0) {
        return null;
    }

    const firstName =
        items[0].product_name ??
        items[0].manual_name ??
        'Item';

    if (items.length === 1) {
        return firstName;
    }

    return `${firstName} +${items.length - 1} more`;
}

/*
|--------------------------------------------------------------------------
| Date
|--------------------------------------------------------------------------
*/

function nowDateTimeLocalValue(): string {
    const now = new Date();

    const pad = (value: number): string =>
        String(value).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function clampDateTimeLocalInput(
    value: string,
    min: string,
): string {
    if (!value) {
        return value;
    }

    return value < min ? min : value;
}

function formatDate(
    value:
        string | null,
): string {
    if (!value) {
        return 'Not set';
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        'en-PH',
        {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
        },
    ).format(date);
}

function formatCurrency(
    amount: string | number,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',
        },
    ).format(Number(amount));
}