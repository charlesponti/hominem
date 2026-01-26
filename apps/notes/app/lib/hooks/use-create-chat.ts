import { useQueryClient } from '@tanstack/react-query';
import type { HonoClient } from '@hominem/hono-client';
import { useHonoMutation } from '@hominem/hono-client/react';
import type { ChatsCreateInput, ChatsCreateOutput } from '@hominem/hono-rpc/types';

// Query keys
const QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const, // Note: Hono Query keys might differ, ensure consistency
  // If useHonoQuery uses ['chats'], then invalidating ['chats'] works.
};

/**
 * Hook for creating a new chat
 */
export function useCreateChat(userId: string) {
  const queryClient = useQueryClient();
  
  const createChatMutation = useHonoMutation<ChatsCreateOutput, ChatsCreateInput>(
    async (client: HonoClient, variables: ChatsCreateInput) => {
      const res = await client.api.chats.$post({ json: variables });
      return res.json() as Promise<ChatsCreateOutput>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          // Invalidate chats list. Assuming standard Hono Query key structure or manual keys used elsewhere.
          queryClient.invalidateQueries({ queryKey: ['chats'] });
        }
      },
    }
  );

  return {
    createChat: createChatMutation.mutateAsync,
    isCreating: createChatMutation.isPending,
  };
}
