import { useAuthContext } from '@hominem/auth';
import { useHonoQuery } from '@hominem/hono-client/react';
import type { ChatsListOutput } from '@hominem/hono-rpc/types/chat.types';
import { AppSidebar, type RecentItem } from '@hominem/ui';
import { FileText, Home } from 'lucide-react';
import { useNavigate } from 'react-router';
import { WEB_BRAND } from '~/lib/brand';
import { useDeleteChat } from '../hooks/use-chats';

const navItems = [
  { title: 'Home', url: '/home', icon: Home },
  { title: 'Notes', url: '/notes', icon: FileText },
];

const RECENT_CHATS_LIMIT = 20;

export default function NotesSidebar() {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const deleteChat = useDeleteChat();

  const { data: chats } = useHonoQuery<ChatsListOutput>(
    ['chats', 'sidebar', 'list'],
    ({ chats: c }) => c.list({ limit: RECENT_CHATS_LIMIT }),
  );

  const recentItems: RecentItem[] = (chats ?? []).map((chat) => ({
    id: chat.id,
    title: chat.title || 'Untitled conversation',
    url: `/chat/${chat.id}`,
    updatedAt: chat.updatedAt,
    onDelete: (id) => deleteChat.mutate({ chatId: id }),
  }));

  function handleNewChat() {
    navigate('/chat/new');
  }

  const displayName = auth.user?.name ?? auth.user?.email ?? undefined;
  const email = auth.user?.email ?? undefined;

  return (
    <AppSidebar
      brandName={WEB_BRAND.appName}
      brandIcon={<img src={WEB_BRAND.logoPath} alt={WEB_BRAND.appName} className="size-6 rounded-sm object-cover" />}
      navItems={navItems}
      recentItems={recentItems}
      onNewChat={handleNewChat}
      {...(displayName !== undefined && { userDisplayName: displayName })}
      {...(email !== undefined && { userEmail: email })}
    />
  );
}
