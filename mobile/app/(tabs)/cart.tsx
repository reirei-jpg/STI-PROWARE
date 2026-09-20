import { ShoppingCart } from 'lucide-react-native';

import ComingSoonScreen from '@/components/ComingSoonScreen';

export default function Cart() {
    return (
        <ComingSoonScreen
            icon={ShoppingCart}
            title="My Cart"
            message="The merchandise you add will appear here, ready for checkout."
        />
    );
}
