import {
  createGenerationClientState,
  reduceGenerationClientEvent,
  createGenerationEventDeduplicator,
  getGenerationFailureMessage,
  parseGenerationClientCheckpoint,
  toGenerationClientCheckpoint,
} from '@hominem/chat';
import type { GenerationClientState, GenerationWireEvent } from '@hominem/chat';
import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { invalidateChatQueries } from '../chat/chat-cache';
import { consumeSseResponse } from '../chat/consume-sse-response';
import type { ResponseLength } from './use-response-length';

export type StreamStatus =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'awaiting_confirmation'
  | 'stopping'
  | 'cancelled'
  | 'committed'
  | 'failed';

function generationStorageKey(chatId: string) {
  return `chat-generation:${chatId}`;
}

function readGenerationCheckpoint(chatId: string) {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(generationStorageKey(chatId));
  if (!raw) return null;
  try {
    return parseGenerationClientCheckpoint(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(generationStorageKey(chatId));
    return null;
  }
}

function statusFromPhase(phase: GenerationClientState['phase']): StreamStatus {
  if (phase === 'preparing') return 'preparing';
  if (phase === 'awaiting_confirmation') return 'awaiting_confirmation';
  if (phase === 'cancel_requested') return 'stopping';
  if (phase === 'cancelled') return 'cancelled';
  if (phase === 'committed') return 'committed';
  if (phase === 'failed') return 'failed';
  return 'streaming';
}

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
  const [restoredCheckpoint] = useState(() => readGenerationCheckpoint(chatId));
  const [text, setText] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [toolSteps, setToolSteps] = useState<
    Array<{
      toolCallId: string;
      toolName: string;
      status: 'requested' | 'running' | 'completed' | 'failed' | 'reused';
    }>
  >([]);
  const [status, setStatus] = useState<StreamStatus>(
    restoredCheckpoint ? statusFromPhase(restoredCheckpoint.phase) : 'idle',
  );
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef<string | null>(restoredCheckpoint?.generationId ?? null);
  const resumedGenerationRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);

  const persistCheckpoint = useCallback(
    (state: GenerationClientState) => {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        generationStorageKey(chatId),
        JSON.stringify(toGenerationClientCheckpoint(state)),
      );
    },
    [chatId],
  );

  const clearCheckpoint = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(generationStorageKey(chatId));
  }, [chatId]);

  const applyRestoredEvent = useCallback(
    (state: GenerationClientState, event: GenerationWireEvent): GenerationClientState => {
      const next = reduceGenerationClientEvent(state, event);
      if (next.phase === 'committed') clearCheckpoint();
      else persistCheckpoint(next);
      setText(next.text);
      setReasoning(next.reasoning);
      setToolSteps([...next.toolSteps]);
      setStatus(statusFromPhase(next.phase));
      return next;
    },
    [clearCheckpoint, persistCheckpoint],
  );

  useEffect(() => {
    if (
      !restoredCheckpoint ||
      ['committed', 'cancelled', 'failed'].includes(restoredCheckpoint.phase) ||
      resumedGenerationRef.current === restoredCheckpoint.generationId
    ) {
      return;
    }
    resumedGenerationRef.current = restoredCheckpoint.generationId;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let clientState: GenerationClientState = {
      ...createGenerationClientState(restoredCheckpoint.generationId),
      phase: restoredCheckpoint.phase,
      lastDurableSequence: restoredCheckpoint.lastDurableSequence,
    };
    generationIdRef.current = restoredCheckpoint.generationId;
    void (async () => {
      try {
        const response = await client.api.chats[':id'].generations[':generationId'].stream.$get(
          { param: { id: chatId, generationId: restoredCheckpoint.generationId } },
          {
            init: {
              signal: controller.signal,
              headers: { 'Last-Event-ID': String(clientState.lastDurableSequence) },
            },
          },
        );
        await consumeSseResponse(response, (event) => {
          clientState = applyRestoredEvent(clientState, event);
          const failureMessage = getGenerationFailureMessage(event);
          if (failureMessage) throw new Error(failureMessage);
          if (
            'payload' in event &&
            ['generation.committed', 'generation.cancelled'].includes(event.type)
          ) {
            void invalidateChatQueries(queryClient, chatId);
          }
        });
        if (clientState.phase !== 'cancelled') await invalidateChatQueries(queryClient, chatId);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        setStatus('failed');
      } finally {
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    })();
    return () => controller.abort();
  }, [applyRestoredEvent, chatId, client, queryClient, restoredCheckpoint]);

  const stream = useCallback(
    async (input: StreamInput) => {
      const generationId = crypto.randomUUID();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      generationIdRef.current = generationId;
      clearCheckpoint();
      cancelRequestedRef.current = false;
      let terminalStatus: StreamStatus | null = null;
      let shouldReconnect = true;
      const deduplicateEvent = createGenerationEventDeduplicator();
      let clientState = createGenerationClientState(generationId);
      setText('');
      setReasoning('');
      setToolSteps([]);
      setStatus('preparing');
      setError(null);

      const handleEvent = (event: GenerationWireEvent) => {
        clientState = applyRestoredEvent(clientState, event);
        setText(clientState.text);
        setReasoning(clientState.reasoning);
        setToolSteps([...clientState.toolSteps]);
        if (clientState.phase === 'preparing') setStatus('preparing');
        if (clientState.phase === 'running' || clientState.phase === 'saving')
          setStatus('streaming');
        if (clientState.phase === 'cancel_requested') setStatus('stopping');
        if (clientState.phase === 'cancelled') setStatus('cancelled');
        if (clientState.phase === 'committed') setStatus('committed');
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
        consumeSseResponse(response, handleEvent, undefined, { deduplicateEvent });

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
                  headers: { 'Last-Event-ID': String(clientState.lastDurableSequence) },
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
    [applyRestoredEvent, chatId, client, clearCheckpoint, queryClient],
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
