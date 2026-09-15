import {
    Boxes,
    Check,
    PackageSearch,
} from 'lucide-react';

import type {
    StockReceiptProduct,
} from '@/types/stock-receipt';

interface ProductSelectorProps {
    products: StockReceiptProduct[];
    selectedProductId: string;
    error?: string;
    onChange: (productId: string) => void;
}

export default function ProductSelector({
    products,
    selectedProductId,
    error,
    onChange,
}: ProductSelectorProps) {
    const selectedProduct =
        products.find(
            (product) =>
                String(product.id) ===
                selectedProductId,
        ) ?? null;

    return (
        <section className="space-y-5 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <PackageSearch size={21} />
                </div>

                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        Select Product
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Choose the product whose physical
                        stock was delivered.
                    </p>
                </div>
            </div>

            {products.length > 0 ? (
                <>
                    <div>
                        <label
                            htmlFor="product_id"
                            className="mb-2 block text-sm font-semibold text-slate-700"
                        >
                            Product
                        </label>

                        <select
                            id="product_id"
                            name="product_id"
                            value={selectedProductId}
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
                                Select product
                            </option>

                            {products.map(
                                (product) => (
                                    <option
                                        key={product.id}
                                        value={product.id}
                                    >
                                        {product.display_name}
                                    </option>
                                ),
                            )}
                        </select>

                        <ErrorMessage
                            message={error}
                        />
                    </div>

                    {selectedProduct && (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                        Selected product
                                    </p>

                                    <p className="mt-2 font-bold text-slate-900">
                                        {
                                            selectedProduct.name
                                        }
                                    </p>

                                    <p className="mt-1 font-mono text-sm text-slate-600">
                                        {
                                            selectedProduct.code
                                        }
                                    </p>
                                </div>

                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                                    <Check size={17} />
                                </div>
                            </div>

                            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                                <ProductDetail
                                    label="Category"
                                    value={
                                        selectedProduct
                                            .category.name
                                    }
                                />

                                <ProductDetail
                                    label="Active variants"
                                    value={String(
                                        selectedProduct
                                            .variants.length,
                                    )}
                                />
                            </dl>
                        </div>
                    )}
                </>
            ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                        <Boxes
                            size={20}
                            className="mt-0.5 shrink-0 text-amber-600"
                        />

                        <div>
                            <p className="font-semibold text-amber-900">
                                No products available
                            </p>

                            <p className="mt-1 text-sm leading-6 text-amber-800">
                                Create an active product with
                                at least one active variant
                                before receiving stock.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

interface ProductDetailProps {
    label: string;
    value: string;
}

function ProductDetail({
    label,
    value,
}: ProductDetailProps) {
    return (
        <div className="rounded-xl border border-blue-100 bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-blue-600">
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