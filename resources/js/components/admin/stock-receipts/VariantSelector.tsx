import {
    Boxes,
    Check,
    Layers3,
} from 'lucide-react';

import type {
    StockReceiptProduct,
    StockReceiptVariant,
} from '@/types/stock-receipt';

interface VariantSelectorProps {
    selectedProduct: StockReceiptProduct | null;
    selectedVariantId: string;
    error?: string;
    onChange: (variantId: string) => void;
}

export default function VariantSelector({
    selectedProduct,
    selectedVariantId,
    error,
    onChange,
}: VariantSelectorProps) {
    const selectedVariant =
        selectedProduct?.variants.find(
            (variant) =>
                String(variant.id) ===
                selectedVariantId,
        ) ?? null;

    return (
        <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Layers3 size={21} />
                </div>

                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        Select Variant
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Choose the exact program, size,
                        or standard variant that received stock.
                    </p>
                </div>
            </div>

            {!selectedProduct && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-600">
                        Select a product first to view its
                        available variants.
                    </p>
                </div>
            )}

            {selectedProduct &&
                selectedProduct.variants.length === 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-start gap-3">
                            <Boxes
                                size={20}
                                className="mt-0.5 shrink-0 text-amber-600"
                            />

                            <div>
                                <p className="font-semibold text-amber-900">
                                    No active variants
                                </p>

                                <p className="mt-1 text-sm leading-6 text-amber-800">
                                    This product currently has no
                                    active variant available for
                                    stock receiving.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

            {selectedProduct &&
                selectedProduct.variants.length > 0 && (
                    <>
                        <div>
                            <label
                                htmlFor="product_variant_id"
                                className="mb-2 block text-sm font-semibold text-slate-700"
                            >
                                Product variant
                            </label>

                            <select
                                id="product_variant_id"
                                name="product_variant_id"
                                value={selectedVariantId}
                                onChange={(event) =>
                                    onChange(
                                        event.target.value,
                                    )
                                }
                                className={inputClasses(
                                    Boolean(error),
                                )}
                            >
                                <option value="">
                                    Select variant
                                </option>

                                {selectedProduct.variants.map(
                                    (variant) => (
                                        <option
                                            key={variant.id}
                                            value={variant.id}
                                        >
                                            {buildVariantOptionLabel(
                                                variant,
                                            )}
                                        </option>
                                    ),
                                )}
                            </select>

                            <ErrorMessage
                                message={error}
                            />
                        </div>

                        {selectedVariant && (
                            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                                            Selected variant
                                        </p>

                                        <p className="mt-2 font-bold text-slate-900">
                                            {
                                                selectedVariant.display_name
                                            }
                                        </p>

                                        <p className="mt-1 font-mono text-sm text-slate-600">
                                            {
                                                selectedVariant.sku
                                            }
                                        </p>
                                    </div>

                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                                        <Check size={17} />
                                    </div>
                                </div>

                                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <VariantDetail
                                        label="Program"
                                        value={
                                            selectedVariant.program ??
                                            'Not applicable'
                                        }
                                    />

                                    <VariantDetail
                                        label="Size"
                                        value={
                                            selectedVariant.size ??
                                            'Not applicable'
                                        }
                                    />
                                </dl>
                            </div>
                        )}
                    </>
                )}
        </section>
    );
}

interface VariantDetailProps {
    label: string;
    value: string;
}

function VariantDetail({
    label,
    value,
}: VariantDetailProps) {
    return (
        <div className="rounded-xl border border-violet-100 bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                {label}
            </dt>

            <dd className="mt-1 text-sm font-semibold text-slate-800">
                {value}
            </dd>
        </div>
    );
}

interface ErrorMessageProps {
    message?: string;
}

function ErrorMessage({
    message,
}: ErrorMessageProps) {
    if (!message) {
        return null;
    }

    return (
        <p className="mt-2 text-sm text-red-600">
            {message}
        </p>
    );
}

function buildVariantOptionLabel(
    variant: StockReceiptVariant,
): string {
    return `${variant.display_name} — ${variant.sku}`;
}

function inputClasses(
    hasError: boolean,
): string {
    return `
        w-full rounded-xl border
        bg-transparent px-4 py-3.5
        text-sm text-slate-900
        outline-none transition
        placeholder:text-slate-400

        ${
            hasError
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-slate-300 focus:border-[#0D6EFD] focus:ring-4 focus:ring-blue-100'
        }
    `;
}