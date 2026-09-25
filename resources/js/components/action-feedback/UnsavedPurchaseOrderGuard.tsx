import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
} from 'lucide-react';
import {
    useEffect,
    useRef,
    useState,
} from 'react';

import { postJson } from '@/lib/utils';

import ActionProcessingButton from './ActionProcessingButton';

interface UnsavedPurchaseOrderGuardProps {
    /** Whether the form currently has unsaved changes worth protecting. */
    isDirty: boolean;

    /** Where to POST/PATCH the draft save. */
    saveDraftUrl: string;
    saveDraftMethod?: 'POST' | 'PATCH';

    /**
     * Called at the moment "Save as Draft" is clicked, so the payload
     * always reflects the form's current values, not a stale snapshot.
     */
    getDraftPayload: () => object;
}

interface DraftSaveResponse {
    po_number: string;
}

/**
 * Warns before leaving a purchase order form with unsaved changes —
 * whether by clicking a sidebar link, the browser back/forward buttons,
 * or closing the tab — and offers to save the current progress as a
 * draft, discard it, or stay on the page.
 *
 * Drop this anywhere in the page; it wires itself up entirely through
 * `isDirty` and needs no other plumbing from the parent form.
 */
export default function UnsavedPurchaseOrderGuard({
    isDirty,
    saveDraftUrl,
    saveDraftMethod = 'POST',
    getDraftPayload,
}: UnsavedPurchaseOrderGuardProps) {
    const [stage, setStage] = useState<
        'idle' | 'confirming' | 'saving' | 'saved'
    >('idle');

    const [savedPoNumber, setSavedPoNumber] =
        useState<string | null>(null);

    const [error, setError] =
        useState<string | null>(null);

    const isDirtyRef = useRef(isDirty);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    const bypassRef = useRef(false);

    const pendingUrlRef =
        useRef<string | null>(null);
    const pendingMethodRef =
        useRef<string>('get');

    /*
    |--------------------------------------------------------------------------
    | Intercept Inertia Navigation (sidebar links, back/forward)
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        return router.on('before', (event) => {
            if (bypassRef.current) {
                bypassRef.current = false;

                return;
            }

            if (!isDirtyRef.current) {
                return;
            }

            const visit = event.detail.visit;

            /*
             * Only ever guard a plain navigation (sidebar links, the
             * back button, browser back/forward). The form's own
             * submit is a POST/PATCH visit and must always go through
             * untouched, or the form could never actually be saved.
             */
            if (visit.method !== 'get') {
                return;
            }

            pendingUrlRef.current = visit.url.href;
            pendingMethodRef.current = visit.method;

            setStage('confirming');

            return false;
        });
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Warn On Tab Close / Refresh
    |--------------------------------------------------------------------------
    |
    | The browser only allows its own generic prompt here — no custom UI
    | is possible for a real tab close, only for in-app navigation.
    |
    */

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirtyRef.current) {
                return;
            }

            event.preventDefault();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    function proceedWithPendingNavigation() {
        const url = pendingUrlRef.current;
        const method = pendingMethodRef.current;

        pendingUrlRef.current = null;

        if (!url) {
            return;
        }

        bypassRef.current = true;

        router.visit(url, {
            method: method as never,
        });
    }

    function handleCancel() {
        pendingUrlRef.current = null;
        setStage('idle');
        setError(null);
    }

    function handleDiscard() {
        setStage('idle');
        proceedWithPendingNavigation();
    }

    async function handleSaveDraft() {
        setStage('saving');
        setError(null);

        try {
            const response = await postJson<DraftSaveResponse>(
                saveDraftUrl,
                getDraftPayload(),
                saveDraftMethod,
            );

            setSavedPoNumber(response.po_number);
            setStage('saved');
        } catch (caught) {
            setError(
                caught instanceof Error
                    ? caught.message
                    : 'Something went wrong while saving the draft.',
            );
            setStage('confirming');
        }
    }

    function handleAcknowledgeSaved() {
        setStage('idle');
        setSavedPoNumber(null);
        proceedWithPendingNavigation();
    }

    if (stage === 'idle') {
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
                    max-w-md
                    rounded-3xl
                    bg-white
                    shadow-2xl
                "
            >
                {stage === 'saved' ? (
                    <>
                        <div
                            className="
                                flex
                                items-start
                                gap-3
                                border-b
                                border-slate-100
                                px-6
                                py-5
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-11
                                    w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-emerald-100
                                    text-emerald-600
                                "
                            >
                                <CheckCircle2 size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-black text-slate-900">
                                    Draft Saved
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Your progress was saved as a draft. You can
                                    continue it later from the purchase orders
                                    list.
                                </p>

                                <p className="mt-3 text-sm font-bold text-slate-700">
                                    Draft Number:{' '}
                                    <span className="font-black text-blue-600">
                                        {savedPoNumber}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end px-6 py-5">
                            <ActionProcessingButton
                                idleText="Okay"
                                onClick={handleAcknowledgeSaved}
                                className="
                                    bg-blue-600
                                    text-white
                                    hover:bg-blue-700
                                "
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div
                            className="
                                flex
                                items-start
                                gap-3
                                border-b
                                border-slate-100
                                px-6
                                py-5
                            "
                        >
                            <div
                                className="
                                    flex
                                    h-11
                                    w-11
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-2xl
                                    bg-amber-100
                                    text-amber-600
                                "
                            >
                                <AlertTriangle size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-black text-slate-900">
                                    Leave This Page?
                                </h2>

                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    You have unsaved changes on this purchase
                                    order. Save your progress as a draft, or
                                    discard it and leave anyway.
                                </p>

                                {error && (
                                    <p className="mt-2 text-sm font-semibold text-red-600">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div
                            className="
                                flex
                                flex-col
                                gap-2
                                px-6
                                py-5
                                sm:flex-row
                                sm:justify-end
                            "
                        >
                            <button
                                type="button"
                                disabled={stage === 'saving'}
                                onClick={handleCancel}
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

                            <button
                                type="button"
                                disabled={stage === 'saving'}
                                onClick={handleDiscard}
                                className="
                                    rounded-xl
                                    border
                                    border-red-200
                                    bg-white
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-bold
                                    text-red-600
                                    transition
                                    hover:bg-red-50
                                    disabled:cursor-not-allowed
                                    disabled:opacity-50
                                "
                            >
                                Delete
                            </button>

                            <ActionProcessingButton
                                processing={stage === 'saving'}
                                idleText="Save as Draft"
                                processingText="Saving..."
                                onClick={handleSaveDraft}
                                className="
                                    bg-blue-600
                                    text-white
                                    hover:bg-blue-700
                                "
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
