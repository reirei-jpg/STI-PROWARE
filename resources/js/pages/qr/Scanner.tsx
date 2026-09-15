import {
    Camera,
    QrCode,
    RefreshCw,
} from 'lucide-react';

import {
    Head,
    router,
} from '@inertiajs/react';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import {
    Html5Qrcode,
    Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

export default function Scanner() {
    const scannerRef =
        useRef<Html5Qrcode | null>(
            null,
        );

    const hasScannedRef =
        useRef(false);

    const [error, setError] =
        useState<string | null>(null);

    const [scanning, setScanning] =
        useState(true);

    const [starting, setStarting] =
        useState(true);

    const handleQrValue =
        useCallback(
            (value: string) => {
                const trimmedValue =
                    value.trim();

                if (!trimmedValue) {
                    setError(
                        'The scanned code is empty.',
                    );

                    hasScannedRef.current =
                        false;

                    setScanning(true);

                    return;
                }

                /*
                 * CASE 1:
                 *
                 * The QR contains a full URL.
                 *
                 * Example:
                 * http://localhost:8000/orders/scan/ABC123
                 */
                try {
                    const url =
                        new URL(
                            trimmedValue,
                        );

                    const path =
                        url.pathname;

                    if (
                        path.startsWith(
                            '/orders/scan/',
                        )
                    ) {
                        router.visit(
                            path,
                        );

                        return;
                    }
                } catch {
                    /*
                     * Not a URL.
                     *
                     * It may be a plain
                     * PROWARE QR token.
                     */
                }

                /*
                 * CASE 2:
                 *
                 * The QR contains:
                 *
                 * /orders/scan/ABC123
                 */
                if (
                    trimmedValue.startsWith(
                        '/orders/scan/',
                    )
                ) {
                    router.visit(
                        trimmedValue,
                    );

                    return;
                }

                /*
                 * CASE 3:
                 *
                 * The QR contains only
                 * the token.
                 *
                 * Example:
                 * ABC123XYZ
                 */
                const token =
                    trimmedValue
                        .replace(
                            /^\/?orders\/scan\//,
                            '',
                        )
                        .trim();

                if (!token) {
                    setError(
                        'The scanned code is not a valid PROWARE order QR.',
                    );

                    hasScannedRef.current =
                        false;

                    setScanning(true);

                    return;
                }

                router.visit(
                    `/orders/scan/${encodeURIComponent(
                        token,
                    )}`,
                );
            },
            [],
        );

    useEffect(() => {
        if (!scanning) {
            return;
        }

        let cancelled =
            false;

        setError(null);
        setStarting(true);

        hasScannedRef.current =
            false;

        const startScanner =
            async () => {
                try {
                    /*
                     * Make sure an old
                     * scanner instance is
                     * cleaned up first.
                     */
                    if (
                        scannerRef.current
                    ) {
                        try {
                            if (
                                scannerRef
                                    .current
                                    .isScanning
                            ) {
                                await scannerRef.current.stop();
                            }
                        } catch {
                            // Ignore cleanup error.
                        }

                        try {
                            scannerRef.current.clear();
                        } catch {
                            // Ignore cleanup error.
                        }

                        scannerRef.current =
                            null;
                    }

                    if (cancelled) {
                        return;
                    }

    const scanner =
    new Html5Qrcode(
        'proware-reader',
        {
            formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.CODE_93,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.ITF,
                Html5QrcodeSupportedFormats.DATA_MATRIX,
                Html5QrcodeSupportedFormats.PDF_417,
            ],

            useBarCodeDetectorIfSupported:
                false,

            verbose: false,
        },
    );

                    scannerRef.current =
                        scanner;

                    await scanner.start(
                        {
                            /*
                             * Prefer the rear
                             * camera on phones.
                             */
                            facingMode:
                                'environment',
                        },
                        {
                            /*
                             * Scan frequency.
                             */
                            fps: 10,

                            /*
                             * Responsive scan
                             * region.
                             */
                            qrbox: (
                                viewfinderWidth,
                                viewfinderHeight,
                            ) => {
                                const smallestSide =
                                    Math.min(
                                        viewfinderWidth,
                                        viewfinderHeight,
                                    );

                                const boxSize =
                                    Math.max(
                                        200,
                                        Math.floor(
                                            smallestSide *
                                                0.7,
                                        ),
                                    );

                                return {
                                    width: Math.min(
                                        boxSize,
                                        viewfinderWidth -
                                            20,
                                    ),

                                    height: Math.min(
                                        boxSize,
                                        viewfinderHeight -
                                            20,
                                    ),
                                };
                            },
                        },

                        /*
                         * SUCCESS CALLBACK
                         */
                        async (
                            decodedText,
                        ) => {
                            if (
                                hasScannedRef.current
                            ) {
                                return;
                            }

                            hasScannedRef.current =
                                true;

                            setScanning(
                                false,
                            );

                            try {
                                if (
                                    scanner.isScanning
                                ) {
                                    await scanner.stop();
                                }
                            } catch {
                                // Scanner already stopped.
                            }

                            handleQrValue(
                                decodedText,
                            );
                        },

                        /*
                         * FAILURE CALLBACK
                         *
                         * This callback fires
                         * constantly while no
                         * code is visible.
                         *
                         * We intentionally do
                         * nothing here.
                         */
                        () => {},
                    );

                    if (
                        !cancelled
                    ) {
                        setStarting(
                            false,
                        );
                    }
                } catch (
                    scannerError
                ) {
                    console.error(
                        'PROWARE scanner error:',
                        scannerError,
                    );

                    if (
                        cancelled
                    ) {
                        return;
                    }

                    setStarting(
                        false,
                    );

                    setScanning(
                        false,
                    );

                    const message =
                        scannerError instanceof
                        Error
                            ? scannerError.message
                            : String(
                                  scannerError,
                              );

                    if (
                        message
                            .toLowerCase()
                            .includes(
                                'permission',
                            )
                    ) {
                        setError(
                            'Camera permission was denied. Allow camera access in your browser settings and try again.',
                        );

                        return;
                    }

                    if (
                        message
                            .toLowerCase()
                            .includes(
                                'notfound',
                            ) ||
                        message
                            .toLowerCase()
                            .includes(
                                'not found',
                            )
                    ) {
                        setError(
                            'No camera was found on this device.',
                        );

                        return;
                    }

                    setError(
                        'The camera could not be started. Make sure another application is not using the camera, then try again.',
                    );
                }
            };

        /*
         * Small delay helps ensure
         * the reader div already exists
         * in the DOM.
         */
        const timeout =
            window.setTimeout(
                () => {
                    startScanner();
                },
                50,
            );

        return () => {
            cancelled =
                true;

            window.clearTimeout(
                timeout,
            );

            const scanner =
                scannerRef.current;

            scannerRef.current =
                null;

            if (!scanner) {
                return;
            }

            if (
                scanner.isScanning
            ) {
                scanner
                    .stop()
                    .catch(
                        () => {},
                    )
                    .finally(
                        () => {
                            try {
                                scanner.clear();
                            } catch {
                                // Ignore cleanup error.
                            }
                        },
                    );

                return;
            }

            try {
                scanner.clear();
            } catch {
                // Ignore cleanup error.
            }
        };
    }, [
        scanning,
        handleQrValue,
    ]);

    const restartScanner =
        () => {
            setError(null);

            hasScannedRef.current =
                false;

            setScanning(true);
        };

    return (
        <>
            <Head title="Scan Order QR" />

            <div className="min-h-screen bg-slate-950 px-4 py-8 text-white">
                <div className="mx-auto max-w-xl">
                    {/* HEADER */}
                    <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                            <QrCode
                                size={30}
                            />
                        </div>

                        <h1 className="mt-5 text-3xl font-black">
                            Scan Order QR
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Point the
                            camera at the
                            student's
                            PROWARE order
                            QR code.
                        </p>
                    </div>

                    {/* CAMERA */}
                    <div className="mt-8 overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl">
                        <div className="relative min-h-[420px] overflow-hidden bg-black">
                            <div
                                id="proware-reader"
                                className="h-full min-h-[420px] w-full overflow-hidden"
                            />

                            {starting &&
                                scanning && (
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950">
                                        <div className="text-center">
                                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

                                            <p className="mt-4 text-sm font-semibold text-slate-300">
                                                Starting
                                                camera...
                                            </p>
                                        </div>
                                    </div>
                                )}

                            {scanning &&
                                !starting && (
                                    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/70 px-4 py-2 text-xs font-bold backdrop-blur-sm">
                                        <Camera
                                            size={
                                                15
                                            }
                                        />

                                        Camera
                                        Active
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
                            <p className="text-sm leading-6 text-red-200">
                                {
                                    error
                                }
                            </p>

                            <button
                                type="button"
                                onClick={
                                    restartScanner
                                }
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
                            >
                                <RefreshCw
                                    size={
                                        16
                                    }
                                />

                                Try
                                Camera
                                Again
                            </button>
                        </div>
                    )}

                    {/* SUPPORTED CODES */}
                    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <p className="text-sm font-bold text-slate-200">
                            Supported
                            Codes
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            PROWARE can
                            currently scan
                            QR codes and
                            common barcode
                            formats such as
                            Code 128, Code
                            39, Code 93,
                            EAN, UPC, ITF,
                            Data Matrix,
                            and PDF417.
                        </p>
                    </div>

                    {/* HOW IT WORKS */}
                    <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <p className="text-sm font-bold text-slate-200">
                            How it works
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            Scan the QR
                            shown on the
                            student's
                            order. PROWARE
                            will identify
                            the order and
                            open the
                            correct
                            verification
                            page for the
                            logged-in
                            cashier or
                            specialist.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}