import {
    AlertTriangle,
    Boxes,
    CircleCheck,
    PackageX,
} from 'lucide-react';

import type {
    StockReceiptVariant,
    StockStatus,
} from '@/types/stock-receipt';

interface CurrentStockCardProps {
    selectedVariant: StockReceiptVariant | null;
}

export default function CurrentStockCard({
    selectedVariant,
}: CurrentStockCardProps) {
    if (!selectedVariant) {
        return (
            <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <Boxes size={21} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Current Inventory
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Select a product variant to view
                            its current stock information.
                        </p>
                    </div>
                </div>

                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <Boxes
                        size={32}
                        className="mx-auto text-slate-400"
                    />

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                        No variant selected
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                        Inventory details will appear here.
                    </p>
                </div>
            </section>
        );
    }

    const stockStatus =
        stockStatusDetails(
            selectedVariant.stock_status,
        );

    const StockStatusIcon =
        stockStatus.icon;

    return (
        <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-sm">
            <div className="flex items-start justify-between gap-5">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <Boxes size={21} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            Current Inventory
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Review the existing quantities
                            before recording new stock.
                        </p>
                    </div>
                </div>

                <div
                    className={`
                        flex items-center gap-2
                        rounded-full px-3 py-2
                        text-xs font-bold

                        ${stockStatus.badgeClasses}
                    `}
                >
                    <StockStatusIcon size={15} />

                    {stockStatus.label}
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected variant
                </p>

                <p className="mt-2 font-bold text-slate-900">
                    {selectedVariant.display_name}
                </p>

                <p className="mt-1 font-mono text-sm text-slate-500">
                    {selectedVariant.sku}
                </p>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <InventoryMetric
                    label="Quantity on hand"
                    value={
                        selectedVariant.current_stock
                    }
                    description="Physical units currently recorded."
                />

                <InventoryMetric
                    label="Reserved quantity"
                    value={
                        selectedVariant.reserved_stock
                    }
                    description="Units already reserved for orders."
                />

                <InventoryMetric
                    label="Available quantity"
                    value={
                        selectedVariant.available_stock
                    }
                    description="Units currently available for use or sale."
                />

                <InventoryMetric
                    label="Reorder level"
                    value={
                        selectedVariant.reorder_level
                    }
                    description="Threshold used for low-stock warnings."
                />
            </dl>

            <div
                className={`
                    mt-6 rounded-2xl
                    border p-5

                    ${stockStatus.panelClasses}
                `}
            >
                <div className="flex items-start gap-3">
                    <StockStatusIcon
                        size={21}
                        className="mt-0.5 shrink-0"
                    />

                    <div>
                        <p className="font-semibold">
                            {stockStatus.title}
                        </p>

                        <p className="mt-1 text-sm leading-6">
                            {stockStatus.description}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

interface InventoryMetricProps {
    label: string;
    value: number;
    description: string;
}

function InventoryMetric({
    label,
    value,
    description,
}: InventoryMetricProps) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <dt className="text-sm font-semibold text-slate-600">
                {label}
            </dt>

            <dd className="mt-3 text-3xl font-bold text-slate-900">
                {formatQuantity(value)}
            </dd>

            <p className="mt-2 text-xs leading-5 text-slate-500">
                {description}
            </p>
        </div>
    );
}

interface StockStatusDetails {
    label: string;
    title: string;
    description: string;
    badgeClasses: string;
    panelClasses: string;
    icon: typeof CircleCheck;
}

function stockStatusDetails(
    status: StockStatus,
): StockStatusDetails {
    switch (status) {
        case 'out_of_stock':
            return {
                label: 'Out of stock',
                title: 'No available stock',
                description:
                    'The selected variant currently has no available units. Receiving stock will restore its available inventory.',
                badgeClasses:
                    'bg-red-100 text-red-700',
                panelClasses:
                    'border-red-200 bg-red-50 text-red-800',
                icon: PackageX,
            };

        case 'low_stock':
            return {
                label: 'Low stock',
                title: 'Stock is at or below the reorder level',
                description:
                    'The selected variant should be replenished soon. The received quantity will increase its quantity on hand.',
                badgeClasses:
                    'bg-amber-100 text-amber-700',
                panelClasses:
                    'border-amber-200 bg-amber-50 text-amber-800',
                icon: AlertTriangle,
            };

        case 'in_stock':
            return {
                label: 'In stock',
                title: 'Stock level is healthy',
                description:
                    'The selected variant currently has available stock. Receiving more units will increase its quantity on hand.',
                badgeClasses:
                    'bg-emerald-100 text-emerald-700',
                panelClasses:
                    'border-emerald-200 bg-emerald-50 text-emerald-800',
                icon: CircleCheck,
            };
    }
}

function formatQuantity(
    quantity: number,
): string {
    return new Intl.NumberFormat(
        'en-US',
    ).format(quantity);
}