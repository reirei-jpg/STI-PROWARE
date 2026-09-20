import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from './api';
import { useAuth } from './auth';
import {
    catalogPath,
    type CatalogProduct,
    type CatalogResponse,
    type StatusFilter,
} from './catalog';

type State = {
    products: CatalogProduct[];
    comingSoon: CatalogProduct[];
    page: number;
    lastPage: number;
    total: number;
    loading: boolean;
    loadingMore: boolean;
    refreshing: boolean;
    error: string | null;
};

const INITIAL: State = {
    products: [],
    comingSoon: [],
    page: 0,
    lastPage: 0,
    total: 0,
    loading: true,
    loadingMore: false,
    refreshing: false,
    error: null,
};

/** Loads the storefront page by page for the current search and status. */
export function useCatalog(search: string, status: StatusFilter) {
    const { request } = useAuth();
    const [state, setState] = useState<State>(INITIAL);
    const latestRequest = useRef(0);

    const load = useCallback(
        async (page: number, mode: 'reset' | 'more' | 'refresh') => {
            const id = ++latestRequest.current;

            setState((current) => ({
                ...current,
                error: null,
                loading: mode === 'reset',
                loadingMore: mode === 'more',
                refreshing: mode === 'refresh',
            }));

            try {
                const response = await request<CatalogResponse>(
                    catalogPath(search, status, page),
                );

                // A newer search or filter has started; ignore this answer.
                if (id !== latestRequest.current) {
                    return;
                }

                setState((current) => ({
                    products:
                        page === 1
                            ? response.data
                            : [
                                  ...current.products,
                                  ...response.data.filter(
                                      (product) =>
                                          !current.products.some(
                                              (known) => known.id === product.id,
                                          ),
                                  ),
                              ],
                    comingSoon:
                        page === 1 ? response.coming_soon : current.comingSoon,
                    page: response.meta.current_page,
                    lastPage: response.meta.last_page,
                    total: response.meta.total,
                    loading: false,
                    loadingMore: false,
                    refreshing: false,
                    error: null,
                }));
            } catch (caught) {
                if (id !== latestRequest.current) {
                    return;
                }

                setState((current) => ({
                    ...current,
                    loading: false,
                    loadingMore: false,
                    refreshing: false,
                    error:
                        caught instanceof ApiError
                            ? caught.message
                            : 'Something went wrong. Please try again.',
                }));
            }
        },
        [request, search, status],
    );

    useEffect(() => {
        void load(1, 'reset');
    }, [load]);

    const loadMore = useCallback(() => {
        if (state.loading || state.loadingMore || state.page >= state.lastPage) {
            return;
        }

        void load(state.page + 1, 'more');
    }, [load, state.loading, state.loadingMore, state.page, state.lastPage]);

    const refresh = useCallback(() => void load(1, 'refresh'), [load]);

    const retry = useCallback(() => void load(1, 'reset'), [load]);

    return { ...state, loadMore, refresh, retry };
}
