
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    ArrowLeft,
    Barcode,
    GraduationCap,
    PackageOpen,
    Ruler,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Tag,
    Trash2,
    Clock3,
} from 'lucide-react';

import {
    useEffect,
    useState,
} from 'react';



import ActionNotification from '@/components/action-feedback/ActionNotification';
import ActionProcessingButton from '@/components/action-feedback/ActionProcessingButton';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';
import CatalogLayout from '@/layouts/CatalogLayout';



interface CartCategory {
    id: number;
    name: string;
}

interface CartProduct {
    id: number;
    code: string;
    name: string;
    preorder_early_bird_slots: number | null;
    preorder_early_bird_discount_percent: string | null;
    image_url: string | null;
    category: CartCategory;
}

interface CartVariant {
    id: number;
    sku: string;
    program: string | null;
    size: string | null;
    variant_name: string;
}

interface CartItem {
    id: number;
    item_type: 'order' | 'preorder';
    quantity: number;
    unit_price: string;
    line_total: string;
    variant: CartVariant;
    product: CartProduct;
}

interface Cart {
    id: number;
    status: string;
    source: string;
    total_quantity: number;
    subtotal: string;
    items: CartItem[];
}

interface CartIndexProps {
    cart: Cart | null;
}

export default function Index({
    cart,
}: CartIndexProps){



    const {
    processing,
    notification,
    startProcessing,
    showSuccess,
    showError,
    clearNotification,
} = useActionFeedback();


    const hasItems =
        cart !== null
        && cart.items.length > 0;

    const orderItems =
        cart?.items.filter(
            (item) => item.item_type === 'order',
        ) ?? [];

    const preorderItems =
        cart?.items.filter(
            (item) => item.item_type === 'preorder',
        ) ?? [];

    const [
        activeTab,
        setActiveTab,
    ] = useState<'order' | 'preorder'>(
        () =>
            orderItems.length > 0
            || preorderItems.length === 0
                ? 'order'
                : 'preorder',
    );

    const visibleItems =
        activeTab === 'order'
            ? orderItems
            : preorderItems;

        const [
            selectedItemIds,
            setSelectedItemIds,
        ] = useState<number[]>([]);

        const switchTab = (
            tab: 'order' | 'preorder',
        ) => {
            setActiveTab(tab);

            // Selections never carry meaning across tabs — order and
            // preorder items can never be checked out together anyway.
            setSelectedItemIds([]);
        };

        const toggleSelectedItem = (
            itemId: number,
        ) => {
            setSelectedItemIds(
                (current) =>
                    current.includes(itemId)
                        ? current.filter(
                            (id) =>
                                id !== itemId,
                        )
                        : [
                            ...current,
                            itemId,
                        ],
            );
        };


    const [
    itemToRemove,
    setItemToRemove,
] = useState<CartItem | null>(null);

const closeRemoveModal = () => {
    setItemToRemove(null);
};

const confirmRemoveItem = () => {
    if (!itemToRemove) {
        return;
    }

    startProcessing();

    router.delete(
        `/cart/items/${itemToRemove.id}`,
        {
            preserveScroll: true,

            onSuccess: () => {
                showSuccess(
                    `${itemToRemove.product.name} was removed from your cart.`,
                );

                closeRemoveModal();
            },

            onError: () => {
                showError(
                    'The item could not be removed from your cart.',
                );
            },
        },
    );
};

return (
    <CatalogLayout>
        <Head title="My Shopping Cart" />

        {notification && (
            <ActionNotification
                type={notification.type}
                message={notification.message}
                onClose={clearNotification}
            />
        )}

        {itemToRemove && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="remove-cart-item-title"
                onClick={closeRemoveModal}
            >
                <div
                    className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
                    onClick={(event) =>
                        event.stopPropagation()
                    }
                >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                        <Trash2 size={25} />
                    </div>

                    <h2
                        id="remove-cart-item-title"
                        className="mt-5 text-2xl font-black text-slate-900"
                    >
                        Remove cart item?
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                        You are about to remove{' '}
                        <span className="font-bold text-slate-900">
                            {itemToRemove.product.name}
                        </span>{' '}
                        from your shopping cart.
                    </p>

                    <div className="mt-5 flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                        {itemToRemove.product.image_url ? (
                            <img
                                src={
                                    itemToRemove.product
                                        .image_url
                                }
                                alt={
                                    itemToRemove.product.name
                                }
                                className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
                            />
                        ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-slate-300">
                                <PackageOpen size={25} />
                            </div>
                        )}

                        <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">
                                {
                                    itemToRemove.product
                                        .name
                                }
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                                {
                                    itemToRemove.variant
                                        .variant_name
                                }
                            </p>

                            <p className="mt-1 text-xs font-semibold text-blue-600">
                                Quantity:{' '}
                                {itemToRemove.quantity}
                            </p>
                        </div>
                    </div>

                    <p className="mt-4 text-xs leading-5 text-slate-400">
                        This removes the selected item only.
                        Other products in your cart will remain
                        unchanged.
                    </p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={closeRemoveModal}
                            disabled={processing}
                            className="
                                inline-flex items-center
                                justify-center rounded-xl
                                border border-slate-200
                                bg-white px-5 py-3.5
                                text-sm font-bold
                                text-slate-700
                                transition
                                hover:bg-slate-50
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            Keep Item
                        </button>

                        <ActionProcessingButton
                            type="button"
                            processing={processing}
                            onClick={confirmRemoveItem}
                            idleText="Remove Item"
                            processingText="Removing..."
                            className="
                                w-full
                                bg-red-600
                                text-white
                                hover:bg-red-700
                            "
                        />
                    </div>
                </div>
            </div>
        )}

        <div className="space-y-8">
            <CartHeader />

            {hasItems ? (
                <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <section>
                        <CartTabs
                            activeTab={activeTab}
                            onSwitchTab={switchTab}
                            orderCount={orderItems.length}
                            preorderCount={preorderItems.length}
                        />

                        {visibleItems.length > 0 ? (
                            <div className="mt-6 grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                                {visibleItems.map(
                                    (item) => (
                                        <CartItemCard
                                            key={item.id}
                                            item={item}
                                            selected={
                                                selectedItemIds.includes(
                                                    item.id,
                                                )
                                            }
                                            onToggleSelected={() =>
                                                toggleSelectedItem(
                                                    item.id,
                                                )
                                            }
                                            onRemove={() =>
                                                setItemToRemove(item)
                                            }
                                            onUpdateSuccess={showSuccess}
                                            onUpdateError={showError}
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <EmptyTab tab={activeTab} />
                        )}
                    </section>

                    <CartSummary
                        cart={cart}
                        selectedItemIds={
                            selectedItemIds
                        }
                    />
                </div>
            ) : (
                <EmptyCart />
            )}
        </div>
    </CatalogLayout>
);
}

