import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { chatKeys } from '~/services/notes/query-keys';

interface CreateChatInput {
  title: string;
}

export function useCreateChat() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title }: CreateChatInput) => {
      const res = await client.api.chats.$post({ json: { title } });
      return res.json();
    },
    onSuccess: (chat) => {
      queryClient.setQueryData(chatKeys.activeChat(chat.id), chat);
      void invalidateInboxQueries(queryClient);
    },
  });
}
