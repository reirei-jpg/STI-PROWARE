import {
    AlertTriangle,
    CalendarClock,
    CalendarDays,
    Clock4,
    Eye,
    PackageSearch,
    Search,
    Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { itemLabel } from '@/components/admin/stock-receipts/AwaitingItemsPicker';
import type { StockReceiptPurchaseOrder } from '@/types/stock-receipt';

/*
|--------------------------------------------------------------------------
| Awaiting Items Table
|--------------------------------------------------------------------------
|
| The read-only list of everything still awaiting delivery, shown on the
| To Be Received tab for both the Admin and the Specialist. Receiving
| itself happens on Receive Stock, which keeps the calendar picker; here a
| plain table with every item's details on one row is easier to scan.
|
*/

type DeliveryStatus = 'overdue' | 'due_today' | 'upcoming' | 'no_date';

interface AwaitingRow {
    purchaseOrderId: string;
    itemId: string;
    poNumber: string;
    supplierName: string;
    label: string;
    isNewProduct: boolean;
    quantityOrdered: number;
    quantityReceived: number;
    quantityRemaining: number;
    expectedDeliveryDate: string | null;
    status: DeliveryStatus;
}

const STATUS_ORDER: Record<DeliveryStatus, number> = {
    overdue: 0,
    due_today: 1,
    upcoming: 2,
    no_date: 3,
};

const STATUS_BADGES: Record<
    DeliveryStatus,
    { label: string; className: string; icon: typeof AlertTriangle }
> = {
    overdue: {
        label: 'Overdue',
        className: 'bg-red-100 text-red-700',
        icon: AlertTriangle,
    },
    due_today: {
        label: 'Due Today',
        className: 'bg-amber-100 text-amber-700',
        icon: Clock4,
    },
    upcoming: {
        label: 'Upcoming',
        className: 'bg-blue-100 text-blue-700',
        icon: CalendarClock,
    },
    no_date: {
        label: 'No Date Set',
        className: 'bg-slate-100 text-slate-600',
        icon: CalendarDays,
    },
};

function formatDisplayDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return value;
    }

    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(year, month - 1, day));
}

export default function AwaitingItemsTable({
    purchaseOrders,
    today,
    receivingNote,
    onViewDetails,
}: {
    purchaseOrders: StockReceiptPurchaseOrder[];
    today: string;
    receivingNote: string;
    onViewDetails: (purchaseOrderId: string) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');

    const rows = useMemo<AwaitingRow[]>(
        () =>
            purchaseOrders
                .flatMap((purchaseOrder) =>
                    purchaseOrder.items
                        .filter((item) => item.quantity_remaining > 0)
                        .map((item): AwaitingRow => {
                            const date = purchaseOrder.expected_delivery_date;

                            return {
                                purchaseOrderId: String(purchaseOrder.id),
                                itemId: String(item.id),
                                poNumber: purchaseOrder.po_number,
                                supplierName: purchaseOrder.supplier_name,
                                label: itemLabel(item),
                                isNewProduct: item.merchandise_origin === 'new',
                                quantityOrdered: item.quantity_ordered,
                                quantityReceived: item.quantity_received,
                                quantityRemaining: item.quantity_remaining,
                                expectedDeliveryDate: date,
                                status:
                                    date === null
                                        ? 'no_date'
                                        : date < today
                                          ? 'overdue'
                                          : date === today
                                            ? 'due_today'
                                            : 'upcoming',
                            };
                        }),
                )
                .sort(
                    (a, b) =>
                        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
                        (a.expectedDeliveryDate ?? '').localeCompare(
                            b.expectedDeliveryDate ?? '',
                        ) ||
                        a.poNumber.localeCompare(b.poNumber),
                ),
        [purchaseOrders, today],
    );

    const query = searchQuery.trim().toLowerCase();

    const visibleRows = query
        ? rows.filter(
              (row) =>
                  row.poNumber.toLowerCase().includes(query) ||
                  row.supplierName.toLowerCase().includes(query) ||
                  row.label.toLowerCase().includes(query),
          )
        : rows;

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-lg font-black text-slate-900">
                        Awaiting Delivery
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                        {rows.length} item{rows.length === 1 ? '' : 's'} still
                        to be received, overdue first. {receivingNote}
                    </p>
                </div>

                <label className="relative block w-full lg:max-w-sm">
                    <Search
                        size={17}
                        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search item, PO number, or supplier"
                        className="w-full rounded-xl border border-slate-200 py-3 pr-4 pl-11 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                </label>
            </div>

            {visibleRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                    <PackageSearch size={32} className="text-slate-300" />

                    <p className="mt-3 text-sm font-bold text-slate-600">
                        {rows.length === 0
                            ? 'Nothing is waiting to be received'
                            : 'Nothing matches your search'}
                    </p>

                    {rows.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs font-black text-blue-600 underline underline-offset-2 hover:text-blue-800"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <Heading>Item</Heading>
                                <Heading>Purchase Order</Heading>
                                <Heading>Remaining</Heading>
                                <Heading>Expected Delivery</Heading>
                                <Heading>Status</Heading>
                                <Heading>Action</Heading>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {visibleRows.map((row) => {
                                const badge = STATUS_BADGES[row.status];
                                const BadgeIcon = badge.icon;

                                return (
                                    <tr
                                        key={row.itemId}
                                        className="align-top hover:bg-slate-50/70"
                                    >
                                        <td className="min-w-[220px] px-5 py-4">
                                            <p className="font-black text-slate-900">
                                                {row.label}
                                            </p>

                                            {row.isNewProduct && (
                                                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black whitespace-nowrap text-emerald-700">
                                                    <Sparkles size={12} />
                                                    New Product
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="font-bold whitespace-nowrap text-slate-800">
                                                {row.poNumber}
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {row.supplierName}
                                            </p>
                                        </td>

                                        <td className="px-5 py-4">
                                            <p className="text-lg leading-6 font-black text-blue-700">
                                                {row.quantityRemaining}
                                            </p>

                                            <p className="mt-0.5 text-xs whitespace-nowrap text-slate-500">
                                                {row.quantityReceived} of{' '}
                                                {row.quantityOrdered} received
                                            </p>
                                        </td>

                                        <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                                            {row.expectedDeliveryDate
                                                ? formatDisplayDate(
                                                      row.expectedDeliveryDate,
                                                  )
                                                : '—'}
                                        </td>

                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black whitespace-nowrap ${badge.className}`}
                                            >
                                                <BadgeIcon size={13} />
                                                {badge.label}
                                            </span>
                                        </td>

                                        <td className="px-5 py-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onViewDetails(
                                                        row.purchaseOrderId,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 px-3 py-2 text-xs font-black whitespace-nowrap text-blue-700 transition hover:bg-blue-50"
                                            >
                                                <Eye size={14} />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function Heading({ children }: { children: ReactNode }) {
    return (
        <th className="px-5 py-4 text-xs font-black tracking-wide whitespace-nowrap text-slate-500 uppercase">
            {children}
        </th>
    );
}
