'use client';

import { Header, type NavItem } from '@hominem/ui';
import { Globe2Icon, List, UserPlus } from 'lucide-react';

const APP_NAME = 'Rocco';

const navItems: NavItem[] = [
  {
    title: 'Explore',
    url: '/',
    icon: Globe2Icon,
  },
  {
    title: 'Lists',
    url: '/lists',
    icon: List,
  },
  {
    title: 'Invites',
    url: '/invites',
    icon: UserPlus,
  },
];

export default function RoccoHeader() {
  return (
    <Header
      brandName={APP_NAME}
      brandIcon={<img src="/icons/favicon-96x96.png" alt={APP_NAME} className="size-6" />}
      navItems={navItems}
    />
  );
}
