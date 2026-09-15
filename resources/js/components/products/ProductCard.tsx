import {
    CalendarDays,
    PackageOpen,
} from 'lucide-react';

import type {
    ReactNode,
} from 'react';

import ProductStatusBadge from '@/components/products/ProductStatusBadge';
import VariantBadge from '@/components/products/VariantBadge';

type VariantMode =
    | 'program_and_size'
    | 'size_only'
    | 'standard';

type AvailabilityStatus =
    | 'available'
    | 'coming_soon'
    | 'out_of_stock'
    | 'inactive';

interface ProductCategory {
    id: number;
    name: string;
}

interface ProductCreator {
    id: number;
    name: string;
}

export interface ProductCardProduct {
    id: number;
    code: string;
    name: string;
    description: string | null;
    base_price: string;

    variant_mode: VariantMode;
    variant_mode_label: string;
    variants_count: number;

    availability_status: AvailabilityStatus;
    availability_label: string;
    preorder_enabled: boolean;
    expected_release_date: string | null;

    image_url: string | null;
    is_active: boolean;

    category: ProductCategory;
    creator: ProductCreator;

    created_at: string;
}

interface ProductCardProps {
    product: ProductCardProduct;
    actions?: ReactNode;
    footer?: ReactNode;
}

export default function ProductCard({
    product,
    actions,
    footer,
}: ProductCardProps) {
    const showPreorderBadge =
        product.availability_status ===
            'coming_soon'
        && product.preorder_enabled;

    return (
        <article className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="relative">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-56 w-full object-cover"
                    />
                ) : (
                    <div className="flex h-56 w-full items-center justify-center bg-slate-100 text-slate-400">
                        <PackageOpen size={42} />
                    </div>
                )}

                <div className="absolute left-4 top-4">
                    <ProductStatusBadge
                        status={
                            product.availability_status
                        }
                        label={
                            product.availability_label
                        }
                    />
                </div>

                {showPreorderBadge && (
                    <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                        Preorders Enabled
                    </div>
                )}
            </div>

            <div className="space-y-5 p-6">
                <div>
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-blue-600">
                                {product.code}
                            </p>

                            <h2 className="mt-2 line-clamp-2 text-xl font-bold text-slate-900">
                                {product.name}
                            </h2>
                        </div>

                        <p className="shrink-0 text-lg font-black text-slate-900">
                            {formatCurrency(
                                product.base_price,
                            )}
                        </p>
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                        {product.category.name}
                    </p>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                        {product.description
                            ?? 'No description provided.'}
                    </p>
                </div>

                <VariantBadge
                    mode={product.variant_mode}
                    label={product.variant_mode_label}
                    variantsCount={
                        product.variants_count
                    }
                />

                {product.availability_status ===
                    'coming_soon'
                    && product.expected_release_date && (
                    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                        <CalendarDays
                            size={18}
                            className="shrink-0"
                        />

                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide">
                                Expected release
                            </p>

                            <p className="mt-0.5 text-sm font-semibold">
                                {
                                    product.expected_release_date
                                }
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                        <p className="text-xs text-slate-400">
                            Created by
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                            {product.creator.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            {product.created_at}
                        </p>
                    </div>

                    <div
                        className={`
                            rounded-full px-3 py-1
                            text-xs font-bold

                            ${
                                product.is_active
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600'
                            }
                        `}
                    >
                        {product.is_active
                            ? 'Active Record'
                            : 'Inactive Record'}
                    </div>
                </div>

                {actions && (
                    <div className="border-t border-slate-100 pt-5">
                        {actions}
                    </div>
                )}

                {footer && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        {footer}
                    </div>
                )}
            </div>
        </article>
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