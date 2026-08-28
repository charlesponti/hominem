import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatQueryKeys } from '~/lib/query-keys';
import type { ChatMessageView } from '~/lib/types/chat';

export interface UseChatMessagesOptions {
  chatId: string;
  initialData?: ChatMessageView[];
}

export interface UseChatMessagesReturn {
  messages: ChatMessageView[];
  isLoading: boolean;
  error: Error | null;
  isNotFound: boolean;
  retry: () => Promise<unknown>;
  deleteMessage: (messageId: string) => Promise<void>;
  isDeleting: boolean;
  updateMessage: (messageId: string, content: string) => Promise<void>;
}

function getErrorStatus(error: Error | null): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

export function useChatMessages({
  chatId,
  initialData,
}: UseChatMessagesOptions): UseChatMessagesReturn {
  const client = useApiClient();
  const queryClient = useQueryClient();

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

  const updateMessageMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const response = await client.api.chats[':id'].messages[':messageId'].$patch({
        param: { id: chatId, messageId },
        json: { content },
      });
      if (!response.ok) throw new Error('Unable to update this message.');
      return response.json();
    },
    onMutate: async ({ messageId, content }) => {
      const queryKey = chatQueryKeys.messages(chatId);
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<ChatMessageView[]>(queryKey);
      queryClient.setQueryData<ChatMessageView[]>(queryKey, (currentMessages = []) =>
        currentMessages.map((message) =>
          message.id === messageId
            ? { ...message, content, updatedAt: new Date().toISOString() }
            : message,
        ),
      );
      return { previousMessages };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(chatQueryKeys.messages(chatId), context.previousMessages);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
        queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'message-search'] }),
      ]);
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await client.api.chats[':id'].messages[':messageId'].$delete({
        param: { id: chatId, messageId },
      });
      if (!response.ok) throw new Error('Unable to delete this message.');
      return response.json();
    },
    onMutate: async (messageId) => {
      const queryKey = chatQueryKeys.messages(chatId);
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<ChatMessageView[]>(queryKey);
      queryClient.setQueryData<ChatMessageView[]>(queryKey, (currentMessages = []) => {
        const targetIndex = currentMessages.findIndex((message) => message.id === messageId);
        return targetIndex === -1 ? currentMessages : currentMessages.slice(0, targetIndex);
      });
      return { previousMessages };
    },
    onError: (_error, _messageId, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(chatQueryKeys.messages(chatId), context.previousMessages);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
        queryClient.invalidateQueries({ queryKey: ['chats', chatId, 'message-search'] }),
      ]);
    },
  });

  const messages: ChatMessageView[] = Array.isArray(messagesQuery.data) ? messagesQuery.data : [];
  const isLoading = messagesQuery.isLoading;
  const error = messagesQuery.error;

  return {
    messages,
    isLoading,
    error,
    isNotFound: getErrorStatus(error) === 404,
    retry: messagesQuery.refetch,
    deleteMessage: async (messageId) => {
      if (deleteMessageMutation.isPending) return;
      await deleteMessageMutation.mutateAsync(messageId);
    },
    isDeleting: deleteMessageMutation.isPending,
    updateMessage: async (messageId, content) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) throw new Error('Message content cannot be empty.');
      await updateMessageMutation.mutateAsync({ messageId, content: trimmedContent });
    },
  };
}
