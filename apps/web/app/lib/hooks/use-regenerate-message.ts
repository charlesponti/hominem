import { getGenerationFailureMessage } from '@hominem/chat';
import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { invalidateChatQueries } from '../chat/chat-cache';
import { consumeSseResponse } from '../chat/consume-sse-response';
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
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [status, setStatus] = useState<RegenerationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const lastRequestRef = useRef<{ messageId: string; responseLength?: ResponseLength } | null>(
    null,
  );
  const cancelRequestedRef = useRef(false);

  const regenerate = useCallback(
    async (messageId: string, responseLength?: ResponseLength) => {
      if (activeMessageId) return;

      const generationId = crypto.randomUUID();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      generationIdRef.current = generationId;
      cancelRequestedRef.current = false;
      lastRequestRef.current = { messageId, ...(responseLength ? { responseLength } : {}) };
      setActiveMessageId(messageId);
      setStatus('preparing');
      setError(null);
      try {
        const response = await client.api.chats[':id'].messages[':messageId'].regenerate.$post(
          {
            param: { id: chatId, messageId },
            json: {
              generationId,
              ...(responseLength ? { responseLength } : {}),
            },
          },
          { init: { signal: abortController.signal } },
        );
        await consumeSseResponse(response, (event) => {
          const failureMessage = getGenerationFailureMessage(event);
          if (failureMessage) throw new Error(failureMessage);
          if ('payload' in event && event.type === 'generation.phase_changed') {
            setStatus(event.payload.phase === 'preparing' ? 'preparing' : 'streaming');
          }
          if ('payload' in event && event.type === 'generation.committed') setStatus('committed');
          if ('payload' in event && event.type === 'generation.cancelled') setStatus('cancelled');
        });
        await invalidateChatQueries(queryClient, chatId);
      } catch (caught) {
        if (
          cancelRequestedRef.current ||
          (caught instanceof DOMException && caught.name === 'AbortError')
        ) {
          setStatus('cancelled');
          await invalidateChatQueries(queryClient, chatId);
        } else {
          setStatus('failed');
          setError(caught instanceof Error ? caught : new Error(String(caught)));
          await invalidateChatQueries(queryClient, chatId);
        }
      } finally {
        abortControllerRef.current = null;
        generationIdRef.current = null;
        setActiveMessageId(null);
      }
    },
    [activeMessageId, chatId, client, queryClient],
  );

  const cancel = useCallback(async () => {
    const generationId = generationIdRef.current;
    const abortController = abortControllerRef.current;
    if (!generationId || !abortController) return;

    cancelRequestedRef.current = true;
    setStatus('stopping');
    try {
      await client.api.chats[':id'].generations[':generationId'].cancel.$post({
        param: { id: chatId, generationId },
      });
      abortController.abort();
    } catch (caught) {
      cancelRequestedRef.current = false;
      setStatus('failed');
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }
  }, [chatId, client]);

  const retry = useCallback(async () => {
    const request = lastRequestRef.current;
    if (!request) return;
    await regenerate(request.messageId, request.responseLength);
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
    status,
  };
}

export type RegeneratingMessage = Pick<ChatMessageDto, 'id'>;
