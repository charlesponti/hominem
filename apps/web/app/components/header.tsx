'use client';

import { Header, type NavItem } from '@hominem/ui';
import { FileText, Home, MessageSquare } from 'lucide-react';
import { useMemo } from 'react';

import { useInboxStream } from '~/hooks/use-inbox-stream';
import { WEB_BRAND } from '~/lib/brand';

export default function NotesHeader() {
  const { items } = useInboxStream();

  const navItems = useMemo<NavItem[]>(() => {
    const latestNote = items.find((item) => item.kind === 'note');
    const latestChat = items.find((item) => item.kind === 'chat');

    return [
      { title: 'Home', url: '/home', icon: Home },
      { title: 'Notes', url: latestNote ? `/notes/${latestNote.id}` : '/notes/new', icon: FileText },
      { title: 'Chats', url: latestChat ? `/chat/${latestChat.id}` : '/home', icon: MessageSquare },
    ];
  }, [items]);

  return (
    <Header
      brandName={WEB_BRAND.appName}
      brandIcon={<img src={WEB_BRAND.logoPath} alt={WEB_BRAND.appName} className="size-6 rounded-md object-cover" />}
      navItems={navItems}
    />
  );
}
