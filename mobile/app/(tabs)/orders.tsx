import { Package } from 'lucide-react-native';

import ComingSoonScreen from '@/components/ComingSoonScreen';

export default function Orders() {
    return (
        <ComingSoonScreen
            icon={Package}
            title="My Orders"
            message="Your orders, payment QR codes and pickup status will appear here."
        />
    );
}
