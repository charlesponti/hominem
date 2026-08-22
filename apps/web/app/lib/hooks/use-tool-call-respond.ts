import { useApiClient } from '@hominem/rpc/react';
import { useSignal } from '@preact/signals-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

export function useToolCallRespond({ chatId }: { chatId: string }) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const isResponding = useSignal(false);

  const respond = useCallback(
    async (input: { messageId: string; toolCallId: string; approved: boolean }) => {
      isResponding.value = true;
      try {
        const res = await client.api.chats[':id'].messages[':messageId']['tool-calls'][
          ':toolCallId'
        ].respond.$post({
          param: { id: chatId, messageId: input.messageId, toolCallId: input.toolCallId },
          json: { approved: input.approved, generationId: crypto.randomUUID() },
        });

        // Rejections return a plain JSON message; approvals return an SSE
        // stream (same shape as /stream) that we don't need to render
        // incrementally here — just drain it, then let the invalidated
        // query pick up the final persisted state.
        const body = res.body;
        if (body) {
          const reader = body.getReader();
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        }
      } finally {
        isResponding.value = false;
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      }
    },
    [chatId, client, queryClient, isResponding],
  );

  return { respond, isResponding: isResponding.value };
}
