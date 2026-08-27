import type { ChatMessageDto } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import type { ChatRuntime } from './use-chat-runtime';
import type { ResponseLength } from './use-response-length';

export type RegenerationStatus =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'stopping'
  | 'cancelled'
  | 'committed'
  | 'failed';

export function useRegenerateMessage({
  chatId,
  runtime,
}: {
  chatId: string;
  runtime: ChatRuntime;
}) {
  const queryClient = useQueryClient();
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [status, setStatus] = useState<RegenerationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const lastRequestRef = useRef<{ messageId: string; responseLength?: ResponseLength } | null>(
    null,
  );
  const chat = runtime;

  const regenerate = useCallback(
    async (messageId: string, responseLength?: ResponseLength) => {
      if (chat.isLoading) return;
      setActiveMessageId(messageId);
      setStatus('preparing');
      setError(null);
      lastRequestRef.current = { messageId, ...(responseLength ? { responseLength } : {}) };
      try {
        await chat.sendMessage('', {
          body: {
            operation: { kind: 'regenerate', assistantMessageId: messageId, responseLength },
          },
        });
        setStatus('committed');
        setActiveMessageId(null);
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.list }),
        ]);
      } catch (caught) {
        const nextError = caught instanceof Error ? caught : new Error(String(caught));
        setError(nextError);
        setStatus('failed');
        setActiveMessageId(null);
      }
    },
    [chat, chatId, queryClient],
  );

  const cancel = useCallback(() => {
    setStatus('stopping');
    if (chat.runId) {
      void fetch(
        `${import.meta.env.VITE_PUBLIC_API_URL}/api/chats/${chatId}/agent/runs/${chat.runId}/cancel`,
        { method: 'POST', credentials: 'include' },
      );
    }
    chat.stop();
    setStatus('cancelled');
    setActiveMessageId(null);
  }, [chat, chatId]);

  const retry = useCallback(() => {
    const request = lastRequestRef.current;
    if (request) void regenerate(request.messageId, request.responseLength);
  }, [regenerate]);

  return {
    activeMessageId,
    cancel,
    error,
    isRegenerating: activeMessageId !== null,
    isStopping: status === 'stopping',
    lastMessageId: lastRequestRef.current?.messageId ?? null,
    regenerate,
    retry,
    status: chat.isLoading ? 'streaming' : status,
  };
}

export type RegeneratingMessage = Pick<ChatMessageDto, 'id'>;
