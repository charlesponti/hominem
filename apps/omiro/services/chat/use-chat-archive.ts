import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useInboxItemRemoval } from '~/services/inbox/use-inbox-item-removal';
import { chatKeys } from '~/services/notes/query-keys';

interface UseChatArchiveOptions {
  chatId: string;
  onSuccess?: () => void;
}

export function useChatArchive({ chatId, onSuccess }: UseChatArchiveOptions) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const removal = useInboxItemRemoval({ kind: 'chat', entityId: chatId });

  return useMutation({
    mutationFn: async () => {
      const res = await client.api.chats[':id'].archive.$post({ param: { id: chatId } });
      return res.json();
    },
    onMutate: removal.onMutate,
    onError: removal.onError,
    onSuccess: (archivedChat) => {
      removal.clearResumeTargetIfMatch();
      queryClient.setQueryData(chatKeys.activeChat(chatId), archivedChat);
      queryClient.setQueryData<string[] | undefined>(chatKeys.archivedChats, (ids) =>
        ids ? [chatId, ...ids.filter((id) => id !== chatId)] : [chatId],
      );
      onSuccess?.();
    },
  });
}
