import { useQueryClient } from '@tanstack/react-query';

import { trpc } from '../trpc';

// Query keys
const QUERY_KEYS = {
  chats: (userId: string) => ['chats', userId] as const,
  chat: (chatId: string) => ['chat', chatId] as const,
};

/**
 * Hook for updating chat title
 */
export function useUpdateChatTitle(userId: string) {
  const queryClient = useQueryClient();
  const updateTitleMutation = trpc.chats.updateChatTitle.useMutation({
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chats(userId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chat(variables.chatId) });
    },
  });

  return {
    updateTitle: updateTitleMutation.mutateAsync,
    isUpdatingTitle: updateTitleMutation.isPending,
  };
}
