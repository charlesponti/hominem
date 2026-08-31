import { useApiClient } from '@hominem/rpc/react';
import type { ChatSourceDto } from '@hominem/rpc/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatQueryKeys } from '~/lib/query-keys';

export function useChatSources(chatId: string) {
  const client = useApiClient();

  return useQuery<ChatSourceDto[]>({
    queryKey: chatQueryKeys.sources(chatId),
    queryFn: async () => {
      const res = await client.api.chats[':id'].sources.$get({ param: { id: chatId } });
      return res.json();
    },
    enabled: Boolean(chatId),
  });
}

/**
 * chatId is passed per-mutation instead of to the hook itself, since a
 * composer might attach a seeded note before chatId is stable for the
 * whole lifetime of the hook.
 */
export function useAddChatSource() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, noteId }: { chatId: string; noteId: string }) => {
      const res = await client.api.chats[':id'].sources.$post({
        param: { id: chatId },
        json: { noteId },
      });
      return res.json();
    },
    onSuccess: (_data, { chatId }) => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.sources(chatId) });
    },
  });
}

export function useRemoveChatSource(chatId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await client.api.chats[':id'].sources[':noteId'].$delete({
        param: { id: chatId, noteId },
      });
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.sources(chatId) });
    },
  });
}
