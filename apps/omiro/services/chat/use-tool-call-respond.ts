import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { API_BASE_URL } from '~/constants';
import { useAuth } from '~/services/auth/auth-provider';

import { chatKeys } from '../notes/query-keys';

export function useToolCallRespond({ chatId }: { chatId: string }) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const [isResponding, setIsResponding] = useState(false);

  const respond = useCallback(
    async (input: { messageId: string; toolCallId: string; approved: boolean }) => {
      setIsResponding(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/chats/${chatId}/messages/${input.messageId}/tool-calls/${input.toolCallId}/respond`,
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(await getAuthHeaders()),
            },
            credentials: 'include',
            body: JSON.stringify({ approved: input.approved }),
          },
        );
        if (!response.ok) {
          const message = await response.text().catch(() => '');
          throw new Error(message || `Request failed with status ${response.status}`);
        }
        await response.text();
      } finally {
        setIsResponding(false);
        await queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatKeys.activeChat(chatId) });
      }
    },
    [chatId, getAuthHeaders, queryClient],
  );

  return { isResponding, respond };
}
