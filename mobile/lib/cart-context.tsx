import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { ApiError } from './api';
import { useAuth } from './auth';
import type {
    CartChangeResponse,
    CartData,
    CartResponse,
    CheckoutPayload,
    CheckoutResponse,
} from './cart';

type CartContextValue = {
    cart: CartData | null;
    loading: boolean;
    error: string | null;
    /** Number of units in the cart, for the tab badge. */
    totalQuantity: number;
    refresh: () => Promise<void>;
    updateQuantity: (itemId: number, quantity: number) => Promise<void>;
    removeItem: (itemId: number) => Promise<void>;
    /** Places the order; throws the server's own message when it is refused. */
    checkout: (payload: CheckoutPayload) => Promise<CheckoutResponse>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const { user, request } = useAuth();
    const [cart, setCart] = useState<CartData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const response = await request<CartResponse>('/cart');

            setCart(response.data);
            setError(null);
        } catch (caught) {
            setError(
                caught instanceof ApiError
                    ? caught.message
                    : 'Something went wrong. Please try again.',
            );
        } finally {
            setLoading(false);
        }
    }, [request]);

    // Load the cart when a student signs in; forget it when they sign out.
    useEffect(() => {
        if (user) {
            setLoading(true);
            void refresh();
        } else {
            setCart(null);
            setError(null);
        }
    }, [user, refresh]);

    /*
     * Changes throw the server's own message (stock, limits) so the screen can
     * show it next to the item; the cart is only replaced when the server
     * accepted the change.
     */
    const updateQuantity = useCallback(
        async (itemId: number, quantity: number) => {
            const response = await request<CartChangeResponse>(
                `/cart/items/${itemId}`,
                { method: 'PATCH', body: { quantity } },
            );

            setCart(response.data);
        },
        [request],
    );

    const removeItem = useCallback(
        async (itemId: number) => {
            const response = await request<CartChangeResponse>(
                `/cart/items/${itemId}`,
                { method: 'DELETE' },
            );

            setCart(response.data);
        },
        [request],
    );

    const checkout = useCallback(
        async (payload: CheckoutPayload) => {
            const response = await request<CheckoutResponse>('/checkout', {
                method: 'POST',
                body: payload,
            });

            setCart(response.data.cart);

            return response;
        },
        [request],
    );

    const value = useMemo(
        () => ({
            cart,
            loading,
            error,
            totalQuantity: cart?.total_quantity ?? 0,
            refresh,
            updateQuantity,
            removeItem,
            checkout,
        }),
        [cart, loading, error, refresh, updateQuantity, removeItem, checkout],
    );

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error('useCart must be used inside <CartProvider>.');
    }

    return context;
}
