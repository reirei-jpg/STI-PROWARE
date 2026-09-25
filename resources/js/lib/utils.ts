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

function readCookie(name: string): string | null {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));

    return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

/**
 * A plain JSON fetch for requests that must NOT navigate the page
 * (Inertia's router/useForm always navigate on success). Used for
 * background actions like "save as draft" while leaving a form, where
 * the response is read and acted on without ever changing the page.
 */
export async function postJson<TResponse = unknown>(
    url: string,
    data: object,
    method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
): Promise<TResponse> {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': readCookie('XSRF-TOKEN') ?? '',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);

        throw new Error(
            (body && typeof body === 'object' && 'message' in body
                ? String((body as { message: unknown }).message)
                : null) ?? `Request to ${url} failed with status ${response.status}.`,
        );
    }

    return (await response.json()) as TResponse;
}
