export type AvailabilityStatus = 'available' | 'coming_soon' | 'out_of_stock';

export type CatalogEarlyBird = {
    discount_percent: string;
    remaining_slots: number;
};

export type CatalogProduct = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    price_min: string;
    price_max: string;
    variant_mode: string;
    variant_mode_label: string;
    variants_count: number;
    availability_status: AvailabilityStatus;
    availability_label: string;
    availability_summary: string;
    stock_urgency: 'low_stock' | null;
    early_bird: CatalogEarlyBird | null;
    preorder_enabled: boolean;
    accepts_preorders: boolean;
    expected_release_date: string | null;
    new_badge_duration_days: number | null;
    new_badge_started_at: string | null;
    restocked_badge_duration_days: number | null;
    restocked_badge_started_at: string | null;
    image_url: string | null;
    category: { id: number; name: string };
};

export type CatalogResponse = {
    data: CatalogProduct[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    coming_soon: CatalogProduct[];
    filters: { search: string; status: string };
};

export type StatusFilter = '' | AvailabilityStatus;

export function catalogPath(
    search: string,
    status: StatusFilter,
    page: number,
): string {
    const parts = [`page=${page}`];

    if (search.trim() !== '') {
        parts.push(`search=${encodeURIComponent(search.trim())}`);
    }

    if (status !== '') {
        parts.push(`status=${status}`);
    }

    return `/catalog?${parts.join('&')}`;
}

/** True while a "New" or "Restocked" badge is still inside its window. */
export function badgeIsActive(
    startedAt: string | null,
    durationDays: number | null,
): boolean {
    if (!startedAt || !durationDays || durationDays <= 0) {
        return false;
    }

    const expiresAt = new Date(startedAt);

    expiresAt.setDate(expiresAt.getDate() + durationDays);

    return new Date() < expiresAt;
}
