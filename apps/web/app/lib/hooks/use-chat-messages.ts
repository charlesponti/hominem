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
  isNotFound: boolean;
  retry: () => Promise<unknown>;
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
    queryFn: async () => {
      const response = await client.api.chats[':id'].messages.$get({
        param: { id: chatId },
        query: { limit: '50' },
      });
      if (!response.ok) {
        throw Object.assign(new Error('Unable to load this conversation.'), {
          status: response.status,
        });
      }
      return response.json();
    },
  });

  const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
  const isLoading = messagesQuery.isLoading;
  const error = messagesQuery.error;

  return {
    messages: messages as ChatMessageDto[],
    isLoading,
    error,
    isNotFound: (error as (Error & { status?: number }) | null)?.status === 404,
    retry: messagesQuery.refetch,
    deleteMessage: async () => undefined,
    updateMessage: async () => undefined,
  };
}
