import { useState } from 'react';
import { data, redirect, useNavigate } from 'react-router';

import { ChatHomePage } from '~/components/chat/chat-home-page';
import { normalizeChatTitle } from '~/lib/chat/chat-title';
import { serverEnv } from '~/lib/env.server';
import { useOnlineStatus } from '~/lib/hooks/use-online-status';
import { useResponseLength } from '~/lib/hooks/use-response-length';
import { useStartChat } from '~/lib/hooks/use-start-chat';

import type { Route } from './+types/home';

type ChatListItem = { id: string; updatedAt: string };
type ChatListPage = { items: ChatListItem[] };

// React Router requires route loaders to be exported from route modules.
// This is intentionally a framework boundary, not a component module export.
// eslint-disable-next-line react-doctor/only-export-components
export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;
  const apiUrl = serverEnv.HOMINEM_INTERNAL_API_URL;

  const listResponse = await fetch(new URL('/api/chats?limit=1', apiUrl).toString(), {
    headers,
    signal: request.signal,
  });
  const chats = listResponse.ok ? ((await listResponse.json()) as ChatListPage).items : [];

  if (chats[0]?.id) {
    throw redirect(`/chat/${chats[0].id}`);
  }

  return data({ hasChats: false });
}

export default function HomePage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState('');
  const startChat = useStartChat();
  const isOnline = useOnlineStatus();
  const { responseLength } = useResponseLength();

  async function handleSubmit() {
    const message = draft.trim();
    if (!message || startChat.isStarting || !isOnline) return;

    await startChat.start({
      message,
      title: normalizeChatTitle(message),
      responseLength,
      onAccepted: (event) => {
        setDraft('');
        navigate(`/chat/${event.chatId}`, {
          state: { initialAgentSend: { message, responseLength } },
          viewTransition: true,
        });
      },
    });
  }

  return (
    <ChatHomePage
      draft={draft}
      error={startChat.error?.message}
      isOffline={!isOnline}
      isSubmitting={startChat.isStarting}
      onChangeDraft={setDraft}
      onSubmit={() => void handleSubmit()}
    />
  );
}