function CartHeader() {
    return (
        <div className="flex items-center gap-4">
            <Link
                href="/catalog"
                aria-label="Back to catalog"
                className="
                    flex h-12 w-12 shrink-0
                    items-center justify-center
                    rounded-2xl border
                    border-slate-200
                    bg-white text-slate-600
                    shadow-sm transition
                    hover:border-blue-300
                    hover:bg-blue-50
                    hover:text-blue-700
                "
            >
                <ArrowLeft size={21} />
            </Link>

            <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
                    STI PROWARE
                </p>

                <h1 className="mt-1 text-3xl font-black text-slate-900">
                    My Shopping Cart
                </h1>
            </div>
        </div>
    );
}

interface CartItemCardProps {
    item: CartItem;
    selected: boolean;
    onToggleSelected: () => void;
    onRemove: () => void;
    onUpdateSuccess: (message: string) => void;
    onUpdateError: (message: string) => void;
}

function CartItemCard({
    item,
    selected,
    onToggleSelected,
    onRemove,
    onUpdateSuccess,
    onUpdateError,
}: CartItemCardProps) {


const [
    quantityProcessing,
    setQuantityProcessing,
] = useState(false);

const [
    quantityInput,
    setQuantityInput,
] = useState(
    String(item.quantity),
);

/*
|--------------------------------------------------------------------------
| Keep The Typed Value In Sync
|--------------------------------------------------------------------------
|
| The +/- buttons and a successful typed update both change
| item.quantity from the server. Re-sync the text field so it
| never shows a stale number.
|
*/

useEffect(() => {
    setQuantityInput(
        String(item.quantity),
    );
}, [item.quantity]);

            const updateQuantity = (
                nextQuantity: number,
            ) => {
                if (
                    quantityProcessing
                    || nextQuantity < 1
                    || nextQuantity > 99
                    || nextQuantity === item.quantity
                ) {
                    return;
                }

                setQuantityProcessing(true);

                router.patch(
                    `/cart/items/${item.id}`,
                    {
                        quantity: nextQuantity,
                    },
                    {
                        preserveScroll: true,

                        onSuccess: () => {
                            onUpdateSuccess(
                                `${item.product.name} quantity was updated.`,
                            );
                        },

                        onError: () => {
                            onUpdateError(
                                'The quantity could not be updated.',
                            );

                            setQuantityInput(
                                String(item.quantity),
                            );
                        },

                        onFinish: () => {
                            setQuantityProcessing(false);
                        },
                    },
                );
            };

const decreaseQuantity = () => {
    updateQuantity(
        item.quantity - 1,
    );
};

const increaseQuantity = () => {
    updateQuantity(
        item.quantity + 1,
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

const capQuantityInput = (
    rawValue: string,
): string => {
    if (rawValue === '') {
        return '';
    }

    const parsed = parseInt(rawValue, 10);

    if (Number.isNaN(parsed)) {
        return rawValue;
    }

    return parsed > 99 ? '99' : rawValue;
};

/*
|--------------------------------------------------------------------------
| Typed Quantity
|--------------------------------------------------------------------------
|
| The field is kept as free text while typing so clearing the
| current number does not immediately snap back before a new
| number can be entered. It is only clamped and sent to the
| server once the student leaves the field.
|
*/

const commitTypedQuantity = () => {
    const parsed =
        parseInt(quantityInput, 10);

    if (Number.isNaN(parsed)) {
        setQuantityInput(
            String(item.quantity),
        );

        return;
    }

    const clamped =
        Math.min(
            99,
            Math.max(1, parsed),
        );

    setQuantityInput(
        String(clamped),
    );

    updateQuantity(clamped);
};


    
    
    
    
    return (
        <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={onToggleSelected}
                            aria-label={`Select ${item.product.name}`}
                            className="
                                h-5 w-5 cursor-pointer
                                rounded border-slate-300
                                accent-blue-600
                            "
                        />

                        <p className="font-mono text-xs font-black uppercase tracking-wide text-blue-600">
                            {item.product.code}
                        </p>
                    </div>

                    <ItemTypeBadge
                        type={item.item_type}
                    />
                </div>

            <div className="mt-3 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                {item.product.image_url ? (
                    <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-full w-full object-contain p-4"
                    />
                ) : (
                    <PackageOpen
                        size={48}
                        className="text-slate-300"
                    />
                )}
            </div>

            <div className="mt-5">
                <h2 className="line-clamp-2 text-xl font-black text-slate-900">
                    {item.product.name}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                    {item.product.category.name}
                </p>
            </div>

            <VariantDetails
                item={item}
            />

            <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Quantity
                </p>

                <div className="mt-2 inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
    <button
        type="button"
        onClick={
            decreaseQuantity
        }
        disabled={
            quantityProcessing
            || item.quantity <= 1
        }
        aria-label={`Decrease ${item.product.name} quantity`}
        className="
            flex h-11 w-11
            items-center justify-center
            text-lg font-bold
            text-slate-600
            transition
            hover:bg-slate-100
            disabled:cursor-not-allowed
            disabled:text-slate-300
        "
    >
        −
    </button>

            {quantityProcessing ? (
                <span className="flex h-11 min-w-14 items-center justify-center border-x border-slate-200 px-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                </span>
            ) : (
                <input
                    type="number"
                    min={1}
                    max={99}
                    inputMode="numeric"
                    value={quantityInput}
                    aria-label={`${item.product.name} quantity`}
                    onChange={(event) =>
                        setQuantityInput(
                            capQuantityInput(
                                event.target.value,
                            ),
                        )
                    }
                    onBlur={
                        commitTypedQuantity
                    }
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();

                            (
                                event.target as HTMLInputElement
                            ).blur();
                        }
                    }}
                    className="
                        h-11 min-w-14
                        border-x border-slate-200
                        px-3 text-center
                        text-sm font-black
                        text-slate-900
                        outline-none
                        focus:bg-blue-50
                    "
                />
            )}

                <button
                    type="button"
                    onClick={increaseQuantity}
                    disabled={quantityProcessing}
                    aria-label={`Increase ${item.product.name} quantity`}
                    className="
                        flex h-11 w-11
                        items-center justify-center
                        text-lg font-bold
                        text-slate-600
                        transition
                        hover:bg-slate-100
                        disabled:cursor-not-allowed
                        disabled:text-slate-300
                    "
                >
                    +
                </button>
