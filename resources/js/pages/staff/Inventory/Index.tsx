import {
    AlertTriangle,
    ArrowLeft,
    Boxes,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    LoaderCircle,
    Package,
    PackageOpen,
    RefreshCcw,
    Search,
    Settings2,
    SlidersHorizontal,
    TrendingDown,
    X,
} from 'lucide-react';

import { Head, Link, router, usePage } from '@inertiajs/react';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

import AdminLayout from '@/layouts/AdminLayout';
import SpecialistLayout from '@/layouts/SpecialistLayout';

import ActionConfirmModal from '@/components/action-feedback/ActionConfirmModal';
import ActionNotification from '@/components/action-feedback/ActionNotification';
import { useActionFeedback } from '@/components/action-feedback/useActionFeedback';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

interface InventoryProduct {
    id: number | null;
    code: string;
    name: string;
    category: string | null;
}

interface InventoryVariant {
    id: number | null;
    sku: string;
    variant_name: string;
    program: string | null;
    size: string | null;
    is_active: boolean;
}

interface InventoryRow {
    id: number;
    product_variant_id: number;

    product: InventoryProduct;
    variant: InventoryVariant;

    quantity_on_hand: number;
    quantity_reserved: number;
    available_quantity: number;
    reorder_level: number;

    stock_status: StockStatus;
}

interface PaginatedInventories {
    current_page: number;
    data: InventoryRow[];

    first_page_url?: string;
    from: number | null;
    last_page: number;
    last_page_url?: string;

    links?: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;

    next_page_url: string | null;
    path?: string;
    per_page?: number;
    prev_page_url: string | null;

    to: number | null;
    total: number;
}

interface InventorySummary {
    variants: number;
    total_on_hand: number;
    total_reserved: number;
    total_available: number;
    low_stock: number;
    out_of_stock: number;
}

interface InventoryFilters {
    search: string;
    status: string;
}

interface Props {
    inventories: PaginatedInventories;
    summary: InventorySummary;
    filters: InventoryFilters;
}

interface SharedPageProps {
    [key: string]: unknown;

    auth?: {
        user?: {
            id: number;
            name: string;
            email?: string;
            role: string;
        } | null;
    };

