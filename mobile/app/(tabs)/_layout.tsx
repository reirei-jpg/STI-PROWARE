import { Tabs } from 'expo-router';
import {
    Clock3,
    Home,
    Package,
    ShoppingCart,
    UserRound,
} from 'lucide-react-native';

const BRAND_BLUE = '#0D6EFD';
const INACTIVE = '#94a3b8';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: BRAND_BLUE,
                tabBarInactiveTintColor: INACTIVE,
                tabBarLabelStyle: {
                    fontFamily: 'InstrumentSans_600SemiBold',
                    fontSize: 11,
                },
                tabBarStyle: {
                    backgroundColor: '#ffffff',
                    borderTopColor: '#e2e8f0',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Home color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarIcon: ({ color, size }) => (
                        <ShoppingCart color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ color, size }) => (
                        <Package color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="preorders"
                options={{
                    title: 'Preorders',
                    tabBarIcon: ({ color, size }) => (
                        <Clock3 color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <UserRound color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}
