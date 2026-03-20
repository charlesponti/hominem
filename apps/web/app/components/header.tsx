'use client';

import { Header, type NavItem } from '@hominem/ui';
import { FileText, Home } from 'lucide-react';
import { WEB_BRAND } from '~/lib/brand';

const navItems: NavItem[] = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Notes', url: '/notes', icon: FileText },
];

export default function NotesHeader() {
  return (
    <Header
      brandName={WEB_BRAND.appName}
      brandIcon={<img src={WEB_BRAND.logoPath} alt={WEB_BRAND.appName} className="size-6 rounded-md object-cover" />}
      navItems={navItems}
    />
  );
}