</div>  
            </div>

                    {item.item_type === 'preorder'
                        && Number(
                            item.product
                                .preorder_early_bird_slots,
                        ) > 0
                        && Number(
                            item.product
                                .preorder_early_bird_discount_percent,
                        ) > 0 && (
                            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-sm font-black text-amber-800">
                                    Early Bird Discount Available
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                    Get{' '}
                                    <span className="font-black">
                                        {Number(
                                            item.product
                                                .preorder_early_bird_discount_percent,
                                        )}%
                                    </span>{' '}
                                    off if your preorder qualifies for one of the first{' '}
                                    <span className="font-black">
                                        {
                                            item.product
                                                .preorder_early_bird_slots
                                        }
                                    </span>{' '}
                                    early-bird slots.
                                </p>
                            </div>
                        )}

            <div className="mt-auto pt-6">
                <div className="flex items-end justify-between gap-5 border-t border-slate-100 pt-5">
                    <div>
                        <p className="text-xs text-slate-400">
                            Unit price
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-700">
                            {formatCurrency(
                                item.unit_price,
                            )}
                        </p>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-slate-400">
                            Line total
                        </p>

                        <p className="mt-1 text-xl font-black text-slate-900">
                            {formatCurrency(
                                item.line_total,
                            )}
                        </p>
                    </div>
                </div>

                <button
    type="button"
    onClick={onRemove}
    className="
        mt-5 inline-flex w-full
        items-center justify-center
        gap-2 rounded-xl
        border border-red-200
        bg-red-50
        px-4 py-3
        text-sm font-bold
        text-red-600
        transition
        hover:bg-red-100
    "
