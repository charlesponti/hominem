'use client';

import { Header, type NavItem } from '@hominem/ui';
import { FileText, Home } from 'lucide-react';

const APP_NAME = 'Animus';

const navItems: NavItem[] = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Notes', url: '/notes', icon: FileText },
];

export default function NotesHeader() {
  return (
    <Header
      brandName={APP_NAME}
      brandIcon={<img src="/logo.png" alt={APP_NAME} className="size-6 rounded-sm object-cover" />}
      navItems={navItems}
    />
  );
}
