import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { invalidateChatQueries } from '../chat/chat-cache';
import { useChatClient } from './use-chat-client';
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
  const chatClient = useChatClient();
  const queryClient = useQueryClient();
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [status, setStatus] = useState<RegenerationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const generationRef = useRef<ReturnType<typeof chatClient.createGeneration> | null>(null);
  const lastRequestRef = useRef<{ messageId: string; responseLength?: ResponseLength } | null>(
    null,
  );

  const regenerate = useCallback(
    async (messageId: string, responseLength?: ResponseLength) => {
      if (activeMessageId) return;
      const generation = chatClient.regenerate({
        chatId,
        target: { messageId },
        body: {
          ...(responseLength ? { responseLength } : {}),
        },
      });
      generationRef.current = generation;
      lastRequestRef.current = { messageId, ...(responseLength ? { responseLength } : {}) };
      setActiveMessageId(messageId);
      setStatus('preparing');
      setError(null);
      const unsubscribe = generation.subscribe((_state, event) => {
        if ('event' in event) {
          setStatus('failed');
          setError(new Error(event.event.message));
          return;
        }
        if (event.type === 'generation.failed') {
          setStatus('failed');
          setError(new Error(event.payload.message));
          return;
        }
        if (event.type === 'generation.phase_changed') {
          setStatus(event.payload.phase === 'preparing' ? 'preparing' : 'streaming');
        }
        if (event.type === 'generation.cancelled') setStatus('cancelled');
        if (event.type === 'generation.committed') setStatus('committed');
      });
      try {
        const completed = await generation.done;
        if (completed.phase === 'failed') {
          throw new Error(completed.error ?? 'Generation failed.');
        }
        await invalidateChatQueries(queryClient, chatId);
      } catch (caught) {
        setStatus(generation.state.phase === 'cancelled' ? 'cancelled' : 'failed');
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        await invalidateChatQueries(queryClient, chatId);
      } finally {
        unsubscribe();
        generationRef.current = null;
        setActiveMessageId(null);
      }
    },
    [activeMessageId, chatClient, chatId, queryClient],
  );

  const cancel = useCallback(async () => {
    const generation = generationRef.current;
    if (!generation) return;
    setStatus('stopping');
    try {
      await chatClient.cancel({ chatId, generationId: generation.state.generationId });
      generation.cancel();
    } catch (caught) {
      setStatus('failed');
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }
  }, [chatClient, chatId]);

  const retry = useCallback(async () => {
    const request = lastRequestRef.current;
    if (request) await regenerate(request.messageId, request.responseLength);
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

export type RegeneratingMessage = { id: string };
