import { useApiClient } from '@hominem/rpc/react';
import type { Chat } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { OFFLINE_UNAVAILABLE_ERROR } from '~/services/chat/chat-errors';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { writePendingChatStart } from '~/services/navigation/launch-state';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';

interface StartChatOptions {
  onAccepted?: (event: { chatId: string; chat: Chat }) => void;
}

type StartChatInput = {
  title: string;
  message: string;
  fileIds?: string[];
};

export function useStartChat() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const mutation = useMutation<string, Error, StartChatInput & StartChatOptions>({
    mutationFn: async ({ onAccepted, ...input }) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        throw new Error(OFFLINE_UNAVAILABLE_ERROR);
      }

      const response = await apiClient.api.chats.$post({ json: { title: input.title } });
      if (!response.ok) throw new Error('Unable to create chat.');
      const chat = (await response.json()) as Chat;
      writePendingChatStart(chat.id, {
        message: input.message,
        ...(input.fileIds ? { fileIds: input.fileIds } : {}),
        responseLength: getChatResponseLength(),
        responseModality: 'text',
      });
      queryClient.setQueryData(chatKeys.activeChat(chat.id), chat);
      void Promise.all([
        invalidateInboxQueries(queryClient),
        invalidateChatQueries(queryClient, chat.id),
      ]);
      onAccepted?.({ chatId: chat.id, chat });
      return chat.id;
    },
  });

  const startChat = useCallback(
    async (input: StartChatInput & StartChatOptions) => mutation.mutateAsync(input),
    [mutation],
  );

  return {
    isStartingChat: mutation.isPending,
    startChat: startChat as (input: StartChatInput & StartChatOptions) => Promise<string>,
  };
}
