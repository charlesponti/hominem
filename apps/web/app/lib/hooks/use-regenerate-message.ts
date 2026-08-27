import type { ChatMessageDto } from '@hominem/rpc/types';
import { fetchHttpStream, useChat } from '@tanstack/ai-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import type { ResponseLength } from './use-response-length';

export type RegenerationStatus =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'stopping'
  | 'cancelled'
  | 'committed'
  | 'failed';

export function useRegenerateMessage({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient();
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [status, setStatus] = useState<RegenerationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const lastRequestRef = useRef<{ messageId: string; responseLength?: ResponseLength } | null>(
    null,
  );
  const chat = useChat({
    threadId: chatId,
    persistence: true,
    queue: 'drop',
    connection: fetchHttpStream(
      `${import.meta.env.VITE_PUBLIC_API_URL}/api/chats/${chatId}/agent`,
      { credentials: 'include' },
    ),
    onFinish: () => {
      setStatus('committed');
      setActiveMessageId(null);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) }),
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.list }),
      ]);
    },
    onError: (nextError) => {
      setError(nextError);
      setStatus('failed');
      setActiveMessageId(null);
    },
  });

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
      } catch (caught) {
        const nextError = caught instanceof Error ? caught : new Error(String(caught));
        setError(nextError);
        setStatus('failed');
        setActiveMessageId(null);
      }
    },
    [chat],
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
