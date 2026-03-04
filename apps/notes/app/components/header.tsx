'use client';

import { Header, type NavItem } from '@hominem/ui';
import { Sparkles } from 'lucide-react';

const APP_NAME = 'Animus';

const navItems: NavItem[] = [
  {
    title: 'Notes',
    url: '/notes',
    icon: Sparkles,
  },
  {
    title: 'Chat',
    url: '/chat',
    icon: Sparkles,
  },
];

export default function NotesHeader() {
  return (
    <Header brandName={APP_NAME} brandIcon={<Sparkles className="size-6" />} navItems={navItems} />
  );
}
