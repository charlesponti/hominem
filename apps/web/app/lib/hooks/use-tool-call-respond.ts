import { useSignal } from '@preact/signals-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import { useChatClient } from './use-chat-client';

export function useToolCallRespond({ chatId }: { chatId: string }) {
  const chatClient = useChatClient();
  const queryClient = useQueryClient();
  const isResponding = useSignal(false);

  const respond = useCallback(
    async (input: { messageId: string; toolCallId: string; approved: boolean }) => {
      isResponding.value = true;
      try {
        const generation = chatClient.respondToToolCall({
          chatId,
          messageId: input.messageId,
          toolCallId: input.toolCallId,
          body: { approved: input.approved },
        });
        await generation.done;
      } finally {
        isResponding.value = false;
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      }
    },
    [chatClient, chatId, queryClient, isResponding],
  );

  return { respond, isResponding: isResponding.value };
}
