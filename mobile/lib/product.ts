import type { AvailabilityStatus, CatalogEarlyBird } from './catalog';

export type ProductVariant = {
    id: number;
    sku: string;
    program: string | null;
    size: string | null;
    variant_name: string;
    variant_key: string;
    selling_price: string;
    is_available: boolean;
    stock_status: string;
};

export type ProductDetail = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    base_price: string;
    image_url: string | null;
    variant_mode: 'program_and_size' | 'size_only' | 'standard' | string;
    variant_mode_label: string;
    availability_status: AvailabilityStatus;
    availability_label: string;
    availability_summary: string;
    preorder_enabled: boolean;
    accepts_preorders: boolean;
    expected_release_date: string | null;
    category: { id: number; name: string };
    variants: ProductVariant[];
    price_min: string;
    price_max: string;
    stock_urgency: 'low_stock' | null;
    early_bird: CatalogEarlyBird | null;
};

export type ProductResponse = { data: ProductDetail };

export type AddToCartResponse = {
    message: string;
    data: { cart_total_quantity: number };
};

export function uniqueValues(values: (string | null)[]): string[] {
    return [...new Set(values.filter((value): value is string => !!value))];
}

/** The variant the student has chosen, following the website's rules. */
export function findSelectedVariant(
    product: ProductDetail,
    program: string,
    size: string,
): ProductVariant | null {
    if (product.variant_mode === 'program_and_size') {
        return (
            product.variants.find(
                (variant) => variant.program === program && variant.size === size,
            ) ?? null
        );
    }

    if (product.variant_mode === 'size_only') {
        return product.variants.find((variant) => variant.size === size) ?? null;
    }

    // Standard product: there is nothing to choose.
    return product.variants[0] ?? null;
}

export type ActionState =
    | 'add_to_cart'
    | 'preorder'
    | 'out_of_stock'
    | 'preorder_unavailable'
    | 'choose_options';

export function getActionState(
    product: ProductDetail,
    variant: ProductVariant | null,
): ActionState {
    if (product.availability_status === 'coming_soon') {
        return product.accepts_preorders ? 'preorder' : 'preorder_unavailable';
    }

    if (product.availability_status === 'out_of_stock') {
        return 'out_of_stock';
    }

    if (!variant) {
        return 'choose_options';
    }

    return variant.is_available ? 'add_to_cart' : 'out_of_stock';
}
