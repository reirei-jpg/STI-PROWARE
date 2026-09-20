export type CartItemData = {
    id: number;
    item_type: 'order' | 'preorder';
    quantity: number;
    unit_price: string;
    line_total: string;
    variant: {
        id: number;
        sku: string;
        program: string | null;
        size: string | null;
        variant_name: string;
    };
    product: {
        id: number;
        code: string;
        name: string;
        image_url: string | null;
        category: { id: number; name: string };
    };
};

export type CartData = {
    id: number | null;
    status: string;
    source: string;
    total_quantity: number;
    subtotal: string;
    items: CartItemData[];
};

export type CartResponse = { data: CartData };

export type CartChangeResponse = { message: string; data: CartData };

/** Same rule and wording as the product page and the server. */
export function quantityProblem(raw: string): string | null {
    const parsed = parseInt(raw, 10);

    if (Number.isNaN(parsed) || parsed < 1) {
        return 'The quantity must be at least 1.';
    }

    if (parsed > 99) {
        return 'You may add a maximum of 99 units.';
    }

    return null;
}

export type PaymentMethod = 'cash' | 'gcash' | 'maya';

export type CheckoutPayload = {
    confirmed: boolean;
    item_ids: number[];
    payment_method?: PaymentMethod;
    payment_reference?: string;
};

export type CheckoutResponse = {
    message: string;
    data: {
        order: {
            id: number;
            order_number: string;
            order_type: string;
            payment_method: PaymentMethod | null;
            payment_status: string;
            total: string;
        };
        cart: CartData;
    };
};

/** Same wording as the website and the server. */
export const MIXED_CHECKOUT_MESSAGE =
    'Normal merchandise and preorder merchandise cannot be submitted together.';

/**
 * Why the chosen items cannot be checked out, or null when they can. The
 * server enforces the same rules; this only spares a round trip.
 */
export function checkoutSelectionProblem(
    items: CartItemData[],
): string | null {
    if (items.length === 0) {
        return 'Please select at least one cart item.';
    }

    const hasPreorder = items.some((item) => item.item_type === 'preorder');
    const hasNormal = items.some((item) => item.item_type === 'order');

    return hasPreorder && hasNormal ? MIXED_CHECKOUT_MESSAGE : null;
}
