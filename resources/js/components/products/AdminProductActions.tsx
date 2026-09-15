import {
    Boxes,
    PackagePlus,
    Pencil,
} from 'lucide-react';

import {
    Link,
} from '@inertiajs/react';

import type {
    ProductCardProduct,
} from '@/components/products/ProductCard';

interface AdminProductActionsProps {
    product: ProductCardProduct;
}

export default function AdminProductActions({
    product,
}: AdminProductActionsProps) {
    return (
        <div
            className="
                grid
                gap-3
                sm:grid-cols-3
            "
            onClick={(
                event,
            ) => {
                event.stopPropagation();
            }}
        >
            {/* MANAGE VARIANTS */}
            <Link
                href={`/admin/products/${product.id}/variants`}
                onClick={(
                    event,
                ) => {
                    event.stopPropagation();
                }}
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
                    font-bold
                    text-blue-700
                    transition
                    hover:border-blue-300
                    hover:bg-blue-100
                "
            >
                <Boxes
                    size={17}
                />

                Manage Variants
            </Link>

            {/* EDIT PRODUCT */}
            <Link
                href={`/admin/products/${product.id}/edit`}
                onClick={(
                    event,
                ) => {
                    event.stopPropagation();
                }}
                className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-3
                    text-sm
                    font-bold
                    text-amber-700
                    transition
                    hover:border-amber-300
                    hover:bg-amber-100
                "
            >
                <Pencil
                    size={17}
                />

                Edit Product
            </Link>

            {/* RECEIVE STOCK */}
            <Link
                href={`/staff/stock-receipts/create?product=${product.id}`}
                onClick={(
                    event,
                ) => {
                    event.stopPropagation();
                }}
                className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#0D6EFD]
                    px-4
                    py-3
                    text-sm
                    font-bold
                    text-white
                    transition
                    hover:bg-blue-700
                "
            >
                <PackagePlus
                    size={17}
                />

                Receive Stock
            </Link>
        </div>
    );
}