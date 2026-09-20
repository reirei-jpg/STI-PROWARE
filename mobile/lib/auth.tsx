import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { ApiError, apiRequest } from './api';
import {
    clearToken,
    deviceName,
    readToken,
    saveToken,
} from './session-storage';

export type SessionUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    mustChangePassword: boolean;
    student: {
        studentId: string;
        course: string | null;
        yearLevel: string | null;
        status: string;
    } | null;
};

type ApiUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    must_change_password: boolean;
    student: {
        student_id: string;
        course: string | null;
        year_level: string | null;
        status: string;
    } | null;
};

type LoginResponse = {
    data: { token: string; user: ApiUser };
};

type MeResponse = { data: ApiUser };

function toSessionUser(user: ApiUser): SessionUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.must_change_password,
        student: user.student
            ? {
                  studentId: user.student.student_id,
                  course: user.student.course,
                  yearLevel: user.student.year_level,
                  status: user.student.status,
              }
            : null,
    };
}

type RequestFunction = <T>(
    path: string,
    options?: {
        method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
        body?: Record<string, unknown>;
    },
) => Promise<T>;

type AuthContextValue = {
    user: SessionUser | null;
    /** Calls the server as the signed-in student; a refused token signs out. */
    request: RequestFunction;
    /** The signed-in token, for loading protected images (such as the order QR). */
    token: string | null;
    /** True until the saved login (if any) has been checked. */
    restoring: boolean;
    signIn: (
        email: string,
        password: string,
        remember: boolean,
    ) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [restoring, setRestoring] = useState(true);

    // On start, sign back in with the saved token if there is one and the
    // server still accepts it.
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const saved = await readToken();

            if (saved) {
                try {
                    const me = await apiRequest<MeResponse>('/auth/me', {
                        token: saved,
                    });

                    if (!cancelled) {
                        setToken(saved);
                        setUser(toSessionUser(me.data));
                    }
                } catch (caught) {
                    // A refused token is dead. A network problem keeps it,
                    // so the student is not signed out just for being offline.
                    if (caught instanceof ApiError && caught.status === 401) {
                        await clearToken();
                    }
                }
            }

            if (!cancelled) {
                setRestoring(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const signIn = useCallback(
        async (email: string, password: string, remember: boolean) => {
            const response = await apiRequest<LoginResponse>('/auth/login', {
                method: 'POST',
                body: {
                    email,
                    password,
                    device_name: await deviceName(),
                },
            });

            if (remember) {
                await saveToken(response.data.token);
            } else {
                await clearToken();
            }

            setToken(response.data.token);
            setUser(toSessionUser(response.data.user));
        },
        [],
    );

    const signOut = useCallback(async () => {
        const current = token;

        setUser(null);
        setToken(null);
        await clearToken();

        // Tell the server too, but never block signing out on it.
        if (current) {
            apiRequest('/auth/logout', {
                method: 'POST',
                token: current,
            }).catch(() => undefined);
        }
    }, [token]);

    const request = useCallback<RequestFunction>(
        async (path, options = {}) => {
            try {
                return await apiRequest(path, { ...options, token });
            } catch (caught) {
                if (caught instanceof ApiError && caught.status === 401) {
                    void signOut();
                }

                throw caught;
            }
        },
        [token, signOut],
    );

    const value = useMemo(
        () => ({ user, token, request, restoring, signIn, signOut }),
        [user, token, request, restoring, signIn, signOut],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside <AuthProvider>.');
    }

    return context;
}
