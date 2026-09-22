import {
    Ban,
    CalendarDays,
    PackageOpen,
    Sparkles,
    TriangleAlert,
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
    | 'out_of_stock';

interface CatalogCategory {
    id: number;
    name: string;
}

export interface CatalogEarlyBird {
    discount_percent: string;
    remaining_slots: number;
}

export interface CatalogProduct {
    id: number;
    code: string;
    name: string;
    description: string | null;

    price_min: string;
    price_max: string;

    variant_mode: VariantMode;
    variant_mode_label: string;
    variants_count: number;

    availability_status: AvailabilityStatus;
    availability_label: string;
    availability_summary: string;

    stock_urgency: 'low_stock' | null;
    early_bird: CatalogEarlyBird | null;

    preorder_enabled: boolean;
    accepts_preorders: boolean;
    preorder_ends_at: string | null;
    preorder_days_remaining: number | null;
    expected_release_date: string | null;

    new_badge_duration_days: number | null;
    new_badge_started_at: string | null;

    restocked_badge_duration_days: number | null;
    restocked_badge_started_at: string | null;

    image_url: string | null;

    category: CatalogCategory;
}

interface CatalogCardProps {
    product: CatalogProduct;
    actions?: ReactNode;
}

export default function CatalogCard({
    product,
    actions,
}: CatalogCardProps) {
    const showPreorderBadge =
        product.availability_status ===
            'coming_soon'
        && product.accepts_preorders;

    const showNewBadge = (() => {
        if (
            !product.new_badge_started_at
            || !product.new_badge_duration_days
            || product.new_badge_duration_days <= 0
        ) {
            return false;
        }

        const startedAt =
            new Date(
                product.new_badge_started_at,
            );

        const expiresAt =
            new Date(startedAt);

        expiresAt.setDate(
            expiresAt.getDate()
            + product.new_badge_duration_days,
        );

        return new Date() < expiresAt;
    })();

    const showRestockedBadge = (() => {
        if (
            !product.restocked_badge_started_at
            || !product.restocked_badge_duration_days
            || product.restocked_badge_duration_days <= 0
        ) {
            return false;
        }

        const startedAt =
            new Date(
                product.restocked_badge_started_at,
            );

        const expiresAt =
            new Date(startedAt);

        expiresAt.setDate(
            expiresAt.getDate()
            + product.restocked_badge_duration_days,
        );

        return new Date() < expiresAt;
    })();

    const isOutOfStock =
        product.availability_status ===
        'out_of_stock';

    return (
        <article
            className={`
                overflow-hidden rounded-3xl border
                border-slate-100 bg-white shadow-sm

                ${
                    isOutOfStock
                        ? ''
                        : 'transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'
                }
            `}
        >
            <div className="relative">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className={`
                            h-60 w-full object-cover
                            ${isOutOfStock ? 'grayscale' : ''}
                        `}
                    />
                ) : (
                    <div className="flex h-60 w-full items-center justify-center bg-slate-100 text-slate-400">
                        <PackageOpen size={44} />
                    </div>
                )}

                {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm">
                            <Ban size={16} />

                            Temporarily Unavailable
                        </span>
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
                        Preorder Available
                    </div>
                )}

                {showNewBadge && (
                    <div className="absolute bottom-4 left-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm">
                        New
                    </div>
                )}

                {showRestockedBadge && (
                    <div className="absolute bottom-4 right-4 rounded-full bg-violet-600 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm">
                        Restocked
                    </div>
                )}
            </div>

            <div className="space-y-5 p-6">
                <div>
                    <p className="font-mono text-xs font-semibold uppercase tracking-wide text-blue-600">
                        {product.code}
                    </p>

                    <h2 className="mt-2 line-clamp-2 text-xl font-bold text-slate-900">
                        {product.name}
                    </h2>

                    <p className="mt-2 text-sm font-semibold text-slate-500">
                        {product.category.name}
                    </p>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                        {product.description
                            ?? 'No description provided.'}
                    </p>
                </div>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Price
                        </p>

                        <p className="mt-1 text-2xl font-black text-slate-900">
                            {formatPriceRange(
                                product.price_min,
                                product.price_max,
                            )}
                        </p>
                    </div>

                    {/*
                      * The image badge already shows the availability
                      * label; this pill only earns its space when it
                      * says something different (e.g. "Preorder
                      * Available" on a Coming Soon product).
                      */}
                    {product.availability_summary
                        !== product.availability_label && (
                        <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                            {
                                product.availability_summary
                            }
                        </div>
                    )}
                </div>

                {product.stock_urgency === 'low_stock' && (
                    <div className="flex items-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-orange-700">
                        <TriangleAlert
                            size={16}
                            className="shrink-0"
                        />

                        <p className="text-xs font-bold">
                            Only a few left
                        </p>
                    </div>
                )}

                {product.early_bird && (
                    <div className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-violet-700">
                        <Sparkles
                            size={16}
                            className="shrink-0"
                        />

                        <p className="text-xs font-bold">
                            {
                                product.early_bird
                                    .discount_percent
                            }% early-bird discount
                            &middot;{' '}
                            {
                                product.early_bird
                                    .remaining_slots
                            }{' '}
                            slot
                            {product.early_bird
                                .remaining_slots === 1
                                ? ''
                                : 's'}{' '}
                            left
                        </p>
                    </div>
                )}

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

                {isOutOfStock ? (
                    <div className="border-t border-slate-100 pt-5">
                        <div className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-400">
                            <Ban size={18} />

                            Currently Unavailable
                        </div>
                    </div>
                ) : (
                    actions && (
                        <div className="border-t border-slate-100 pt-5">
                            {actions}
                        </div>
                    )
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

function formatPriceRange(
    min: string,
    max: string,
): string {
    if (Number(min) === Number(max)) {
        return formatCurrency(min);
    }

    return `From ${formatCurrency(min)}`;
}