import { useApiClient } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types/chat.types';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatQueryKeys } from '~/lib/query-keys';

export function useChatsList() {
  const client = useApiClient();

  return useQuery({
    queryKey: chatQueryKeys.list,
    staleTime: 1000 * 30,
    queryFn: () => client.api.chats.$get({ query: { limit: '100' } }).then((r) => r.json()),
  });
}

export function useChatLastMessages(chatIds: string[]) {
  const client = useApiClient();

  return useQueries({
    queries: chatIds.map((chatId) => ({
      queryKey: [...chatQueryKeys.messages(chatId), 'latest'],
      queryFn: () =>
        client.api.chats[':id'].messages
          .$get({ param: { id: chatId }, query: { limit: '1' } })
          .then((response) => response.json()),
      staleTime: 1000 * 30,
    })),
  });
}

export function useCreateChat() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { title: string }) =>
      client.api.chats
        .$post({ json: { title: variables.title } })
        .then((r) => r.json() as Promise<Chat>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
    },
  });
}

export function useArchiveChat({
  chatId: _chatId,
  onSuccess,
}: {
  chatId: string;
  onSuccess?: (chat: Chat) => void;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { chatId: string }) =>
      client.api.chats[':id'].archive
        .$post({ param: { id: variables.chatId } })
        .then((r) => r.json() as Promise<Chat>),
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
      onSuccess?.(chat);
    },
  });
}
