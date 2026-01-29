import type { HonoClient } from '@hominem/hono-client';
import type { ChatsUpdateOutput } from '@hominem/hono-rpc/types';

import { useHonoMutation } from '@hominem/hono-client/react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for updating chat title
 */
export function useUpdateChatTitle(_userId: string) {
  const queryClient = useQueryClient();

  const updateTitleMutation = useHonoMutation<ChatsUpdateOutput, { chatId: string; title: string }>(
    async (client: HonoClient, variables: { chatId: string; title: string }) => {
      const { chatId, title } = variables;
      const res = await client.api.chats[':id'].$patch({
        param: { id: chatId },
        json: { title },
      });
      return res.json() as Promise<ChatsUpdateOutput>;
    },
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        queryClient.invalidateQueries({ queryKey: ['chats', variables.chatId] });
      },
    },
  );

  return {
    updateTitle: updateTitleMutation.mutateAsync,
    isUpdatingTitle: updateTitleMutation.isPending,
  };
}
