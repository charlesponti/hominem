import { useRpcMutation } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types/chat.types';
import { useQueryClient } from '@tanstack/react-query';
import { chatQueryKeys } from '~/lib/query-keys';

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useRpcMutation<{ success: boolean }, { chatId: string }>(
    ({ chats }, variables) => chats.delete(variables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebarList });
      },
    },
  );
}

export function useArchiveChat({ chatId: _chatId, onSuccess }: { chatId: string; onSuccess?: (chat: Chat) => void }) {
  const queryClient = useQueryClient();

  return useRpcMutation<Chat, { chatId: string }>(
    ({ chats }, variables) => chats.archive(variables),
    {
      onSuccess: (chat) => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.sidebarList });
        onSuccess?.(chat);
      },
    },
  );
}
