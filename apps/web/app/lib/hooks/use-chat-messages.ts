import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react';
import { useQueryClient } from '@tanstack/react-query';
import type {
  MessagesDeleteOutput,
  MessagesUpdateOutput,
} from '@hominem/rpc/types/chat.types';

import { chatQueryKeys } from '~/lib/query-keys';

export interface UseChatMessagesOptions {
  chatId: string;
}

export interface UseChatMessagesReturn {
  messages: import('@hominem/rpc/types/chat.types').ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  deleteMessage: (messageId: string) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
}

export type ExtendedMessage = import('@hominem/rpc/types/chat.types').ChatMessage & {
  isStreaming?: boolean;
};

export function useChatMessages({ chatId }: UseChatMessagesOptions): UseChatMessagesReturn {
  const queryClient = useQueryClient();

  const messagesQuery = useRpcQuery(
    ({ chats }) => chats.getMessages({ chatId, limit: 50 }),
    {
      queryKey: chatQueryKeys.messages(chatId),
      enabled: !!chatId,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const messages = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
  const isLoading = messagesQuery.isLoading;
  const error = messagesQuery.error;

  const deleteMessageMutation = useRpcMutation<MessagesDeleteOutput, { messageId: string }>(
    ({ messages }, variables) => messages.delete(variables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      },
    },
  );

  const updateMessageMutation = useRpcMutation<
    MessagesUpdateOutput,
    { messageId: string; content: string }
  >(({ messages }, variables) => messages.update(variables), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
    },
  });

  const deleteMessage = async (messageId: string) => {
    await deleteMessageMutation.mutateAsync({ messageId });
  };

  const updateMessage = async (messageId: string, content: string) => {
    await updateMessageMutation.mutateAsync({ messageId, content });
  };

  return {
    messages,
    isLoading,
    error,
    deleteMessage,
    updateMessage,
  };
}
