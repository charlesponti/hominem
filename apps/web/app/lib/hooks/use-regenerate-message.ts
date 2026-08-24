import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto, ChatStreamEvent } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import { consumeChatStream } from '../chat/stream-events';

export function useRegenerateMessage({ chatId }: { chatId: string }) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const regenerate = useCallback(
    async (messageId: string) => {
      if (activeMessageId) return;

      setActiveMessageId(messageId);
      setError(null);
      try {
        const response = await client.api.chats[':id'].messages[':messageId'].regenerate.$post({
          param: { id: chatId, messageId },
          json: { generationId: crypto.randomUUID() },
        });
        await consumeChatStream(response, (event: ChatStreamEvent) => {
          if (event.type === 'error') throw new Error(event.message);
        });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.list }),
        ]);
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      } finally {
        setActiveMessageId(null);
      }
    },
    [activeMessageId, chatId, client, queryClient],
  );

  return {
    activeMessageId,
    error,
    isRegenerating: activeMessageId !== null,
    regenerate,
  };
}

export type RegeneratingMessage = Pick<ChatMessageDto, 'id'>;
