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

            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#F3F7FA' },
                }}
            />
        </SafeAreaProvider>
    );
}
