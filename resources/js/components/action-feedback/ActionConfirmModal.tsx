import {
    AlertTriangle,
    X,
} from 'lucide-react';

import ActionProcessingButton
    from './ActionProcessingButton';

interface ActionConfirmModalProps {
    open: boolean;
    title: string;
    message: string;

    confirmText?: string;
    processingText?: string;

    processing?: boolean;

    tone?: 'danger' | 'primary';

    onCancel: () => void;
    onConfirm: () => void;
}

export default function ActionConfirmModal({
    open,
    title,
    message,
    confirmText = 'Confirm',
    processingText = 'Processing...',
    processing = false,
    tone = 'primary',
    onCancel,
    onConfirm,
}: ActionConfirmModalProps) {
    if (!open) {
        return null;
    }

    const confirmStyle =
        tone === 'danger'
            ? `
                bg-red-600
                text-white
                hover:bg-red-700
            `
            : `
                bg-blue-600
                text-white
                hover:bg-blue-700
            `;

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
                    max-w-md
                    rounded-3xl
                    bg-white
                    shadow-2xl
                "
            >
                <div
                    className="
                        flex
                        items-start
                        justify-between
                        gap-4
                        border-b
                        border-slate-100
                        px-6
                        py-5
                    "
                >
                    <div className="flex items-start gap-3">
                        <div
                            className={`
                                flex
                                h-11
                                w-11
                                shrink-0
                                items-center
                                justify-center
                                rounded-2xl
                                ${
                                    tone === 'danger'
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-blue-100 text-blue-600'
                                }
                            `}
                        >
                            <AlertTriangle
                                size={21}
                            />
                        </div>

                        <div>
                            <h2
                                className="
                                    text-lg
                                    font-black
                                    text-slate-900
                                "
                            >
                                {title}
                            </h2>

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    leading-6
                                    text-slate-500
                                "
                            >
                                {message}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={processing}
                        onClick={onCancel}
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
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                        "
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    className="
                        flex
                        justify-end
                        gap-3
                        px-6
                        py-5
                    "
                >
                    <button
                        type="button"
                        disabled={processing}
                        onClick={onCancel}
                        className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-4
                            py-2.5
                            text-sm
                            font-bold
                            text-slate-600
                            transition
                            hover:bg-slate-50
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        Cancel
                    </button>

                    <ActionProcessingButton
                        processing={processing}
                        idleText={confirmText}
                        processingText={
                            processingText
                        }
                        onClick={onConfirm}
                        className={
                            confirmStyle
                        }
                    />
                </div>
            </div>
        </div>
    );
}