>
    <Trash2 size={17} />

    Remove
</button>
            </div>
        </article>
    );
}

interface ItemTypeBadgeProps {
    type: CartItem['item_type'];
}

function ItemTypeBadge({
    type,
}: ItemTypeBadgeProps) {
    const preorder =
        type === 'preorder';

    return (
        <span
            className={`
                inline-flex shrink-0
                rounded-full px-3 py-1
                text-xs font-bold

                ${
                    preorder
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                }
            `}
        >
            {preorder
                ? 'Preorder'
                : 'Order'}
        </span>
    );
}

interface VariantDetailsProps {
    item: CartItem;
}

function VariantDetails({
    item,
}: VariantDetailsProps) {
    return (
        <div className="mt-5 space-y-4 rounded-2xl bg-slate-50 p-4">
            <DetailRow
                icon={Tag}
                label="Variant"
                value={
                    item.variant.variant_name
                }
            />

            <DetailRow
                icon={Barcode}
                label="SKU"
                value={item.variant.sku}
            />

            {item.variant.program && (
                <DetailRow
                    icon={GraduationCap}
                    label="Program"
                    value={
                        item.variant.program
                    }
                />
            )}

            {item.variant.size && (
                <DetailRow
                    icon={Ruler}
                    label="Size"
                    value={item.variant.size}
                />
            )}
        </div>
    );
}

interface DetailRowProps {
    icon: typeof Tag;
    label: string;
    value: string;
}

function DetailRow({
    icon: Icon,
    label,
    value,
}: DetailRowProps) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <Icon size={16} />
            </div>

            <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {label}
                </p>

                <p className="mt-1 break-words text-sm font-bold text-slate-800">
                    {value}
                </p>
            </div>
        </div>
    );
}

