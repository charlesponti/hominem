import { useRpcMutation } from '@hominem/rpc/react';
import { useQueryClient } from '@tanstack/react-query';

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useRpcMutation<{ success: boolean }, { chatId: string }>(
    ({ chats }, variables) => chats.delete(variables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['chats', 'sidebar', 'list'] });
      },
    },
  );
}
