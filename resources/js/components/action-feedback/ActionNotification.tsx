import {
    CheckCircle2,
    X,
    XCircle,
} from 'lucide-react';

interface ActionNotificationProps {
    type: 'success' | 'error';
    message: string;
    onClose?: () => void;
}

export default function ActionNotification({
    type,
    message,
    onClose,
}: ActionNotificationProps) {
    const isSuccess =
        type === 'success';

    return (
        <div
            className="
                fixed
                right-5
                top-5
                z-[110]
                w-[calc(100%-2.5rem)]
                max-w-sm
            "
        >
            <div
                className={`
                    flex
                    items-start
                    gap-3
                    rounded-2xl
                    border
                    bg-white
                    p-4
                    shadow-xl
                    ${
                        isSuccess
                            ? 'border-emerald-200'
                            : 'border-red-200'
                    }
                `}
            >
                <div
                    className={`
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        ${
                            isSuccess
                                ? `
                                    bg-emerald-100
                                    text-emerald-600
                                `
                                : `
                                    bg-red-100
                                    text-red-600
                                `
                        }
                    `}
                >
                    {isSuccess ? (
                        <CheckCircle2
                            size={19}
                        />
                    ) : (
                        <XCircle
                            size={19}
                        />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p
                        className={`
                            text-xs
                            font-black
                            uppercase
                            tracking-wide
                            ${
                                isSuccess
                                    ? 'text-emerald-600'
                                    : 'text-red-600'
                            }
                        `}
                    >
                        {isSuccess
                            ? 'Success'
                            : 'Error'}
                    </p>

                    <p
                        className="
                            mt-1
                            text-sm
                            font-semibold
                            leading-5
                            text-slate-700
                        "
                    >
                        {message}
                    </p>
                </div>

                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            flex
                            h-8
                            w-8
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            text-slate-400
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                        "
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}