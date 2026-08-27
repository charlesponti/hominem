import { fetchHttpStream, useChat } from '@tanstack/ai-react';

export function useChatRuntime({ chatId }: { chatId: string }) {
  return useChat({
    threadId: chatId,
    persistence: true,
    queue: 'drop',
    connection: fetchHttpStream(
      `${import.meta.env.VITE_PUBLIC_API_URL}/api/chats/${chatId}/agent`,
      { credentials: 'include' },
    ),
  });
}

export type ChatRuntime = ReturnType<typeof useChatRuntime>;
