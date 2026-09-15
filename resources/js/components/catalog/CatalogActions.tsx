import {
    Eye,
    PackagePlus,
    ShoppingCart,
    UserRoundPlus,
} from 'lucide-react';

import {
    Link,
} from '@inertiajs/react';

import type {
    CatalogProduct,
} from '@/components/catalog/CatalogCard';

type UserRole =
    | 'admin'
    | 'specialist'
    | 'cashier'
    | 'student';

interface CatalogActionsProps {
    product: CatalogProduct;
    role: UserRole;
}

export default function CatalogActions({
    product,
    role,
}: CatalogActionsProps) {
    if (role === 'admin') {
        return (
            <AdminCatalogActions
                product={product}
            />
        );
    }

    if (role === 'specialist') {
        return (
            <SpecialistCatalogActions
                product={product}
            />
        );
    }

    if (role === 'cashier') {
        return (
            <CashierCatalogActions
                product={product}
            />
        );
    }

    return (
        <StudentCatalogActions
            product={product}
        />
    );
}

interface RoleActionsProps {
    product: CatalogProduct;
}

function AdminCatalogActions({
    product,
}: RoleActionsProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Link
                href={`/catalog/${product.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
                <Eye size={17} />

                View Details
            </Link>

            <Link
                href={`/staff/stock-receipts/create?product=${product.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
                <PackagePlus size={17} />

                Receive Stock
            </Link>
        </div>
    );
}

function SpecialistCatalogActions({
    product,
}: RoleActionsProps) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Link
                href={`/catalog/${product.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
                <Eye size={17} />

                View Details
            </Link>

            <Link
    href={`/catalog/${product.id}`}
    className="
        inline-flex items-center
        justify-center gap-2
        rounded-xl bg-[#0D6EFD]
        px-4 py-3 text-sm
        font-bold text-white
        transition hover:bg-blue-700
    "
>
    <ShoppingCart size={17} />

    Choose Preorder Options
</Link>
        </div>
    );
}

function CashierCatalogActions({
    product,
}: RoleActionsProps) {
    return (
        <div className="grid gap-3">
            <Link
                href={`/catalog/${product.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
                <Eye size={17} />

                View Details
            </Link>
        </div>
    );
}

function StudentCatalogActions({
    product,
}: RoleActionsProps) {
    const viewDetails = (
        <Link
            href={`/catalog/${product.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
            <Eye size={17} />

            View Details
        </Link>
    );

    if (
        product.availability_status ===
        'coming_soon'
    ) {
        if (product.accepts_preorders) {
            return (
                <div className="grid gap-3 sm:grid-cols-2">
                    {viewDetails}

                    <DisabledAction
                        label="Preorder Soon"
                        icon={ShoppingCart}
                        emphasized
                    />
                </div>
            );
        }

        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {viewDetails}

                <DisabledAction
                    label="Coming Soon"
                    icon={ShoppingCart}
                />
            </div>
        );
    }

    if (
        product.availability_status ===
            'out_of_stock'
        || product.availability_summary ===
            'Currently Unavailable'
    ) {
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {viewDetails}

                <DisabledAction
                    label="Out of Stock"
                    icon={ShoppingCart}
                />
            </div>
        );
    }

    return (
    <div className="grid gap-3 sm:grid-cols-2">
        {viewDetails}

        <Link
            href={`/catalog/${product.id}`}
            className="
                inline-flex items-center
                justify-center gap-2
                rounded-xl bg-[#0D6EFD]
                px-4 py-3 text-sm
                font-bold text-white
                transition hover:bg-blue-700
            "
        >
            <ShoppingCart size={17} />

            Choose Options
        </Link>
    </div>
);
}

interface DisabledActionProps {
    label: string;
    icon: typeof Eye;
    emphasized?: boolean;
}

function DisabledAction({
    label,
    icon: Icon,
    emphasized = false,
}: DisabledActionProps) {
    return (
        <div
            title="This action will be enabled after the product details and ordering modules are built."
            className={`
                inline-flex cursor-not-allowed
                items-center justify-center gap-2
                rounded-xl px-4 py-3
                text-sm font-bold

                ${
                    emphasized
                        ? 'bg-blue-100 text-blue-400'
                        : 'border border-slate-200 bg-slate-50 text-slate-400'
                }
            `}
        >
            <Icon size={17} />

            {label}
        </div>
    );
}