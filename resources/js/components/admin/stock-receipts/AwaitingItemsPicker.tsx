import {
    AlertTriangle,
    CalendarClock,
    PackageSearch,
    Search,
} from 'lucide-react';

import { useMemo, useState } from 'react';

import { Calendar } from '@/components/ui/calendar';

import type {
    StockReceiptPurchaseOrder,
    StockReceiptPurchaseOrderItem,
} from '@/types/stock-receipt';

/*
|--------------------------------------------------------------------------
| Flattened Awaiting Item
|--------------------------------------------------------------------------
|
| The specialist thinks in terms of "what's being delivered", not "which
| PO do I open first" — so every still-outstanding line item across every
| outstanding PO is flattened into one clickable list here, instead of
| requiring a PO to be picked before its items become visible.
*/

interface AwaitingItem {
    purchaseOrderId: string;
    itemId: string;
    poNumber: string;
    supplierName: string;
    expectedDeliveryDate: string | null;
    label: string;
    quantityRemaining: number;
    isOverdue: boolean;
}

function itemLabel(
    item: StockReceiptPurchaseOrderItem,
): string {
    const baseName =
        item.product_name ?? item.manual_name ?? 'Purchase Order Item';

    const variant =
        item.variant_name
        ?? [item.program, item.size].filter(Boolean).join(' / ');

    return variant ? `${baseName} — ${variant}` : baseName;
}

function todayDateString(): string {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
    ].join('-');
}

function parseDateValue(value: string): Date | undefined {
    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return undefined;
    }

    return new Date(year, month - 1, day);
}

function formatDateValue(date: Date): string {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}

