import UnclaimedOrdersView from '@/components/orders/UnclaimedOrdersView';
import type { UnclaimedOrdersProps } from '@/components/orders/UnclaimedOrdersView';
import SpecialistLayout from '@/layouts/SpecialistLayout';

export default function Unclaimed(props: UnclaimedOrdersProps) {
    return (
        <SpecialistLayout>
            <UnclaimedOrdersView {...props} />
        </SpecialistLayout>
    );
}
