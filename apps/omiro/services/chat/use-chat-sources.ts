import { useApiClient } from '@hominem/rpc/react';
import type { ChatSourceDto } from '@hominem/rpc/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { chatKeys } from '~/services/notes/query-keys';

export function useChatSources(chatId: string) {
  const client = useApiClient();

  return useQuery<ChatSourceDto[]>({
    queryKey: chatKeys.sources(chatId),
    queryFn: async () => {
      const res = await client.api.chats[':id'].sources.$get({ param: { id: chatId } });
      return res.json();
    },
    enabled: Boolean(chatId),
  });
}

/**
 * chatId is a mutation-time argument rather than a hook-level one, since
 * "start a chat from this note" only learns the new chat's id once the
 * start-stream call resolves -- unlike useChatSources/useRemoveChatSource,
 * which manage sources for an already-known chat.
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
      void queryClient.invalidateQueries({ queryKey: chatKeys.sources(chatId) });
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
      void queryClient.invalidateQueries({ queryKey: chatKeys.sources(chatId) });
    },
  });
}
