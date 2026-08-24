import { useState } from 'react';
import { data, redirect, useNavigate } from 'react-router';

import { ChatHomePage } from '~/components/chat/chat-home-page';
import { normalizeChatTitle } from '~/lib/chat/chat-title';
import { serverEnv } from '~/lib/env.server';
import { useStartChat } from '~/lib/hooks/use-start-chat';

import type { Route } from './+types/home';

type ChatListItem = { id: string; updatedAt: string };

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;
  const apiUrl = serverEnv.HOMINEM_INTERNAL_API_URL;

  const listResponse = await fetch(new URL('/api/chats?limit=1', apiUrl).toString(), { headers });
  const chats = listResponse.ok ? ((await listResponse.json()) as ChatListItem[]) : [];

  if (chats[0]?.id) {
    throw redirect(`/chat/${chats[0].id}`);
  }

  return data({ hasChats: false });
}

export default function HomePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const startChat = useStartChat();

  async function handleSubmit() {
    const message = draft.trim();
    if (!message || startChat.isStarting) return;

    await startChat.start({
      message,
      title: normalizeChatTitle(message),
      onAccepted: (event) => {
        setDraft('');
        navigate(`/chat/${event.chatId}`);
      },
    });
  }

  return (
    <ChatHomePage
      draft={draft}
      error={startChat.error?.message}
      isSubmitting={startChat.isStarting}
      onChangeDraft={setDraft}
      onSubmit={() => void handleSubmit()}
    />
  );
}
