import { xhrHttpStream, useChat } from '@tanstack/ai-react';
import { createContext, useContext, type PropsWithChildren } from 'react';

import { API_BASE_URL } from '~/constants';
import { useAuth } from '~/services/auth/auth-provider';

type ChatRuntime = ReturnType<typeof useChat>;
const ChatRuntimeContext = createContext<ChatRuntime | null>(null);

export function ChatRuntimeProvider({ chatId, children }: PropsWithChildren<{ chatId: string }>) {
  const { getAuthHeaders } = useAuth();
  const runtime = useChat({
    threadId: chatId,
    persistence: true,
    queue: 'drop',
    connection: xhrHttpStream(`${API_BASE_URL}/api/chats/${chatId}/agent`, async () => ({
      headers: await getAuthHeaders(),
      withCredentials: true,
    })),
  });

  return <ChatRuntimeContext.Provider value={runtime}>{children}</ChatRuntimeContext.Provider>;
}

export function useChatRuntime() {
  const runtime = useContext(ChatRuntimeContext);
  if (!runtime) throw new Error('useChatRuntime must be used inside ChatRuntimeProvider');
  return runtime;
}

export type { ChatRuntime };
