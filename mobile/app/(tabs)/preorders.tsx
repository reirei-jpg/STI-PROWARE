import { Clock3 } from 'lucide-react-native';

import ComingSoonScreen from '@/components/ComingSoonScreen';

export default function Preorders() {
    return (
        <ComingSoonScreen
            icon={Clock3}
            title="My Preorders"
            message="Preorders waiting for stock, ready for payment or paid will appear here."
        />
    );
}
