export type StockStatus =
    | 'out_of_stock'
    | 'low_stock'
    | 'in_stock';

export interface StockReceiptCategory {
    id: number;
    name: string;
}

export interface StockReceiptVariant {
    id: number;
    sku: string;
    program: string | null;
    size: string | null;
    variant_name: string | null;
    display_name: string;
    current_stock: number;
    reserved_stock: number;
    available_stock: number;
    reorder_level: number;
    stock_status: StockStatus;
}

export interface StockReceiptProduct {
    id: number;
    code: string;
    name: string;
    display_name: string;
    variant_mode:
        | 'program_and_size'
        | 'size_only'
        | 'standard';
    category: StockReceiptCategory;
    variants: StockReceiptVariant[];
}

export interface StockReceiptPurchaseOrderItem {
    id: number;

        item_type:
        | 'catalog'
        | 'manual';

        merchandise_origin:
            | 'new'
            | 'existing';

        product_variant_id:
            number | null;
    product_code:
        string | null;

    product_name:
        string | null;

    sku:
        string | null;

    variant_name:
        string | null;

    program:
        string | null;

    size:
        string | null;

    manual_name:
        string | null;

    manual_description:
        string | null;

    proposed_category_id:
        number | null;

    proposed_selling_price:
        string | number | null;

    manual_sku:
        string | null;

    track_inventory:
        boolean;

    quantity_ordered:
        number;

    quantity_received:
        number;

    quantity_remaining:
        number;

    /*
     * The price paid to the supplier for this item
     * (VAT-inclusive), entered when the purchase order
     * was created. Optional, since older/manual POs may
     * not have recorded it.
     */
    unit_cost:
        string | number | null;
}

export interface StockReceiptPurchaseOrder {
    id: number;

    po_number: string;

    supplier_name: string;

    supplier_reference_number:
        string | null;

    expected_delivery_date:
        string | null;

    status: string;

    items:
        StockReceiptPurchaseOrderItem[];
}


export interface StockReceiptPageProps {
    products: StockReceiptProduct[];

    purchaseOrders:
        StockReceiptPurchaseOrder[];

    categories:
        StockReceiptCategoryOption[];
}

    
export interface ReceiveStockFormData {
    purchase_order_id:
        string;

    purchase_order_item_id:
        string;

    product_variant_id:
        string;

    quantity:
        string;

    supplier_reference_number:
        string;

    notes:
        string;
}

export interface StockReceiptCategoryOption {
    id: number;
    name: string;
}