import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/**
 * Keep a number input's typed value from ever ending up above `max`.
 *
 * The HTML `max` attribute alone does not stop someone from typing past
 * it, and never will here: these forms submit through JavaScript
 * (preventDefault), so the browser's own "value too large" check never
 * even runs. This clamps the value live, the moment it becomes a complete
 * number greater than `max`, while leaving an unfinished value like ''
 * or '12.' alone so normal typing still works.
 */
export function clampNumberInput(value: string, max: number): string {
    if (value === '') {
        return value;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= max) {
        return value;
    }

    return String(max);
}
