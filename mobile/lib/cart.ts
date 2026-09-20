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
