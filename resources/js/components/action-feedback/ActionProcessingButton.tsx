import {
    LoaderCircle,
} from 'lucide-react';

interface ActionProcessingButtonProps {
    type?: 'button' | 'submit';
    processing?: boolean;
    disabled?: boolean;
    idleText: string;
    processingText?: string;
    onClick?: () => void;
    className?: string;
}

export default function ActionProcessingButton({
    type = 'button',
    processing = false,
    disabled = false,
    idleText,
    processingText = 'Processing...',
    onClick,
    className = '',
}: ActionProcessingButtonProps) {
    const isDisabled =
        processing
        || disabled;

    return (
        <button
            type={type}
            disabled={isDisabled}
            onClick={onClick}
            className={`
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                px-4
                py-2.5
                text-sm
                font-bold
                transition
                disabled:cursor-not-allowed
                disabled:opacity-60
                ${className}
            `}
        >
            {processing && (
                <LoaderCircle
                    size={17}
                    className="animate-spin"
                />
            )}

            <span>
                {processing
                    ? processingText
                    : idleText}
            </span>
        </button>
    );
}