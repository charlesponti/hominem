'use client';

import { Header, type NavItem } from '@hominem/ui';
import { ChartLine, CircleDollarSign, Landmark } from 'lucide-react';

const APP_NAME = 'Finance';

const navItems: NavItem[] = [
  {
    title: 'Finance',
    url: '/finance',
    icon: CircleDollarSign,
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: ChartLine,
  },
  {
    title: 'Accounts',
    url: '/accounts',
    icon: Landmark,
  },
];

export default function FinanceHeader() {
  return (
    <Header
      brandName={APP_NAME}
      brandIcon={<img src="/logo-finance.png" alt={APP_NAME} className="size-6" />}
      navItems={navItems}
    />
  );
}
