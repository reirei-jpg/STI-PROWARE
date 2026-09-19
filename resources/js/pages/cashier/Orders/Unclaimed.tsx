import UnclaimedOrdersView from '@/components/orders/UnclaimedOrdersView';
import type { UnclaimedOrdersProps } from '@/components/orders/UnclaimedOrdersView';
import CashierLayout from '@/layouts/CashierLayout';

export default function Unclaimed(props: UnclaimedOrdersProps) {
    return (
        <CashierLayout>
            <UnclaimedOrdersView {...props} />
        </CashierLayout>
    );
}
