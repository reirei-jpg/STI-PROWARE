export type OrderStatus = {
    key: string;
    label: string;
    description: string;
};

export type OrderSummary = {
    id: number;
    order_number: string;
    order_type: string;
    status: OrderStatus;
    payment_status: string;
    fulfillment_status: string;
    total: string;
    total_quantity: number;
    preview_item: {
        product_name: string;
        variant_name: string;
        quantity: number;
        image_url: string | null;
    } | null;
    additional_items_count: number;
    created_at: string | null;
};

export type OrderItemData = {
    id: number;
    product_name: string;
    variant_name: string;
    item_type: 'order' | 'preorder';
    preorder_status: string | null;
    preorder_payment_deadline_at: string | null;
    quantity: number;
    unit_price: string;
    line_total: string;
    image_url: string | null;
};

export type OrderDetail = OrderSummary & {
    payment_method: 'cash' | 'gcash' | 'maya' | null;
    subtotal: string;
    transaction_number: string | null;
    paid_at: string | null;
    ready_for_release_at: string | null;
    released_at: string | null;
    cancelled_at: string | null;
    qr: {
        kind: 'payment' | 'release' | null;
        title: string;
        message: string;
    };
    /** A ready preorder still needs its payment method submitted. */
    payment_method_needed: boolean;
    /** What is payable now (the ready preorder items). */
    payment_due_total: string;
    can_cancel: boolean;
    cancel_blocked_reason: string | null;
    cancel_until: string | null;
    cancellation: {
        reason: string | null;
        note: string | null;
        cancelled_by: string;
        refunded_at: string | null;
    } | null;
    items: OrderItemData[];
};

export type OrdersResponse = { data: OrderSummary[] };

export type OrderResponse = { data: OrderDetail };

export type OrderQrResponse = { data: { svg: string } };

export type OrderChangeResponse = { message: string; data: OrderDetail };

/*
 * Badge colors by status, as whole class names so NativeWind can see them.
 * Amber means waiting, blue means in progress, green means good news and
 * red means cancelled, like the website.
 */
const STATUS_BADGES: Record<string, { badge: string; text: string }> = {
    pending_payment: { badge: 'bg-amber-100', text: 'text-amber-700' },
    waiting_for_stock: { badge: 'bg-amber-100', text: 'text-amber-700' },
    ready_for_payment: { badge: 'bg-blue-100', text: 'text-blue-700' },
    payment_confirmed: { badge: 'bg-blue-100', text: 'text-blue-700' },
    preparing: { badge: 'bg-blue-100', text: 'text-blue-700' },
    ready_for_pickup: { badge: 'bg-emerald-100', text: 'text-emerald-700' },
    released: { badge: 'bg-emerald-100', text: 'text-emerald-700' },
    expired: { badge: 'bg-red-100', text: 'text-red-700' },
    cancelled: { badge: 'bg-red-100', text: 'text-red-700' },
};

export function statusBadge(key: string): { badge: string; text: string } {
    return STATUS_BADGES[key] ?? { badge: 'bg-slate-100', text: 'text-slate-700' };
}

export function paymentMethodName(
    method: OrderDetail['payment_method'],
): string {
    switch (method) {
        case 'cash':
            return 'Cash';
        case 'gcash':
            return 'GCash';
        case 'maya':
            return 'Maya';
        default:
            return 'Not chosen yet';
    }
}

export type PreorderItemData = {
    id: number;
    order_id: number;
    order_number: string;
    preorder_status: string | null;
    status: OrderStatus;
    /** A ready preorder that still needs its payment method submitted. */
    awaiting_payment_method: boolean;
    quantity: number;
    unit_price: string;
    line_total: string;
    preorder_ready_at: string | null;
    preorder_payment_deadline_at: string | null;
    product_name: string;
    variant_name: string;
    image_url: string | null;
};

export type PreordersResponse = { data: PreorderItemData[] };

/** Badge colors for a preorder's own status, like the website's. */
const PREORDER_BADGES: Record<string, { badge: string; text: string }> = {
    waiting: { badge: 'bg-amber-100', text: 'text-amber-700' },
    ready: { badge: 'bg-emerald-100', text: 'text-emerald-700' },
    paid: { badge: 'bg-blue-100', text: 'text-blue-700' },
    expired: { badge: 'bg-red-100', text: 'text-red-700' },
    cancelled: { badge: 'bg-red-100', text: 'text-red-700' },
};

export function preorderBadge(key: string): { badge: string; text: string } {
    return (
        PREORDER_BADGES[key] ?? { badge: 'bg-slate-100', text: 'text-slate-700' }
    );
}
