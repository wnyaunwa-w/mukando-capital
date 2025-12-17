import { ShoppingCart, PiggyBank, HeartHandshake, Repeat, Cake, Landmark, PartyPopper } from 'lucide-react';

export type GroupType = {
  id: 'GROCERY' | 'SAVINGS' | 'BURIAL' | 'BORROWING' | 'BIRTHDAY' | 'INVESTMENT' | 'SOCIAL';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const GROUP_TYPES: GroupType[] = [
  {
    id: 'GROCERY',
    label: 'Grocery',
    description: 'Pool funds together for bulk grocery purchases.',
    icon: ShoppingCart,
  },
  {
    id: 'SAVINGS',
    label: 'Savings',
    description: 'A general-purpose group for collective savings goals.',
    icon: PiggyBank,
  },
  {
    id: 'BURIAL',
    label: 'Burial Society',
    description: 'Provide financial support to members during times of bereavement.',
    icon: HeartHandshake,
  },
  {
    id: 'BORROWING',
    label: 'Borrowing',
    description: 'A lending circle where members can borrow from the group fund.',
    icon: Repeat,
  },
  {
    id: 'BIRTHDAY',
    label: 'Birthday',
    description: 'Celebrate member birthdays by contributing to a shared gift fund.',
    icon: Cake,
  },
  {
    id: 'INVESTMENT',
    label: 'Investment',
    description: 'Pool capital for joint investment opportunities like stocks or property.',
    icon: Landmark,
  },
  {
    id: 'SOCIAL',
    label: 'Social',
    description: 'Organize and fund social events, gatherings, or trips.',
    icon: PartyPopper,
  },
];