interface CartSummaryProps {
    cart: Cart;
    selectedItemIds: number[];
}

function CartSummary({
    cart,
    selectedItemIds,
}: CartSummaryProps) {

    const selectedItems =
        selectedItemIds.length > 0
            ? cart.items.filter(
                (item) =>
                    selectedItemIds.includes(
                        item.id,
                    ),
            )
            : [];

const hasPreorderItems =
    selectedItems.some(
        (item) =>
            item.item_type ===
            'preorder',
    );

const hasNormalItems =
    selectedItems.some(
        (item) =>
            item.item_type ===
            'order',
    );

    const hasSelectedItems =
    selectedItems.length > 0;

    const hasMixedItems =
    hasPreorderItems &&
    hasNormalItems;

const preorderOnly =
    hasPreorderItems &&
    !hasNormalItems;

    

    return (
        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-28">
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                    <ShoppingCart size={25} />
                </div>

                <div>
                    <h2 className="text-xl font-black text-slate-900">
                        Order Summary
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        Review your items
                    </p>
                </div>
            </div>

            <dl className="mt-7 space-y-5">
                <SummaryRow
                    label="Total items"
                    value={String(
                        cart.items.length,
                    )}
                />

                <SummaryRow
                    label="Total quantity"
                    value={String(
                        cart.total_quantity,
                    )}
                />

                <div className="border-t border-slate-100 pt-5">
                    <SummaryRow
                        label="Subtotal"
                        value={formatCurrency(
                            cart.subtotal,
                        )}
                        emphasized
                    />
                </div>
            </dl>

{!hasSelectedItems ? (
    <button
        type="button"
        disabled
        className="
            mt-7 flex w-full
            cursor-not-allowed
            items-center justify-center
            gap-2 rounded-xl
            bg-slate-300
            px-5 py-4
            text-sm font-bold
            text-slate-500
        "
    >
        <ShoppingBag size={18} />

        Select an Item
    </button>
) : hasMixedItems ? (
            <div className="mt-7">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-black text-red-800">
                        Separate Order and Preorder Items
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                        Normal merchandise and preorder merchandise
                        cannot be submitted together.
                        Remove one type from your cart first.
                    </p>
                </div>

                <button
                    type="button"
                    disabled
                    className="
                        mt-3 flex w-full
                        cursor-not-allowed
                        items-center justify-center
                        gap-2 rounded-xl
                        bg-slate-300
                        px-5 py-4
                        text-sm font-bold
                        text-slate-500
                    "
                >
                    <ShoppingBag size={18} />

                    Checkout Unavailable
                </button>
            </div>
        ) : preorderOnly ? (
            <div className="mt-7">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                        <Clock3
                            size={20}
                            className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>
                            <p className="text-sm font-black text-amber-800">
                                Preorder Request
                            </p>

                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                No payment is required now.
                                Submit your preorder to join
                                the waiting list. You will be
                                notified when stock becomes
                                available.
                            </p>
                        </div>
                    </div>
                </div>

                <Link
                    href={`/checkout?items=${selectedItemIds.join(',')}`}
                    className="
                        mt-3 flex w-full
                        items-center justify-center
                        gap-2 rounded-xl
                        bg-amber-500
                        px-5 py-4
                        text-sm font-bold
                        text-white transition
                        hover:bg-amber-600
                    "
                >
                    <ShoppingBag size={18} />

                    Review & Submit Preorder
                </Link>
            </div>
        ) : (
            <Link
                href={`/checkout?items=${selectedItemIds.join(',')}`}
                className="
                    mt-7 flex w-full
                    items-center justify-center
                    gap-2 rounded-xl
                    bg-[#0D6EFD]
                    px-5 py-4
                    text-sm font-bold
                    text-white transition
                    hover:bg-blue-700
                "
            >
                <ShoppingBag size={18} />

                Proceed to Checkout
            </Link>
        )}

            <Link
                href="/catalog"
                className="
                    mt-3 flex w-full
                    items-center justify-center
                    gap-2 rounded-xl
                    border border-slate-200
                    bg-white px-5 py-4
                    text-sm font-bold
                    text-slate-700
                    transition hover:border-blue-300
                    hover:bg-blue-50
                    hover:text-blue-700
                "
            >
                <ArrowLeft size={18} />

                Continue Shopping
            </Link>

            <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <ShieldCheck size={20} />
                </div>

                <div>
                    <p className="text-sm font-bold text-slate-800">
                        Secure checkout
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        Stock, prices, and product availability will be checked again before your order is created.
                    </p>
                </div>
            </div>
        </aside>
    );
}

function EmptyCart() {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <ShoppingBag
                size={48}
                className="mx-auto text-slate-300"
            />

            <h2 className="mt-5 text-xl font-black text-slate-800">
                Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Browse the merchandise catalog and choose the correct program, size, and quantity.
            </p>

            <Link
                href="/catalog"
                className="
                    mt-6 inline-flex
                    items-center justify-center
                    rounded-xl bg-[#0D6EFD]
                    px-5 py-3 text-sm
                    font-bold text-white
                    transition hover:bg-blue-700
                "
            >
                Browse Merchandise
            </Link>
        </section>
    );
}

interface CartTabsProps {
    activeTab: 'order' | 'preorder';
    onSwitchTab: (tab: 'order' | 'preorder') => void;
    orderCount: number;
    preorderCount: number;
}

function CartTabs({
    activeTab,
    onSwitchTab,
    orderCount,
    preorderCount,
}: CartTabsProps) {
    return (
        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
                type="button"
                onClick={() => onSwitchTab('order')}
                className={`
                    flex items-center gap-2 rounded-xl px-5 py-2.5
                    text-sm font-black transition
                    ${
                        activeTab === 'order'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }
                `}
            >
                Orders

                <span
                    className={`
                        rounded-full px-2 py-0.5 text-xs
                        ${
                            activeTab === 'order'
                                ? 'bg-white/20'
                                : 'bg-slate-100'
                        }
                    `}
                >
                    {orderCount}
                </span>
            </button>

            <button
                type="button"
                onClick={() => onSwitchTab('preorder')}
                className={`
                    flex items-center gap-2 rounded-xl px-5 py-2.5
                    text-sm font-black transition
                    ${
                        activeTab === 'preorder'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }
                `}
            >
                Preorders

                <span
                    className={`
                        rounded-full px-2 py-0.5 text-xs
                        ${
                            activeTab === 'preorder'
                                ? 'bg-white/20'
                                : 'bg-slate-100'
                        }
                    `}
                >
                    {preorderCount}
                </span>
            </button>
        </div>
    );
}

function EmptyTab({
    tab,
}: {
    tab: 'order' | 'preorder';
}) {
    return (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            {tab === 'order' ? (
                <ShoppingBag
                    size={40}
                    className="mx-auto text-slate-300"
                />
            ) : (
                <Clock3
                    size={40}
                    className="mx-auto text-slate-300"
                />
            )}

            <h3 className="mt-4 text-lg font-black text-slate-800">
                {tab === 'order'
                    ? 'No normal orders in your cart'
                    : 'No preorders in your cart'}
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {tab === 'order'
                    ? "You have preorder items waiting in the Preorders tab, but nothing here that's available right now."
                    : "You have items available now in the Orders tab, but nothing waiting on a future restock here."}
            </p>
        </div>
    );
}

interface SummaryRowProps {
    label: string;
    value: string;
    emphasized?: boolean;
}

function SummaryRow({
    label,
    value,
    emphasized = false,
}: SummaryRowProps) {
    return (
        <div className="flex items-center justify-between gap-4">
            <dt
                className={
                    emphasized
                        ? 'font-bold text-slate-800'
                        : 'text-sm font-semibold text-slate-600'
                }
            >
                {label}
            </dt>

            <dd
                className={
                    emphasized
                        ? 'text-xl font-black text-slate-900'
                        : 'text-sm font-black text-slate-900'
                }
            >
                {value}
            </dd>
        </div>
    );
}

function formatCurrency(
    amount: string,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',
        },
    ).format(
        Number(amount),
    );
}