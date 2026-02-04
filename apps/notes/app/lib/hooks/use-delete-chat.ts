import type { HonoClient } from '@hominem/hono-client';
import type { ChatsDeleteOutput } from '@hominem/hono-rpc/types/chat.types';

import { useHonoMutation } from '@hominem/hono-client/react';
import { useQueryClient } from '@tanstack/react-query';

// Query keys
const _QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const,
  chatStats: (userId: string) => ['chatStats', userId] as const,
  chat: (chatId: string) => ['chat', chatId] as const,
};

/**
 * Hook for deleting a chat
 */
export function useDeleteChat(_userId: string) {
  const queryClient = useQueryClient();

  const deleteChatMutation = useHonoMutation<ChatsDeleteOutput, { chatId: string }>(
    async (client: HonoClient, variables: { chatId: string }) => {
      const res = await client.api.chats[':id'].$delete({ param: { id: variables.chatId } });
      return res.json() as Promise<ChatsDeleteOutput>;
    },
    {
      onSuccess: (_, variables) => {
        // Simplified invalidation logic
        queryClient.invalidateQueries({ queryKey: ['chats'] });
        queryClient.removeQueries({ queryKey: ['chats', variables.chatId] });
      },
    },
  );

  return {
    deleteChat: deleteChatMutation.mutateAsync,
    isDeleting: deleteChatMutation.isPending,
  };
}
