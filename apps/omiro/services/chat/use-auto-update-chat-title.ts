import { useApiClient } from '@hominem/rpc/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { chatKeys } from '~/services/notes/query-keys';

import { isDefaultChatTitle, normalizeChatTitle, updateChatTitleCaches } from './chat-title';

export function useAutoUpdateChatTitle(chatId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useCallback(
    async (message: string) => {
      if (!message) {
        return;
      }
      const currentChat = queryClient.getQueryData<{ title: string } | null>(
        chatKeys.activeChat(chatId),
      );
      if (!currentChat || !isDefaultChatTitle(currentChat.title)) {
        return;
      }
      const nextTitle = normalizeChatTitle(message);
      if (isDefaultChatTitle(nextTitle)) {
        return;
      }

      const updatedAt = new Date().toISOString();
      updateChatTitleCaches(queryClient, { chatId, title: nextTitle, updatedAt });
      try {
        await client.api.chats[':id'].$patch({
          param: { id: chatId },
          json: { title: nextTitle },
        });
      } catch {
        await queryClient.invalidateQueries({ queryKey: chatKeys.activeChat(chatId) });
      }
    },
    [chatId, client, queryClient],
  );
}
