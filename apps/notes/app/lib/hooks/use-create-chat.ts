import { useQueryClient } from '@tanstack/react-query';

import { trpc } from '../trpc';

// Query keys
const QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const,
  chatStats: (userId: string) => ['chatStats', userId] as const,
};

/**
 * Hook for creating a new chat
 */
export function useCreateChat(userId: string) {
  const queryClient = useQueryClient();
  const createChatMutation = trpc.chats.createChat.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chatStats(userId) });
      }
    },
  });

  return {
    createChat: createChatMutation.mutateAsync,
    isCreating: createChatMutation.isPending,
  };
}
