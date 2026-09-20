/** 1250 -> "₱1,250.00", written by hand so it works on every phone. */
export function formatPesos(amount: string | number): string {
    const [whole, cents] = Number(amount).toFixed(2).split('.');

    return `₱${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents}`;
}

export function formatPriceRange(min: string, max: string): string {
    return min === max
        ? formatPesos(min)
        : `${formatPesos(min)} - ${formatPesos(max)}`;
}
