import '../global.css';

import {
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    useFonts,
} from '@expo-google-fonts/instrument-sans';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth';
import { CartProvider } from '@/lib/cart-context';
import { NotificationsProvider } from '@/lib/notifications-context';
import PushHandler from '@/lib/push';

function RootNavigator() {
    const { user, restoring } = useAuth();
    const isSignedIn = user !== null;
    const mustChangePassword = isSignedIn && user.mustChangePassword;

    if (restoring) {
        return null;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#F3F7FA' },
            }}
        >
            {/* Listed first so "(tabs)" stays the default landing screen
                whenever this group is active (normal signed-in browsing). */}
            <Stack.Protected guard={isSignedIn && !mustChangePassword}>
                <Stack.Screen name="(tabs)" />

                <Stack.Screen name="product/[id]" />

                <Stack.Screen name="checkout" />

                <Stack.Screen name="order/[id]" />

                <Stack.Screen name="pay/[id]" />

                <Stack.Screen name="notifications" />
            </Stack.Protected>

            {/* A student signed in with a temporary password (e.g. an
                admin-created account) can reach only this screen until they
                set a permanent one — the mobile equivalent of the website's
                ForcePasswordChange middleware. Since the group above is
                excluded while mustChangePassword is true, this becomes the
                sole (and therefore default) screen in that case. */}
            <Stack.Protected guard={isSignedIn}>
                <Stack.Screen name="change-password" />
            </Stack.Protected>

            <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name="login" />
            </Stack.Protected>
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        InstrumentSans_400Regular,
        InstrumentSans_500Medium,
        InstrumentSans_600SemiBold,
        InstrumentSans_700Bold,
    });

    if (!fontsLoaded) {
        return null;
    }

    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />

            <AuthProvider>
                <CartProvider>
                    <NotificationsProvider>
                        <RootNavigator />

                        <PushHandler />
                    </NotificationsProvider>
                </CartProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
