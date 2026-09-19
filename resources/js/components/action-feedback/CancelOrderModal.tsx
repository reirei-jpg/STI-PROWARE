import { router } from '@inertiajs/react';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

import ActionProcessingButton from './ActionProcessingButton';

const STAFF_REASONS = [
    { value: 'student_request', label: 'Student asked to cancel' },
    { value: 'wrong_item', label: 'Wrong item ordered' },
    { value: 'never_claimed', label: 'Never claimed' },
    { value: 'other', label: 'Other (note required)' },
];

interface CancelOrderModalProps {
    open: boolean;
    orderNumber: string;
    actionUrl: string;
    mode: 'student' | 'staff';
    isPaid?: boolean;
    onClose: () => void;
    onCancelled?: () => void;
}

export default function CancelOrderModal({
    open,
    orderNumber,
    actionUrl,
    mode,
    isPaid = false,
    onClose,
    onCancelled,
}: CancelOrderModalProps) {
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [refundConfirmed, setRefundConfirmed] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!open) {
        return null;
    }

    const isStaff = mode === 'staff';
    const needsRefund = isStaff && isPaid;

    const close = (): void => {
        if (processing) {
            return;
        }

        setErrors({});
        onClose();
    };

    const submit = (): void => {
        if (processing) {
            return;
        }

        setProcessing(true);
        setErrors({});

        router.post(
            actionUrl,
            isStaff
                ? {
                      reason,
                      note,
                      refund_confirmed: needsRefund ? refundConfirmed : false,
                  }
                : { note },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setReason('');
                    setNote('');
                    setRefundConfirmed(false);
                    onClose();
                    onCancelled?.();
                },
                onError: (received) => setErrors(received),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const canSubmit = isStaff
        ? reason !== '' && (!needsRefund || refundConfirmed)
        : true;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                            <AlertTriangle size={21} />
                        </div>

                        <div>
                            <h2 className="text-lg font-black text-slate-900">
                                Cancel Order?
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                {isStaff
                                    ? `Cancel order ${orderNumber}. Reserved stock goes back on the shelf and the student is notified.`
                                    : `Cancel order ${orderNumber}? Your reserved items will be released to other students. This cannot be undone.`}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={processing}
                        onClick={close}
                        aria-label="Close"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-5">
                    {errors.order && (
                        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                            {errors.order}
                        </p>
                    )}

                    {isStaff && (
                        <div>
                            <label
                                htmlFor="cancel-reason"
                                className="text-sm font-bold text-slate-700"
                            >
                                Reason
                            </label>

                            <select
                                id="cancel-reason"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                            >
                                <option value="">Select a reason</option>

                                {STAFF_REASONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>

                            {errors.reason && (
                                <p className="mt-1 text-xs font-semibold text-red-600">
                                    {errors.reason}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="cancel-note"
                            className="text-sm font-bold text-slate-700"
                        >
                            Note
                            <span className="ml-1 font-normal text-slate-400">
                                {isStaff && reason === 'other'
                                    ? '(required)'
                                    : '(optional)'}
                            </span>
                        </label>

                        <textarea
                            id="cancel-note"
                            value={note}
                            maxLength={500}
                            rows={3}
                            onChange={(event) => setNote(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                        />

                        {errors.note && (
                            <p className="mt-1 text-xs font-semibold text-red-600">
                                {errors.note}
                            </p>
                        )}
                    </div>

                    {needsRefund && (
                        <div>
                            <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                <input
                                    type="checkbox"
                                    checked={refundConfirmed}
                                    onChange={(event) =>
                                        setRefundConfirmed(event.target.checked)
                                    }
                                    className="mt-0.5 h-4 w-4"
                                />

                                <span>
                                    This order is already paid. I have refunded
                                    the student in full.
                                </span>
                            </label>

                            {errors.refund_confirmed && (
                                <p className="mt-1 text-xs font-semibold text-red-600">
                                    {errors.refund_confirmed}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
                    <button
                        type="button"
                        disabled={processing}
                        onClick={close}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Keep Order
                    </button>

                    <ActionProcessingButton
                        processing={processing}
                        disabled={!canSubmit}
                        idleText="Cancel Order"
                        processingText="Cancelling..."
                        onClick={submit}
                        className="bg-red-600 text-white hover:bg-red-700"
                    />
                </div>
            </div>
        </div>
    );
}
