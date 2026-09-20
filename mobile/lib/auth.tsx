import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { mockLogin, type SessionUser } from './mock-auth';

type AuthContextValue = {
    user: SessionUser | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SessionUser | null>(null);

    const signIn = useCallback(async (email: string, password: string) => {
        setUser(await mockLogin(email, password));
    }, []);

    const signOut = useCallback(() => setUser(null), []);

    const value = useMemo(
        () => ({ user, signIn, signOut }),
        [user, signIn, signOut],
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
