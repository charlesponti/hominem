'use client';

import { Header, type NavItem } from '@hominem/ui';
import { Home, Sparkles, NotebookText } from 'lucide-react';

const APP_NAME = 'Animus';

const navItems: NavItem[] = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Notes', url: '/notes', icon: NotebookText },
];

export default function NotesHeader() {
  return (
    <Header brandName={APP_NAME} brandIcon={<Sparkles className="size-6" />} navItems={navItems} />
  );
}
