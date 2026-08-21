import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { useQuery } from '@tanstack/react-query';

import { chatQueryKeys } from '~/lib/query-keys';

export interface UseChatMessagesOptions {
  chatId: string;
  initialData?: ChatMessageDto[];
}

export interface UseChatMessagesReturn {
  messages: ChatMessageDto[];
  isLoading: boolean;
  error: Error | null;
  deleteMessage: (messageId: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
}

export type ExtendedMessage = ChatMessageDto & {
  isStreaming?: boolean;
};

export function useChatMessages({
  chatId,
  initialData,
}: UseChatMessagesOptions): UseChatMessagesReturn {
  const client = useApiClient();

  const messagesQuery = useQuery({
    queryKey: chatQueryKeys.messages(chatId),
    enabled: !!chatId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
    ...(initialData ? { initialData } : {}),
    queryFn: () =>
      client.api.chats[':id'].messages
        .$get({ param: { id: chatId }, query: { limit: '50' } })
        .then((r) => r.json()),
  });

  const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
  const isLoading = messagesQuery.isLoading;
  const error = messagesQuery.error;

  return {
    messages: messages as ChatMessageDto[],
    isLoading,
    error,
    deleteMessage: async () => undefined,
    updateMessage: async () => undefined,
  };
}