function formatDisplayDate(value: string): string {
    const date = parseDateValue(value);

    if (!date) {
        return value;
    }

    return new Intl.DateTimeFormat('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}

export default function AwaitingItemsPicker({
    purchaseOrders,
    selectedPurchaseOrderId,
    selectedPurchaseOrderItemId,
    onSelectItem,
}: {
    purchaseOrders: StockReceiptPurchaseOrder[];
    selectedPurchaseOrderId: string;
    selectedPurchaseOrderItemId: string;
    onSelectItem: (purchaseOrderId: string, itemId: string) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const today = todayDateString();

    const awaitingItems = useMemo<AwaitingItem[]>(
        () =>
            purchaseOrders.flatMap((purchaseOrder) =>
                purchaseOrder.items
                    .filter((item) => item.quantity_remaining > 0)
                    .map((item) => ({
                        purchaseOrderId: String(purchaseOrder.id),
                        itemId: String(item.id),
                        poNumber: purchaseOrder.po_number,
                        supplierName: purchaseOrder.supplier_name,
                        expectedDeliveryDate:
                            purchaseOrder.expected_delivery_date,
                        label: itemLabel(item),
                        quantityRemaining: item.quantity_remaining,
                        isOverdue:
                            purchaseOrder.expected_delivery_date !== null
                            && purchaseOrder.expected_delivery_date < today,
                    })),
            ),
        [purchaseOrders, today],
    );

    const datedItems = useMemo(
        () =>
            awaitingItems
                .filter((item) => item.expectedDeliveryDate !== null)
                .sort((a, b) =>
                    (a.expectedDeliveryDate as string).localeCompare(
                        b.expectedDeliveryDate as string,
                    ),
                ),
        [awaitingItems],
    );

    const undatedItems = useMemo(
        () => awaitingItems.filter((item) => item.expectedDeliveryDate === null),
        [awaitingItems],
    );

    /*
     * The soonest delivery that isn't already overdue — used to open
     * the calendar on a useful month instead of defaulting to "today"
     * when nothing is due this month, and to power the "jump to next
     * delivery" shortcut below.
     */
    const nextUpcomingDate =
        datedItems.find((item) => (item.expectedDeliveryDate as string) >= today)
            ?.expectedDeliveryDate ?? null;

    const [displayMonth, setDisplayMonth] = useState<Date>(
        () => (nextUpcomingDate ? parseDateValue(nextUpcomingDate) : undefined)
            ?? new Date(),
    );

    const jumpToNextDelivery = (): void => {
        if (!nextUpcomingDate) {
            return;
        }

        setDisplayMonth(parseDateValue(nextUpcomingDate) ?? new Date());
        setSelectedDate(nextUpcomingDate);
    };

    const deliveryDates = useMemo(() => {
        const uniqueDates = new Set(
            datedItems.map((item) => item.expectedDeliveryDate as string),
        );

        return [...uniqueDates]
            .map(parseDateValue)
            .filter((date): date is Date => date !== undefined);
    }, [datedItems]);

    const overdueDates = useMemo(() => {
        const uniqueDates = new Set(
            datedItems
                .filter((item) => item.isOverdue)
                .map((item) => item.expectedDeliveryDate as string),
        );

        return [...uniqueDates]
            .map(parseDateValue)
            .filter((date): date is Date => date !== undefined);
    }, [datedItems]);

    const query = searchQuery.trim().toLowerCase();

    const matchesSearch = (item: AwaitingItem): boolean =>
        !query
        || item.poNumber.toLowerCase().includes(query)
        || item.supplierName.toLowerCase().includes(query);

    const visibleDatedItems = datedItems
        .filter(matchesSearch)
        .filter(
            (item) => !selectedDate || item.expectedDeliveryDate === selectedDate,
        );

    const visibleUndatedItems = undatedItems.filter(matchesSearch);

    const handleDaySelect = (date: Date | undefined): void => {
        if (!date) {
            setSelectedDate(null);

            return;
        }

        const value = formatDateValue(date);

        setSelectedDate((current) => (current === value ? null : value));
    };

    const nothingVisible =
        visibleDatedItems.length === 0 && visibleUndatedItems.length === 0;

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                    Purchase Order
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                    What&apos;s Being Delivered?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    The list already includes every upcoming delivery, not
                    just this month — scroll it, or use the calendar&apos;s
                    arrows or the shortcut below to jump ahead and see what a
                    later day looks like.
                </p>
            </div>

            {nextUpcomingDate && (
                <button
                    type="button"
                    onClick={jumpToNextDelivery}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                >
                    <CalendarClock size={14} />
                    Jump to next delivery — {formatDisplayDate(nextUpcomingDate)}
                </button>
            )}

            <div className="relative mt-5">
                <Search
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by PO number or supplier"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-2 text-slate-700">
                    <Calendar
                        mode="single"
                        month={displayMonth}
                        onMonthChange={setDisplayMonth}
                        selected={
                            selectedDate ? parseDateValue(selectedDate) : undefined
                        }
                        onSelect={handleDaySelect}
                        modifiers={{
                            hasDelivery: deliveryDates,
                            overdue: overdueDates,
                        }}
                        modifiersClassNames={{
                            hasDelivery:
                                'relative font-black text-blue-700 after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-blue-600 after:content-[""]',
                            overdue:
                                'text-red-600 after:bg-red-600',
                        }}
                    />

                    {selectedDate && (
                        <button
                            type="button"
                            onClick={() => setSelectedDate(null)}
                            className="mt-1 w-full rounded-lg px-3 py-2 text-center text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                        >
                            Show every day
                        </button>
                    )}
                </div>

                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {nothingVisible ? (
                        <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center">
                            <PackageSearch
                                size={32}
                                className="text-slate-300"
                            />

                            <p className="mt-3 text-sm font-bold text-slate-600">
                                Nothing matches here
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                                {selectedDate
                                    ? 'No deliveries are expected on this day.'
                                    : 'Try a different PO number or supplier name.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {visibleDatedItems.map((item) => (
                                <AwaitingItemCard
                                    key={item.itemId}
                                    item={item}
                                    selected={
                                        selectedPurchaseOrderId
                                            === item.purchaseOrderId
                                        && selectedPurchaseOrderItemId
                                            === item.itemId
                                    }
                                    onSelect={onSelectItem}
                                />
                            ))}

                            {visibleUndatedItems.length > 0 && (
                                <>
                                    <p className="pt-2 text-xs font-black uppercase tracking-wide text-slate-400">
                                        No date set
                                    </p>

                                    {visibleUndatedItems.map((item) => (
                                        <AwaitingItemCard
                                            key={item.itemId}
                                            item={item}
                                            selected={
                                                selectedPurchaseOrderId
                                                    === item.purchaseOrderId
                                                && selectedPurchaseOrderItemId
                                                    === item.itemId
                                            }
                                            onSelect={onSelectItem}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {awaitingItems.length === 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                    No purchase orders are currently available for receiving.
                </div>
            )}
        </section>
    );
}

function AwaitingItemCard({
    item,
    selected,
    onSelect,
}: {
    item: AwaitingItem;
    selected: boolean;
    onSelect: (purchaseOrderId: string, itemId: string) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect(item.purchaseOrderId, item.itemId)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
                selected
                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="font-black text-slate-900">{item.label}</p>

                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                    {item.quantityRemaining} left
                </span>
            </div>

            <p className="mt-1 text-xs font-semibold text-slate-500">
                {item.poNumber} — {item.supplierName}
            </p>

            {item.expectedDeliveryDate && (
                <div
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        item.isOverdue
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                    }`}
                >
                    {item.isOverdue ? (
                        <AlertTriangle size={12} />
                    ) : (
                        <CalendarClock size={12} />
                    )}

                    {item.isOverdue ? 'Overdue — ' : 'Expected '}

                    {formatDisplayDate(item.expectedDeliveryDate)}
                </div>
            )}
        </button>
    );
}
