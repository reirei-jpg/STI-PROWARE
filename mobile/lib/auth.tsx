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
import { loadSavedServerAddress } from './config';
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

export type RegisterPayload = {
    full_name: string;
    student_id: string;
    last_name: string;
    course: string;
    year_level: string;
    email: string;
    password: string;
    password_confirmation: string;
    terms: boolean;
};

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
        method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        body?: Record<string, unknown>;
    },
) => Promise<T>;

type AuthContextValue = {
    user: SessionUser | null;
    /** Calls the server as the signed-in student; a refused token signs out. */
    request: RequestFunction;
    /** True until the saved login (if any) has been checked. */
    restoring: boolean;
    signIn: (
        email: string,
        password: string,
        remember: boolean,
    ) => Promise<void>;
    /** Registers a new student account and signs them straight in, the same
     *  way the website does after registering. */
    register: (payload: RegisterPayload) => Promise<void>;
    signOut: () => Promise<void>;
    /** Call after the server confirms a password change, so the forced
     *  temporary-password screen releases the rest of the app immediately. */
    markPasswordChanged: () => void;
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
            // The server address chosen on this phone comes before any request.
            await loadSavedServerAddress();

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

    const register = useCallback(async (payload: RegisterPayload) => {
        const response = await apiRequest<LoginResponse>('/auth/register', {
            method: 'POST',
            body: {
                ...payload,
                device_name: await deviceName(),
            },
        });

        // A newly registered student stays signed in, the same way the
        // website logs them straight into their dashboard after registering.
        await saveToken(response.data.token);

        setToken(response.data.token);
        setUser(toSessionUser(response.data.user));
    }, []);

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

    const markPasswordChanged = useCallback(() => {
        setUser((current) =>
            current ? { ...current, mustChangePassword: false } : current,
        );
    }, []);

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
        () => ({
            user,
            request,
            restoring,
            signIn,
            register,
            signOut,
            markPasswordChanged,
        }),
        [
            user,
            request,
            restoring,
            signIn,
            register,
            signOut,
            markPasswordChanged,
        ],
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
