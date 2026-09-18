import { X } from 'lucide-react';

import { Link } from '@inertiajs/react';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface DetailPopupProps {
    open: boolean;
    title: string;
    icon: LucideIcon;
    onClose: () => void;
    children: ReactNode;

    actionHref?: string;
    actionLabel?: string;
}

/**
 * A lightweight "here's more detail" popup — as opposed to
 * ActionConfirmModal, which asks the user to confirm or cancel
 * a pending action. Used for dashboard stat cards that show a
 * quick preview without leaving the current page.
 */
export default function DetailPopup({
    open,
    title,
    icon: Icon,
    onClose,
    children,
    actionHref,
    actionLabel,
}: DetailPopupProps) {
    if (!open) {
        return null;
    }

    return (
        <div
            className="
                fixed
                inset-0
                z-[100]
                flex
                items-center
                justify-center
                bg-slate-950/40
                px-4
                backdrop-blur-sm
            "
        >
            <div
                className="
                    w-full
                    max-w-2xl
                    rounded-3xl
                    bg-white
                    shadow-2xl
                "
            >
                <div
                    className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        border-b
                        border-slate-100
                        px-6
                        py-5
                    "
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                bg-blue-100
                                text-blue-600
                            "
                        >
                            <Icon size={21} />
                        </div>

                        <h2 className="text-lg font-black text-slate-900">
                            {title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            text-slate-400
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                        "
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
                    {children}
                </div>

                {actionHref && actionLabel && (
                    <div className="border-t border-slate-100 px-6 py-4">
                        <Link
                            href={actionHref}
                            className="
                                flex
                                w-full
                                items-center
                                justify-center
                                rounded-xl
                                bg-blue-600
                                px-5
                                py-3
                                text-sm
                                font-bold
                                text-white
                                transition
                                hover:bg-blue-700
                            "
                        >
                            {actionLabel}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
