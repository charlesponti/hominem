import { useApiClient } from '@hominem/rpc/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { chatKeys } from '../notes/query-keys';

export function useToolCallRespond({ chatId }: { chatId: string }) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [isResponding, setIsResponding] = useState(false);

  const respond = useCallback(
    async (input: { messageId: string; toolCallId: string; approved: boolean }) => {
      setIsResponding(true);
      try {
        const response = await client.api.chats[':id'].messages[':messageId']['tool-calls'][
          ':toolCallId'
        ].respond.$post({
          param: { id: chatId, messageId: input.messageId, toolCallId: input.toolCallId },
          json: { approved: input.approved },
        });
        await response.text();
      } finally {
        setIsResponding(false);
        await queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatKeys.activeChat(chatId) });
      }
    },
    [chatId, client, queryClient],
  );

  return { isResponding, respond };
}
