import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeInboxStreamItem } from '~/services/inbox/inbox-refresh';
import { clearResumeTarget, readResumeTarget } from '~/services/navigation/launch-state';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

interface UseChatArchiveOptions {
  chatId: string;
  onSuccess?: () => void;
}

export function useChatArchive({ chatId, onSuccess }: UseChatArchiveOptions) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await client.api.chats[':id'].archive.$post({ param: { id: chatId } });
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.pages() });
      const previousInboxPages = queryClient.getQueriesData({
        queryKey: inboxKeys.pages(),
      });

      removeInboxStreamItem(queryClient, { kind: 'chat', entityId: chatId });

      return { previousInboxPages };
    },
    onError: (_error, _variables, context) => {
      context?.previousInboxPages.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (archivedChat) => {
      if (readResumeTarget()?.id === chatId) {
        clearResumeTarget();
      }
      queryClient.setQueryData(chatKeys.activeChat(chatId), archivedChat);
      queryClient.setQueryData<string[] | undefined>(chatKeys.archivedChats, (ids) =>
        ids ? [chatId, ...ids.filter((id) => id !== chatId)] : [chatId],
      );
      onSuccess?.();
    },
  });
}