    flash?: {
        success?: string | null;
        error?: string | null;
    };
}

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Index({ inventories, summary, filters }: Props) {
    const page = usePage<SharedPageProps>();

    const role = page.props.auth?.user?.role ?? '';

    const flash = page.props.flash;

    const isAdmin = role === 'admin' || role === 'super_admin';

    const [search, setSearch] = useState(filters.search ?? '');

    const [status, setStatus] = useState(filters.status ?? 'all');

    const [filtering, setFiltering] = useState(false);

    const [selectedInventory, setSelectedInventory] =
        useState<InventoryRow | null>(null);

    const [reorderLevel, setReorderLevel] = useState('');

    const [savingThreshold, setSavingThreshold] = useState(false);

    const [thresholdError, setThresholdError] = useState<string | null>(null);

    const [showThresholdConfirm, setShowThresholdConfirm] = useState(false);

    const { notification, showSuccess, showError, clearNotification } =
        useActionFeedback();

    useEffect(() => {
        setSearch(filters.search ?? '');

        setStatus(filters.status ?? 'all');
    }, [filters.search, filters.status]);

    const rows = useMemo(
        () => (Array.isArray(inventories?.data) ? inventories.data : []),
        [inventories],
    );

    const pageTitle = isAdmin
        ? 'Inventory Control & Monitoring'
        : 'Inventory Management';

    const pageDescription = isAdmin
        ? 'Monitor merchandise stock levels and control restock thresholds.'
        : 'Monitor current stock levels, availability, and replenishment status.';

    /*
    |--------------------------------------------------------------------------
    | Filters
    |--------------------------------------------------------------------------
    */

    const applyFilters = (event?: FormEvent): void => {
        event?.preventDefault();

        setFiltering(true);

        router.get(
            '/staff/inventory',
            {
                search: search.trim() || undefined,

                status: status !== 'all' ? status : undefined,
            },
            {
                preserveState: true,

                preserveScroll: true,

                replace: true,

                onFinish: () => {
                    setFiltering(false);
                },
            },
        );
    };

    const clearFilters = (): void => {
        setSearch('');

        setStatus('all');

        setFiltering(true);

        router.get(
            '/staff/inventory',
            {},
            {
                preserveScroll: true,

                replace: true,

                onFinish: () => {
                    setFiltering(false);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Summary Card Shortcut
    |--------------------------------------------------------------------------
    |
    | Clicking a status card is a shortcut for the status filter above
    | — it applies the filter immediately (the "Apply" button submit
    | isn't needed for this) and opens a popup with the matching rows
    | once they've actually loaded, so it never flashes the previous
    | selection's data first.
    */

    const applyStatusFilter = (
        value: string,
        onSuccess?: () => void,
        onFinish?: () => void,
    ): void => {
        setStatus(value);
        setFiltering(true);

        router.get(
            '/staff/inventory',
            {
                search: search.trim() || undefined,

                status: value !== 'all' ? value : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onSuccess,
                onFinish: () => {
                    setFiltering(false);
                    onFinish?.();
                },
            },
        );
    };

    const [pendingCard, setPendingCard] = useState<string | null>(null);

    const [inventoryModalView, setInventoryModalView] = useState<
        | { type: 'list'; label: string }
        | { type: 'details'; row: InventoryRow; backLabel: string | null }
        | null
    >(null);

    const openCardPreview = (value: string, label: string): void => {
        setPendingCard(value);

        applyStatusFilter(
            value,
            () => setInventoryModalView({ type: 'list', label }),
            () => setPendingCard(null),
        );
    };

    const openInventoryDetails = (row: InventoryRow): void => {
        setInventoryModalView((previous) =>
            previous?.type === 'list'
                ? { type: 'details', row, backLabel: previous.label }
                : { type: 'details', row, backLabel: null },
        );
    };

    const backToInventoryList = (): void => {
        setInventoryModalView((previous) =>
            previous?.type === 'details' && previous.backLabel
                ? { type: 'list', label: previous.backLabel }
                : null,
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Restock Threshold
    |--------------------------------------------------------------------------
    */

    const openThresholdModal = (inventory: InventoryRow): void => {
        if (!isAdmin) {
            return;
        }

        setSelectedInventory(inventory);

        setReorderLevel(String(inventory.reorder_level));

        setThresholdError(null);
    };

    const closeThresholdModal = (): void => {
        if (savingThreshold) {
            return;
        }

        setSelectedInventory(null);

        setThresholdError(null);
    };

    const saveThreshold = (event: FormEvent): void => {
        event.preventDefault();

        if (!selectedInventory || savingThreshold) {
            return;
        }

        const value = Number(reorderLevel);

        if (!Number.isInteger(value) || value < 0) {
            setThresholdError(
                'Restock threshold must be a whole number of 0 or greater.',
            );

            return;
        }

        setThresholdError(null);

        setShowThresholdConfirm(true);
    };

    const confirmSaveThreshold = (): void => {
        if (!selectedInventory || savingThreshold) {
            return;
        }

        const value = Number(reorderLevel);

        setSavingThreshold(true);

        router.patch(
            `/staff/inventory/${selectedInventory.id}/reorder-level`,
            {
                reorder_level: value,
            },
            {
                preserveScroll: true,

                onSuccess: () => {
                    setShowThresholdConfirm(false);

                    setSelectedInventory(null);

                    showSuccess('Restock threshold updated successfully.');
                },

                onError: () => {
                    setShowThresholdConfirm(false);

                    showError(
                        'Restock threshold could not be updated. Please try again.',
                    );
                },

                onFinish: () => {
                    setSavingThreshold(false);
                },
            },
        );
    };

    /*
    |--------------------------------------------------------------------------
    | Shared Inventory Content
    |--------------------------------------------------------------------------
    */

    const content = (
        <>
            <Head title={pageTitle} />

            <div className="space-y-7">
                {/* Header */}
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-sm font-bold tracking-wide text-blue-600 uppercase">
                            STI PROWARE
                        </p>

                        <h1 className="mt-1 text-3xl font-black text-slate-900">
                            {pageTitle}
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            {pageDescription}
                        </p>
                    </div>

                    <Link
                        href="/staff/inventory/movements"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                        <RefreshCcw size={18} />
                        View Stock Movements
                    </Link>
                </div>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                        {flash.error}
                    </div>
                )}

                {/* Summary */}
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <SummaryCard
                        label="Variants"
                        value={summary.variants}
                        description="Inventory records"
                        icon={Boxes}
                        active={status === 'all'}
                        loading={pendingCard === 'all'}
                        onClick={() => openCardPreview('all', 'All Variants')}
                    />

                    <SummaryCard
                        label="On Hand"
                        value={summary.total_on_hand}
                        description="Physical stock"
                        icon={Package}
                    />

                    <SummaryCard
                        label="Reserved"
                        value={summary.total_reserved}
                        description="Reserved stock"
                        icon={SlidersHorizontal}
                    />

                    <SummaryCard
                        label="Available"
                        value={summary.total_available}
                        description="Ready to allocate"
                        icon={CheckCircle2}
                    />

                    <SummaryCard
                        label="Low Stock"
                        value={summary.low_stock}
                        description="At/below threshold"
                        icon={TrendingDown}
                        active={status === 'low_stock'}
                        loading={pendingCard === 'low_stock'}
                        onClick={() =>
                            openCardPreview('low_stock', 'Low Stock')
                        }
                    />

                    <SummaryCard
                        label="Out of Stock"
                        value={summary.out_of_stock}
                        description="No available stock"
                        icon={PackageOpen}
                        active={status === 'out_of_stock'}
                        loading={pendingCard === 'out_of_stock'}
                        onClick={() =>
                            openCardPreview('out_of_stock', 'Out of Stock')
                        }
                    />
                </section>

                {/* Search / Filter */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <form
                        onSubmit={applyFilters}
                        className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_auto_auto] xl:items-end"
                    >
                        <div>
                            <label className="mb-2 block text-xs font-black tracking-wide text-slate-500 uppercase">
                                Search Inventory
                            </label>

                            <div className="relative">
                                <Search
                                    size={18}
                                    className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
                                />

                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Product, category, SKU, program, size..."
                                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-4 pl-11 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-xs font-black tracking-wide text-slate-500 uppercase">
                                Stock Status
                            </label>

                            <select
                                value={status}
                                onChange={(event) =>
                                    setStatus(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            >
                                <option value="all">All Statuses</option>

                                <option value="in_stock">In Stock</option>

                                <option value="low_stock">Low Stock</option>

                                <option value="out_of_stock">
                                    Out of Stock
                                </option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={filtering}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {filtering ? (
                                <>
                                    <LoaderCircle
                                        size={17}
                                        className="animate-spin"
                                    />
                                    Filtering...
                                </>
                            ) : (
                                <>
                                    <Search size={17} />
                                    Apply
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            disabled={filtering}
                            onClick={clearFilters}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Clear
                        </button>
                    </form>
                </section>

                {/* Inventory Table */}
                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">
                                Inventory Records
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Showing <strong>{inventories.from ?? 0}</strong>{' '}
                                to <strong>{inventories.to ?? 0}</strong> of{' '}
                                <strong>{inventories.total}</strong> records.
                            </p>
                        </div>

                        {isAdmin && (
                            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                                Admin Threshold Control Enabled
                            </span>
                        )}
                    </div>

                    {rows.length > 0 ? (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1350px]">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <TableHeading>Product</TableHeading>

                                            <TableHeading>Variant</TableHeading>

                                            <TableHeading>SKU</TableHeading>

                                            <TableHeading>On Hand</TableHeading>

                                            <TableHeading>
                                                Reserved
                                            </TableHeading>

                                            <TableHeading>
                                                Available
                                            </TableHeading>

                                            <TableHeading>
                                                Restock Threshold
                                            </TableHeading>

                                            <TableHeading>Status</TableHeading>

                                            {isAdmin && (
                                                <th className="px-5 py-4 text-right text-xs font-black tracking-wide text-slate-400 uppercase">
                                                    Action
                                                </th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map((inventory) => (
                                            <tr
                                                key={inventory.id}
                                                className="border-t border-slate-100 transition hover:bg-slate-50/60"
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-black text-slate-900">
                                                        {inventory.product.name}
                                                    </p>

                                                    <div className="mt-1 flex flex-wrap gap-2">
                                                        <span className="font-mono text-xs font-bold text-blue-600">
                                                            {
                                                                inventory
                                                                    .product
                                                                    .code
                                                            }
                                                        </span>

                                                        {inventory.product
                                                            .category && (
                                                            <span className="text-xs font-semibold text-slate-400">
                                                                {
                                                                    inventory
                                                                        .product
                                                                        .category
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <p className="font-bold text-slate-800">
                                                        {
                                                            inventory.variant
                                                                .variant_name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-400">
                                                        {[
                                                            inventory.variant
                                                                .program,

                                                            inventory.variant
                                                                .size,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' / ') ||
                                                            'Standard'}
                                                    </p>
                                                </td>

                                                <td className="px-5 py-4 font-mono text-xs font-bold text-slate-600">
                                                    {inventory.variant.sku}
                                                </td>

                                                <QuantityCell
                                                    value={
                                                        inventory.quantity_on_hand
                                                    }
                                                />

                                                <QuantityCell
                                                    value={
                                                        inventory.quantity_reserved
                                                    }
                                                />

                                                <QuantityCell
                                                    value={
                                                        inventory.available_quantity
                                                    }
                                                    emphasized
                                                />

                                                <td className="px-5 py-4">
                                                    <span className="font-black text-slate-800">
                                                        {
                                                            inventory.reorder_level
                                                        }
                                                    </span>
                                                </td>

                                                <td className="px-5 py-4">
                                                    <StockStatusBadge
                                                        status={
                                                            inventory.stock_status
                                                        }
                                                    />
                                                </td>

                                                {isAdmin && (
                                                    <td className="px-5 py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openThresholdModal(
                                                                    inventory,
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                                                        >
                                                            <Settings2
                                                                size={15}
                                                            />
                                                            Set Threshold
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination inventories={inventories} />
                        </>
                    ) : (
                        <div className="px-6 py-16 text-center">
                            <PackageOpen
                                size={46}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-4 text-lg font-black text-slate-800">
                                No inventory records found
                            </h3>

                            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                                Try changing the search term or stock-status
                                filter.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            {/* Restock Threshold Modal */}
            {selectedInventory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                            <Settings2 size={24} />
                        </div>

                        <h2 className="mt-5 text-xl font-black text-slate-900">
                            Update Restock Threshold
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            {selectedInventory.product.name}

                            {' — '}

                            {selectedInventory.variant.variant_name}
                        </p>

                        <form onSubmit={saveThreshold} className="mt-6">
                            <label className="mb-2 block text-xs font-black tracking-wide text-slate-500 uppercase">
                                Restock Threshold
                            </label>

                            <input
                                type="number"
                                min={0}
                                step={1}
                                value={reorderLevel}
                                onChange={(event) =>
                                    setReorderLevel(event.target.value)
                                }
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                            />

                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle
                                        size={18}
                                        className="mt-0.5 shrink-0 text-amber-500"
                                    />

                                    <p>
                                        A variant is treated as low stock when
                                        its available quantity is greater than
                                        zero but at or below this threshold.
                                    </p>
                                </div>
                            </div>

                            {thresholdError && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                    {thresholdError}
                                </div>
                            )}

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    disabled={savingThreshold}
                                    onClick={closeThresholdModal}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={savingThreshold}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0D6EFD] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {savingThreshold ? (
                                        <>
                                            <LoaderCircle
                                                size={17}
                                                className="animate-spin"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={17} />
                                            Save Threshold
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <InventoryPreviewModal
                view={inventoryModalView}
                inventories={inventories}
                onClose={() => setInventoryModalView(null)}
                onBack={backToInventoryList}
                onOpenDetails={openInventoryDetails}
            />

            <ActionConfirmModal
                open={showThresholdConfirm}
                title="Save Restock Threshold?"
                message={
                    selectedInventory
                        ? `Update the restock threshold for ${selectedInventory.product.name} — ${selectedInventory.variant.variant_name} to ${reorderLevel}?`
                        : ''
                }
                confirmText="Save Threshold"
                processingText="Saving Threshold..."
                processing={savingThreshold}
                tone="primary"
                onCancel={() => setShowThresholdConfirm(false)}
                onConfirm={confirmSaveThreshold}
            />

            {notification && (
                <ActionNotification
                    type={notification.type}
                    message={notification.message}
                    onClose={clearNotification}
                />
            )}
        </>
    );

    /*
    |--------------------------------------------------------------------------
    | Role Layout
    |--------------------------------------------------------------------------
    */

    if (isAdmin) {
        return <AdminLayout>{content}</AdminLayout>;
    }

    return <SpecialistLayout>{content}</SpecialistLayout>;
}

/*
|--------------------------------------------------------------------------
| Summary Card
|--------------------------------------------------------------------------
*/

function SummaryCard({
    label,
    value,
    description,
    icon: Icon,
    active = false,
    loading = false,
    onClick,
}: {
    label: string;
    value: number;
    description: string;
    icon: typeof Package;
    active?: boolean;
    loading?: boolean;
    onClick?: () => void;
}) {
    const content = (
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-sm font-bold text-slate-600">{label}</p>

                <p className="mt-2 text-3xl font-black text-slate-950">
                    {value}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                    {description}
                </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                {loading ? (
                    <LoaderCircle size={20} className="animate-spin" />
                ) : (
                    <Icon size={20} />
                )}
            </div>
        </div>
    );

    if (onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={loading}
                className={`rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait ${active ? 'ring-2 ring-blue-500' : ''}`}
            >
                {content}
            </button>
        );
    }

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {content}
        </article>
    );
}

/*
|--------------------------------------------------------------------------
| Table
|--------------------------------------------------------------------------
*/

function TableHeading({ children }: { children: ReactNode }) {
    return (
        <th className="px-5 py-4 text-left text-xs font-black tracking-wide text-slate-400 uppercase">
            {children}
        </th>
    );
}

function QuantityCell({
    value,
    emphasized = false,
}: {
    value: number;
    emphasized?: boolean;
}) {
    return (
        <td className="px-5 py-4">
            <span
                className={
                    emphasized
                        ? 'text-base font-black text-blue-700'
                        : 'text-sm font-black text-slate-800'
                }
            >
                {value}
            </span>
        </td>
    );
}

/*
|--------------------------------------------------------------------------
| Stock Status
|--------------------------------------------------------------------------
*/

function StockStatusBadge({ status }: { status: StockStatus }) {
    const config = getStockStatusConfig(status);

    return (
        <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${config.className} `}
        >
            {config.label}
        </span>
    );
}

function getStockStatusConfig(status: StockStatus): {
    label: string;
    className: string;
} {
    switch (status) {
        case 'out_of_stock':
            return {
                label: 'Out of Stock',

                className: 'bg-red-100 text-red-700',
            };

        case 'low_stock':
            return {
                label: 'Low Stock',

                className: 'bg-amber-100 text-amber-700',
            };

        default:
            return {
                label: 'In Stock',

                className: 'bg-emerald-100 text-emerald-700',
            };
    }
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function Pagination({ inventories }: { inventories: PaginatedInventories }) {
    if (inventories.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
                Showing <strong>{inventories.from ?? 0}</strong> to{' '}
                <strong>{inventories.to ?? 0}</strong> of{' '}
                <strong>{inventories.total}</strong> records
            </p>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={!inventories.prev_page_url}
                    onClick={() => {
                        if (inventories.prev_page_url) {
                            router.visit(inventories.prev_page_url, {
                                preserveScroll: true,

                                preserveState: true,
                            });
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft size={16} />
                    Previous
                </button>

                <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    Page {inventories.current_page} of {inventories.last_page}
                </span>

                <button
                    type="button"
                    disabled={!inventories.next_page_url}
                    onClick={() => {
                        if (inventories.next_page_url) {
                            router.visit(inventories.next_page_url, {
                                preserveScroll: true,

                                preserveState: true,
                            });
                        }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Inventory Preview Modal
|--------------------------------------------------------------------------
|
| One popup shell for both the Quick View (opened from a summary
| card) and a single inventory row's Details — going from the list
| to a details view (and back) swaps the content in place instead of
| closing one popup and opening another. Every list row always
| identifies the exact product, variant, and SKU it belongs to —
| never a bare number on its own.
*/

function InventoryPreviewModal({
    view,
    inventories,
    onClose,
    onBack,
    onOpenDetails,
}: {
    view:
        | { type: 'list'; label: string }
        | {
              type: 'details';
              row: InventoryRow;
              backLabel: string | null;
          }
        | null;
    inventories: PaginatedInventories;
    onClose: () => void;
    onBack: () => void;
    onOpenDetails: (row: InventoryRow) => void;
}) {
    if (!view) {
        return null;
    }

    const row = view.type === 'details' ? view.row : null;

    const listLabel = view.type === 'list' ? view.label : null;

    const visitPage = (url: string | null): void => {
        if (!url) {
            return;
        }

        router.visit(url, { preserveScroll: true, preserveState: true });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
                onClick={(event) => event.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        {row && view.type === 'details' && view.backLabel && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}

                        <div>
                            <p className="text-xs font-black tracking-wide text-blue-600 uppercase">
                                {row ? 'Variant Details' : 'Quick View'}
                            </p>

                            <h2 className="mt-1 text-xl font-black text-slate-900">
                                {row
                                    ? `${row.product.name} — ${row.variant.variant_name}`
                                    : listLabel}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {row
                                    ? row.variant.sku
                                    : `${inventories.total} record${inventories.total === 1 ? '' : 's'}`}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                    {row ? (
                        <>
                            <div>
                                <StockStatusBadge status={row.stock_status} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <InventoryStatBlock
                                    label="On Hand"
                                    value={row.quantity_on_hand}
                                />

                                <InventoryStatBlock
                                    label="Available"
                                    value={row.available_quantity}
                                />

                                <InventoryStatBlock
                                    label="Reserved"
                                    value={row.quantity_reserved}
                                />

                                <InventoryStatBlock
                                    label="Restock Threshold"
                                    value={row.reorder_level}
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                <p className="text-xs font-black tracking-wide text-slate-400 uppercase">
                                    Product
                                </p>

                                <div className="mt-2 space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Product code
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {row.product.code}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-slate-500">
                                            Category
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {row.product.category ?? '—'}
                                        </span>
                                    </div>

                                    {(row.variant.program ||
                                        row.variant.size) && (
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-slate-500">
                                                Program / Size
                                            </span>
                                            <span className="font-bold text-slate-800">
                                                {[
                                                    row.variant.program,
                                                    row.variant.size,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' • ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : inventories.data.length > 0 ? (
                        groupInventoryByProduct(inventories.data).map(
                            (group) => (
                                <div
                                    key={group.product.code}
                                    className="space-y-2"
                                >
                                    <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2.5">
                                        <Package
                                            size={16}
                                            className="shrink-0 text-blue-600"
                                        />

                                        <p className="text-lg font-black text-blue-900">
                                            {group.product.name}
                                        </p>

                                        <p className="font-mono text-xs text-blue-500">
                                            {group.product.code}
                                        </p>
                                    </div>

                                    <div className="space-y-2 pl-2">
                                        {group.rows.map((item) => (
                                            <InventoryPreviewRow
                                                key={item.id}
                                                row={item}
                                                onDetails={() =>
                                                    onOpenDetails(item)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            ),
                        )
                    ) : (
                        <p className="py-10 text-center text-sm text-slate-500">
                            No inventory records in this category.
                        </p>
                    )}
                </div>

                {/* PAGINATION (list view only) */}
                {!row && inventories.last_page > 1 && (
                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-6 py-4">
                        <button
                            type="button"
                            disabled={!inventories.prev_page_url}
                            onClick={() => visitPage(inventories.prev_page_url)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>

                        <p className="text-sm font-bold text-slate-500">
                            Page {inventories.current_page} of{' '}
                            {inventories.last_page}
                        </p>

                        <button
                            type="button"
                            disabled={!inventories.next_page_url}
                            onClick={() => visitPage(inventories.next_page_url)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                )}

                {/* FOOTER */}
                <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function InventoryPreviewRow({
    row,
    onDetails,
}: {
    row: InventoryRow;
    onDetails: () => void;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">
                    {row.variant.variant_name}
                    {row.variant.size ? ` • ${row.variant.size}` : ''}
                    {row.variant.program ? ` • ${row.variant.program}` : ''}
                </p>

                <p className="mt-0.5 font-mono text-xs text-blue-600">
                    {row.variant.sku}
                </p>
            </div>

            <div className="flex shrink-0 justify-center sm:w-32">
                <StockStatusBadge status={row.stock_status} />
            </div>

            <span className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 sm:w-28">
                {row.available_quantity} avail.
            </span>

            <button
                type="button"
                onClick={onDetails}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50 sm:w-24"
            >
                Details
            </button>
        </div>
    );
}

/*
|--------------------------------------------------------------------------
| Group By Product
|--------------------------------------------------------------------------
|
| The backend already sorts by product name then variant name, so
| this just folds consecutive rows for the same product together
| instead of re-sorting — each product appears once, with all of its
| variants listed underneath it.
*/

function groupInventoryByProduct(
    rows: InventoryRow[],
): { product: InventoryProduct; rows: InventoryRow[] }[] {
    const groups: { product: InventoryProduct; rows: InventoryRow[] }[] = [];

    for (const row of rows) {
        const lastGroup = groups[groups.length - 1];

        if (lastGroup && lastGroup.product.code === row.product.code) {
            lastGroup.rows.push(row);
        } else {
            groups.push({ product: row.product, rows: [row] });
        }
    }

    return groups;
}

function InventoryStatBlock({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                {label}
            </p>

            <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
    );
}
