import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    X,
    XCircle,
} from 'lucide-react';

import CashierNavbar from '@/components/cashier/CashierNavbar';
import CashierSidebar from '@/components/cashier/CashierSidebar';

interface CashierLayoutProps {
    children: ReactNode;
}

interface FlashProps {
    success?: string | null;
    error?: string | null;
}

interface CashierPageProps {
    flash?: FlashProps;
    [key: string]: unknown;
}

type ToastType =
    | 'success'
    | 'error';

interface ToastState {
    type: ToastType;
    message: string;
}

export default function CashierLayout({
    children,
}: CashierLayoutProps) {
    const page =
        usePage<CashierPageProps>();

    const flash =
        page.props.flash;

    const [toast, setToast] =
        useState<ToastState | null>(
            null,
        );

    /*
    |--------------------------------------------------------------------------
    | Listen For Laravel Flash Messages
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (flash?.error) {
            setToast({
                type: 'error',
                message: flash.error,
            });

            return;
        }

        if (flash?.success) {
            setToast({
                type: 'success',
                message: flash.success,
            });
        }
    }, [
        flash?.error,
        flash?.success,
    ]);

    /*
    |--------------------------------------------------------------------------
    | Automatically Close Toast
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        if (! toast) {
            return;
        }

        const timer =
            window.setTimeout(
                () => {
                    setToast(null);
                },
                6000,
            );

        return () => {
            window.clearTimeout(
                timer,
            );
        };
    }, [toast]);

    return (
        <div className="min-h-screen bg-[#F3F7FA]">
            <CashierSidebar />

            <CashierNavbar />

            {toast && (
                <div
                    className="
                        fixed
                        inset-0
                        z-[9999]
                        flex
                        items-center
                        justify-center
                        bg-black/20
                        p-4
                    "
                >
                    <div
                        role="alert"
                        aria-live="assertive"
                        className={`
                            flex
                            w-full
                            max-w-lg
                            items-start
                            gap-4
                            rounded-2xl
                            border
                            bg-white
                            p-6
                            shadow-2xl
                            ${
                                toast.type ===
                                'success'
                                    ? 'border-emerald-200'
                                    : 'border-red-200'
                            }
                        `}
                    >
                        <div
                            className={`
                                flex
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                ${
                                    toast.type ===
                                    'success'
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-red-100 text-red-600'
                                }
                            `}
                        >
                            {toast.type ===
                            'success' ? (
                                <CheckCircle2
                                    size={22}
                                />
                            ) : (
                                <XCircle
                                    size={22}
                                />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p
                                className={`
                                    text-lg
                                    font-bold
                                    ${
                                        toast.type ===
                                        'success'
                                            ? 'text-emerald-700'
                                            : 'text-red-700'
                                    }
                                `}
                            >
                                {toast.type ===
                                'success'
                                    ? 'Success'
                                    : 'Unable to Continue'}
                            </p>

                            <p className="mt-2 text-base leading-6 text-slate-600">
                                {toast.message}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                setToast(
                                    null,
                                )
                            }
                            className="
                                rounded-lg
                                p-1
                                text-slate-400
                                transition
                                hover:bg-slate-100
                                hover:text-slate-700
                            "
                            aria-label="Close notification"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <main className="min-h-screen px-5 pb-10 pt-28 md:ml-72 md:px-8">
                {children}
            </main>
        </div>
    );
}