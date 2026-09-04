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

export const PROVIDER_FAILURE_MESSAGE = 'I couldn’t finish that response. Please try again.';

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
  message?: string;
  retryOfGenerationId?: string;
  fileIds?: string[];
  responseLength?: ResponseLength;
  onAccepted?: (userMessage: ChatMessageDto | null) => void;
  onCommitted?: (message: ChatMessageDto) => void;
  onCancelled?: () => void;
  onFailed?: (error: Error) => void;
  onSettled?: () => void;
}

export function useStreamMessage({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient();
  const client = useApiClient();
  // Read browser-only recovery state after hydration so SSR and the first
  // client render produce the same composer controls.
  const [restoredCheckpoint, setRestoredCheckpoint] =
    useState<ReturnType<typeof readGenerationCheckpoint>>(null);
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
  const [isRetrying, setIsRetrying] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const resumedGenerationRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);
  const failedGenerationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const checkpoint = readGenerationCheckpoint(chatId);
    setRestoredCheckpoint(checkpoint);
    if (checkpoint?.phase === 'failed') {
      setError(new Error(PROVIDER_FAILURE_MESSAGE));
      setStatus('failed');
      failedGenerationIdRef.current = checkpoint.generationId;
    }
  }, [chatId]);

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
          if (['generation.committed', 'generation.cancelled'].includes(event.type)) {
            void invalidateChatQueries(queryClient, chatId);
          }
        });
        if (clientState.phase !== 'cancelled') {
          // A reconnect can receive [DONE] without the terminal event when
          // the event was committed between the initial status read and the
          // replay subscription. Ask durable state what actually happened.
          const runResponse = await client.api.chats[':id'].generations[':generationId'].$get({
            param: { id: chatId, generationId: restoredCheckpoint.generationId },
          });
          const run = await runResponse.json();
          if (run.status === 'committed') {
            clearCheckpoint();
            setStatus('committed');
          } else if (run.status === 'cancelled') {
            clearCheckpoint();
            setStatus('cancelled');
          } else if (run.status === 'failed') {
            setError(new Error(PROVIDER_FAILURE_MESSAGE));
            setStatus('failed');
            failedGenerationIdRef.current = restoredCheckpoint.generationId;
          }
          await invalidateChatQueries(queryClient, chatId);
        }
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        setStatus('failed');
        failedGenerationIdRef.current = restoredCheckpoint.generationId;
        await invalidateChatQueries(queryClient, chatId);
      } finally {
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    })();
    return () => controller.abort();
  }, [applyRestoredEvent, chatId, clearCheckpoint, client, queryClient, restoredCheckpoint]);

  const stream = useCallback(
    async (input: StreamInput) => {
      const generationId = crypto.randomUUID();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      generationIdRef.current = generationId;
      if (input.retryOfGenerationId) failedGenerationIdRef.current = input.retryOfGenerationId;
      else failedGenerationIdRef.current = null;
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
      setIsRetrying(Boolean(input.retryOfGenerationId));

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
        if (event.type === 'generation.accepted') {
          input.onAccepted?.(event.payload.userMessage);
          return;
        }

        if (event.type === 'generation.phase_changed') {
          terminalStatus = clientState.phase === 'preparing' ? 'preparing' : 'streaming';
          return;
        }

        if (event.type === 'text-delta' || event.type === 'reasoning-delta') {
          return;
        }

        if (event.type === 'generation.cancelled') {
          terminalStatus = 'cancelled';
          input.onCancelled?.();
          return;
        }

        if (event.type === 'generation.committed') {
          terminalStatus = 'committed';
          input.onCommitted?.(event.payload.message);
        }
      };
      const consume = (response: Response) =>
        consumeSseResponse(response, handleEvent, undefined, { deduplicateEvent });

      try {
        const streamRes = input.retryOfGenerationId
          ? await client.api.chats[':id'].generations[':generationId'].retry.$post(
              {
                param: { id: chatId, generationId: input.retryOfGenerationId },
                json: {
                  generationId,
                  ...(input.responseLength ? { responseLength: input.responseLength } : {}),
                },
              },
              { init: { signal: abortController.signal } },
            )
          : await client.api.chats[':id'].stream.$post(
              {
                param: { id: chatId },
                json: {
                  generationId,
                  message: input.message ?? '',
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

        const nextError = new Error(PROVIDER_FAILURE_MESSAGE, { cause: streamError });
        setError(nextError);
        setStatus('failed');
        setIsRetrying(false);
        failedGenerationIdRef.current = generationId;
        await invalidateChatQueries(queryClient, chatId);
        input.onFailed?.(nextError);
      } finally {
        input.onSettled?.();
        setIsRetrying(false);
        abortControllerRef.current = null;
        generationIdRef.current = null;
      }
    },
    [applyRestoredEvent, chatId, client, clearCheckpoint, queryClient],
  );

  const retry = useCallback(
    async (
      input: Pick<StreamInput, 'responseLength' | 'onCommitted' | 'onFailed' | 'onSettled'> = {},
    ) => {
      const failedGenerationId = failedGenerationIdRef.current;
      if (!failedGenerationId || status === 'preparing' || status === 'streaming') return;
      await stream({ ...input, retryOfGenerationId: failedGenerationId });
    },
    [status, stream],
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
    isRetrying,
    retry,
    status,
    stream,
    text,
    reasoning,
    toolSteps,
  };
}
