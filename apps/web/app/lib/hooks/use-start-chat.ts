import { useApiClient } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

interface StartChatInput {
  title: string;
  message: string;
  fileIds?: string[];
  responseLength?: 'short' | 'medium' | 'long';
  onAccepted?: (event: { chatId: string; chat: Chat }) => void;
}

export function useStartChat() {
  const client = useQueryClient();
  const apiClient = useApiClient();

  const mutation = useMutation<Chat, Error, StartChatInput>({
    mutationFn: async ({ title }) => {
      const response = await apiClient.api.chats.$post({ json: { title } });
      if (!response.ok) throw new Error('Unable to create chat.');
      return response.json() as Promise<Chat>;
    },
    onSuccess: (chat) => {
      client.setQueryData(chatQueryKeys.get(chat.id), chat);
      void client.invalidateQueries({ queryKey: chatQueryKeys.list });
    },
  });

  const start = useCallback(
    async (input: StartChatInput) => {
      const chat = await mutation.mutateAsync(input);
      input.onAccepted?.({ chatId: chat.id, chat });
    },
    [mutation],
  );

  const cancel = useCallback(() => undefined, []);

  return {
    cancel,
    error: mutation.error,
    isStarting: mutation.isPending,
    start,
  };
}
