import { createGenerationClientState, reduceGenerationClientEvent } from '@hominem/chat';
import {
  createGenerationEventDeduplicator,
  getGenerationFailureMessage,
  toGenerationClientEvents,
} from '@hominem/rpc/generation-events';
import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto, GenerationStreamEvent } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { invalidateChatQueries } from '../chat/chat-cache';
import { consumeSseResponse } from '../chat/consume-sse-response';
import type { ResponseLength } from './use-response-length';

export type StreamStatus =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'stopping'
  | 'cancelled'
  | 'committed'
  | 'failed';

interface StreamInput {
  message: string;
  fileIds?: string[];
  responseLength?: ResponseLength;
  onAccepted?: (userMessage: ChatMessageDto | null) => void;
  onCommitted?: (message: ChatMessageDto) => void;
  onCancelled?: () => void;
  onFailed?: (error: Error) => void;
}

export function useStreamMessage({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient();
  const client = useApiClient();
  const [text, setText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [toolSteps, setToolSteps] = useState<
    Array<{
      toolCallId: string;
      toolName: string;
      status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
    }>
  >([]);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);

  const stream = useCallback(
    async (input: StreamInput) => {
      const generationId = crypto.randomUUID();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      generationIdRef.current = generationId;
      cancelRequestedRef.current = false;
      let terminalStatus: StreamStatus | null = null;
      let lastDurableSequence = 0;
      let shouldReconnect = true;
      const deduplicateEvent = createGenerationEventDeduplicator();
      let clientState = createGenerationClientState(generationId);
      setText('');
      setReasoning('');
      setToolSteps([]);
      setStatus('preparing');
      setError(null);

      const handleEvent = (event: GenerationStreamEvent) => {
        for (const clientEvent of toGenerationClientEvents(event)) {
          clientState = reduceGenerationClientEvent(clientState, clientEvent);
          setText(clientState.text);
          setReasoning(clientState.reasoning);
          setToolSteps([...clientState.toolSteps]);
          if (clientState.phase === 'preparing') setStatus('preparing');
          if (clientState.phase === 'running' || clientState.phase === 'saving') {
            setStatus('streaming');
          }
          if (clientState.phase === 'cancel_requested') setStatus('stopping');
          if (clientState.phase === 'cancelled') setStatus('cancelled');
          if (clientState.phase === 'committed') setStatus('committed');
        }
        const failureMessage = getGenerationFailureMessage(event);
        if (failureMessage) {
          shouldReconnect = false;
          throw new Error(failureMessage);
        }
        const liveEvent = 'event' in event ? event.event : null;

        if ('payload' in event && event.type === 'generation.accepted') {
          input.onAccepted?.(event.payload.userMessage);
          return;
        }

        if ('payload' in event && event.type === 'generation.phase_changed') {
          terminalStatus = clientState.phase === 'preparing' ? 'preparing' : 'streaming';
          return;
        }

        if (liveEvent?.type === 'text-delta') {
          return;
        }

        if (liveEvent?.type === 'reasoning-delta') {
          return;
        }

        if (liveEvent?.type === 'tool-step') {
          return;
        }

        if ('payload' in event && event.type === 'generation.cancelled') {
          terminalStatus = 'cancelled';
          input.onCancelled?.();
          return;
        }

        if ('payload' in event && event.type === 'generation.committed') {
          terminalStatus = 'committed';
          input.onCommitted?.(event.payload.message);
        }
      };
      const consume = (response: Response) =>
        consumeSseResponse(response, handleEvent, undefined, {
          deduplicateEvent,
          onDurableSequence: (sequence) => {
            lastDurableSequence = Math.max(lastDurableSequence, sequence);
          },
        });

      try {
        const streamRes = await client.api.chats[':id'].stream.$post(
          {
            param: { id: chatId },
            json: {
              generationId,
              message: input.message,
              ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
              ...(input.responseLength ? { responseLength: input.responseLength } : {}),
            },
          },
          { init: { signal: abortController.signal } },
        );

        await consume(streamRes);

        if (terminalStatus !== 'cancelled' && !cancelRequestedRef.current) {
          await invalidateChatQueries(queryClient, chatId);
        }
      } catch (caught) {
        if (
          cancelRequestedRef.current ||
          (caught instanceof DOMException && caught.name === 'AbortError')
        ) {
          setStatus('cancelled');
          input.onCancelled?.();
          return;
        }

        let streamError: unknown = caught;
        if (shouldReconnect) {
          try {
            const replayResponse = await client.api.chats[':id'].generations[
              ':generationId'
            ].stream.$get(
              {
                param: { id: chatId, generationId },
              },
              {
                init: {
                  signal: abortController.signal,
                  headers: { 'Last-Event-ID': String(lastDurableSequence) },
                },
              },
            );
            await consume(replayResponse);
            if (terminalStatus !== 'cancelled' && !cancelRequestedRef.current) {
              await invalidateChatQueries(queryClient, chatId);
            }
            return;
          } catch (replayError) {
            streamError = replayError;
          }
        }

        const nextError =
          streamError instanceof Error ? streamError : new Error(String(streamError));
        setError(nextError);
        setStatus('failed');
        input.onFailed?.(nextError);
      } finally {
        abortControllerRef.current = null;
        generationIdRef.current = null;
      }
    },
    [chatId, client, queryClient],
  );

  const cancel = useCallback(async () => {
    const generationId = generationIdRef.current;
    const abortController = abortControllerRef.current;
    if (!generationId || !abortController || status === 'stopping') return;

    cancelRequestedRef.current = true;
    setStatus('stopping');

    try {
      await client.api.chats[':id'].generations[':generationId'].cancel.$post({
        param: { id: chatId, generationId },
      });
      abortController.abort();
      setStatus('cancelled');
    } catch (caught) {
      cancelRequestedRef.current = false;
      setError(caught instanceof Error ? caught : new Error(String(caught)));
      setStatus('failed');
    }
  }, [chatId, client, status]);

  return {
    cancel,
    error,
    generationId: generationIdRef.current,
    isStreaming: status === 'preparing' || status === 'streaming',
    status,
    stream,
    text,
    reasoning,
    toolSteps,
  };
}
