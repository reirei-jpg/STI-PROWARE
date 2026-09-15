import {
    FileText,
    LoaderCircle,
    PackagePlus,
    ReceiptText,
} from 'lucide-react';

import type {
    FormEvent,
} from 'react';

import type {
    InertiaFormProps,
} from '@inertiajs/react';

import type {
    ReceiveStockFormData,
    StockReceiptVariant,
} from '@/types/stock-receipt';

interface ReceiveStockFormProps {
    form: InertiaFormProps<ReceiveStockFormData>;

    selectedVariant:
        StockReceiptVariant | null;

    maxReceivableQuantity?:
        number | null;

    onSubmit: (
        event: FormEvent<HTMLFormElement>,
    ) => void;
}

export default function ReceiveStockForm({
    form,
    selectedVariant,
    maxReceivableQuantity = null,
    onSubmit,
}: ReceiveStockFormProps) {


    const quantityReceived =
        parsePositiveInteger(
            form.data.quantity,
        );

const exceedsRemainingQuantity =
    maxReceivableQuantity !== null
    && quantityReceived >
        maxReceivableQuantity;

const hasValidQuantity =
    quantityReceived >= 1
    && !exceedsRemainingQuantity;

    const projectedQuantityOnHand =
    selectedVariant
        && hasValidQuantity
        ? selectedVariant.current_stock
            + quantityReceived
        : 0;

        const projectedAvailableQuantity =
            selectedVariant
                ? Math.max(
                    0,
                    projectedQuantityOnHand
                        - selectedVariant.reserved_stock,
                )
                : 0;

    const canSubmit =
        selectedVariant !== null
        && hasValidQuantity
        && !form.processing;

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-6"
        >
            <section className="space-y-6 rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <PackagePlus size={21} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Receive Stock
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Enter the quantity delivered and
                            optional supporting information.
                        </p>
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="quantity"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        Quantity received
                    </label>

                    <input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        max={
                            maxReceivableQuantity
                                ?? 1000000
                        }
                        step="1"
                        inputMode="numeric"
                        value={
                            form.data.quantity
                        }
                        onChange={(event) => {
                            form.setData(
                                'quantity',
                                event.target.value,
                            );

                            form.clearErrors(
                                'quantity',
                            );
                        }}
                        placeholder="Enter quantity"
                        disabled={
                            ! selectedVariant
                            || form.processing
                        }
                        className={inputClasses(
                            Boolean(
                                form.errors.quantity,
                            ),
                        )}
                    />

                    <ErrorMessage
                        message={
                            form.errors.quantity
                        }
                    />

                    {exceedsRemainingQuantity && (
                        <p className="mt-2 text-sm font-semibold text-red-600">
                            Cannot receive more than{' '}
                            {formatQuantity(
                                maxReceivableQuantity!,
                            )}{' '}
                            unit(s). Only{' '}
                            {formatQuantity(
                                maxReceivableQuantity!,
                            )}{' '}
                            remain on this purchase order item.
                        </p>
                    )}

                    {!selectedVariant && (
                        <p className="mt-2 text-xs text-slate-500">
                            Select a product variant before
                            entering the received quantity.
                        </p>
                    )}
                </div>

                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <ReceiptText
                            size={16}
                            className="text-slate-500"
                        />

                        <label
                            htmlFor="supplier_reference_number"
                            className="text-sm font-semibold text-slate-700"
                        >
                            Supplier reference number
                        </label>

                        <span className="text-xs text-slate-400">
                            Optional
                        </span>
                    </div>

                    <input
                        id="supplier_reference_number"
                        name="supplier_reference_number"
                        type="text"
                        maxLength={100}
                        value={
                            form.data
                                .supplier_reference_number
                        }
                        onChange={(event) => {
                            form.setData(
                                'supplier_reference_number',
                                event.target.value,
                            );

                            form.clearErrors(
                                'supplier_reference_number',
                            );
                        }}
                        placeholder="DR-2026-0012, PO-00418, or INV-93211"
                        disabled={form.processing}
                        className={inputClasses(
                            Boolean(
                                form.errors
                                    .supplier_reference_number,
                            ),
                        )}
                    />

                    <div className="mt-2 flex items-start justify-between gap-4">
                        <ErrorMessage
                            message={
                                form.errors
                                    .supplier_reference_number
                            }
                        />

                        <p className="ml-auto text-xs text-slate-400">
                            {
                                form.data
                                    .supplier_reference_number
                                    .length
                            }
                            /100
                        </p>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                        Enter the number printed on the
                        delivery receipt, purchase order,
                        invoice, or supplier document.
                    </p>
                </div>

                <div>
                    <div className="mb-2 flex items-center gap-2">
                        <FileText
                            size={16}
                            className="text-slate-500"
                        />

                        <label
                            htmlFor="notes"
                            className="text-sm font-semibold text-slate-700"
                        >
                            Notes
                        </label>

                        <span className="text-xs text-slate-400">
                            Optional
                        </span>
                    </div>

                    <textarea
                        id="notes"
                        name="notes"
                        rows={5}
                        maxLength={1000}
                        value={
                            form.data.notes
                        }
                        onChange={(event) => {
                            form.setData(
                                'notes',
                                event.target.value,
                            );

                            form.clearErrors(
                                'notes',
                            );
                        }}
                        placeholder="Add delivery details, supplier information, or inspection notes."
                        disabled={form.processing}
                        className={`
                            ${inputClasses(
                                Boolean(
                                    form.errors.notes,
                                ),
                            )}
                            resize-none
                        `}
                    />

                    <div className="mt-2 flex items-start justify-between gap-4">
                        <ErrorMessage
                            message={
                                form.errors.notes
                            }
                        />

                        <p className="ml-auto text-xs text-slate-400">
                            {
                                form.data.notes.length
                            }
                            /1000
                        </p>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                    Receipt Preview
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Review the projected inventory result
                    before submitting.
                </p>

                <dl className="mt-5 space-y-4">
                    <SummaryRow
                        label="Selected variant"
                        value={
                            selectedVariant
                                ?.display_name
                            ?? 'Not selected'
                        }
                    />

                    <SummaryRow
                        label="Current quantity"
                        value={
                            selectedVariant
                                ? formatQuantity(
                                      selectedVariant.current_stock,
                                  )
                                : '—'
                        }
                    />

                    <SummaryRow
                        label="Quantity received"
                        value={
                            exceedsRemainingQuantity
                                ? 'Invalid'
                                : quantityReceived > 0
                                ? `+${formatQuantity(
                                        quantityReceived,
                                    )}`
                                : '—'
                        }
                    />

                    <SummaryRow
                        label="New quantity on hand"
                        value={
                            selectedVariant
                            && hasValidQuantity
                                ? formatQuantity(
                                    projectedQuantityOnHand,
                                )
                                : '—'
                        }
                    />

                    <SummaryRow
                        label="Projected available"
                        value={
                            selectedVariant
                            && hasValidQuantity
                                ? formatQuantity(
                                    projectedAvailableQuantity,
                                )
                                : '—'
                        }
                    />

                    <SummaryRow
                        label="Supplier reference"
                        value={
                            form.data
                                .supplier_reference_number
                                .trim()
                            || 'Not provided'
                        }
                    />
                </dl>
            </section>

            <button
                type="submit"
                disabled={!canSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {form.processing ? (
                    <LoaderCircle
                        size={20}
                        className="animate-spin"
                    />
                ) : (
                    <PackagePlus size={20} />
                )}

                <span>
                    {form.processing
                        ? 'Receiving Stock...'
                        : 'Receive Stock'}
                </span>
            </button>
        </form>
    );
}

interface SummaryRowProps {
    label: string;
    value: string;
}

function SummaryRow({
    label,
    value,
}: SummaryRowProps) {
    return (
        <div className="flex items-start justify-between gap-4">
            <dt className="text-sm text-slate-500">
                {label}
            </dt>

            <dd className="text-right text-sm font-semibold text-slate-800">
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

function parsePositiveInteger(
    value: string,
): number {
    const parsedValue =
        Number.parseInt(
            value,
            10,
        );

    if (
        ! Number.isFinite(
            parsedValue,
        )
        || parsedValue < 1
    ) {
        return 0;
    }

    return parsedValue;
}

function formatQuantity(
    quantity: number,
): string {
    return new Intl.NumberFormat(
        'en-US',
    ).format(quantity);
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
        disabled:cursor-not-allowed
        disabled:bg-slate-100
        disabled:text-slate-500

        ${
            hasError
                ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                : 'border-slate-300 focus:border-[#0D6EFD] focus:ring-4 focus:ring-blue-100'
        }
    `;
}