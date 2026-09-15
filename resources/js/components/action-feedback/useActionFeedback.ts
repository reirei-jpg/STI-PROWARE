import {
    useEffect,
    useState,
} from 'react';

export type ActionFeedbackNotification = {
    type: 'success' | 'error';
    message: string;
};

export function useActionFeedback() {
    const [
        processing,
        setProcessing,
    ] = useState(false);

    const [
        notification,
        setNotification,
    ] = useState<
        ActionFeedbackNotification
        | null
    >(null);

    useEffect(() => {
        if (!notification) {
            return;
        }

        const timeout =
            window.setTimeout(
                () => {
                    setNotification(
                        null,
                    );
                },
                3000,
            );

        return () => {
            window.clearTimeout(
                timeout,
            );
        };
    }, [notification]);

    const startProcessing =
        (): void => {
            setProcessing(true);
            setNotification(null);
        };

    const stopProcessing =
        (): void => {
            setProcessing(false);
        };

    const showSuccess = (
        message: string,
    ): void => {
        setProcessing(false);

        setNotification({
            type: 'success',
            message,
        });
    };

    const showError = (
        message: string,
    ): void => {
        setProcessing(false);

        setNotification({
            type: 'error',
            message,
        });
    };

    const clearNotification =
        (): void => {
            setNotification(null);
        };

    return {
        processing,
        notification,

        startProcessing,
        stopProcessing,

        showSuccess,
        showError,

        clearNotification,
    };
}