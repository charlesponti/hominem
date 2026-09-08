import { getGenerationFailureMessage } from '@hominem/chat';
import type { ChatGenerationController } from '@hominem/chat/client';
import { parseGenerationClientCheckpoint } from '@hominem/chat/client';
import type { GenerationClientState } from '@hominem/chat/client';
import type { ChatMessageDto } from '@hominem/rpc/types';
import { isObject } from '@hominem/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { invalidateChatQueries } from '../chat/chat-cache';
import { useChatClient } from './use-chat-client';
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

const PROVIDER_FAILURE_MESSAGE = 'I couldn’t finish that response. Please try again.';

function isAbortError(error: unknown): boolean {
  return isObject(error) && 'name' in error && error.name === 'AbortError';
}

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
  const chatClient = useChatClient();
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
  const activeGenerationRef = useRef<ChatGenerationController | null>(null);
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

  const clearCheckpoint = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(generationStorageKey(chatId));
  }, [chatId]);

  useEffect(() => {
    if (
      !restoredCheckpoint ||
      ['committed', 'cancelled', 'failed'].includes(restoredCheckpoint.phase) ||
      resumedGenerationRef.current === restoredCheckpoint.generationId
    ) {
      return;
    }
    resumedGenerationRef.current = restoredCheckpoint.generationId;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        `chat-generation:${restoredCheckpoint.generationId}`,
        JSON.stringify(restoredCheckpoint),
      );
    }
    const generation = chatClient.resumeGeneration({
      chatId,
      generationId: restoredCheckpoint.generationId,
    });
    activeGenerationRef.current = generation;
    generationIdRef.current = restoredCheckpoint.generationId;
    const unsubscribe = generation.subscribe((next, event) => {
      setText(next.text);
      setReasoning(next.reasoning);
      setToolSteps([...next.toolSteps]);
      setStatus(statusFromPhase(next.phase));
      if ('event' in event) {
        setError(new Error(event.event.message));
        setStatus('failed');
        failedGenerationIdRef.current = restoredCheckpoint.generationId;
        return;
      }
      const failureMessage = getGenerationFailureMessage(event);
      if (failureMessage) {
        setError(new Error(PROVIDER_FAILURE_MESSAGE));
        setStatus('failed');
        failedGenerationIdRef.current = restoredCheckpoint.generationId;
      }
      if (event.type === 'generation.committed') clearCheckpoint();
      if (event.type === 'generation.cancelled') clearCheckpoint();
      if (event.type === 'generation.committed' || event.type === 'generation.cancelled') {
        void invalidateChatQueries(queryClient, chatId);
      }
    });
    void (async () => {
      try {
        await generation.done;
        if (!['committed', 'cancelled', 'failed'].includes(generation.state.phase)) {
          const run = (await chatClient.getGeneration({
            chatId,
            generationId: restoredCheckpoint.generationId,
          })) as { status?: string };
          if (run.status === 'committed' || run.status === 'cancelled') {
            clearCheckpoint();
            setStatus(run.status);
          }
          if (run.status === 'failed') {
            setError(new Error(PROVIDER_FAILURE_MESSAGE));
            setStatus('failed');
            failedGenerationIdRef.current = restoredCheckpoint.generationId;
          }
        }
        await invalidateChatQueries(queryClient, chatId);
      } catch (caught) {
        if (isAbortError(caught)) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        setStatus('failed');
        failedGenerationIdRef.current = restoredCheckpoint.generationId;
        await invalidateChatQueries(queryClient, chatId);
      } finally {
        unsubscribe();
        activeGenerationRef.current = null;
        generationIdRef.current = null;
      }
    })();
    return () => {
      unsubscribe();
      generation.cancel();
      activeGenerationRef.current = null;
      generationIdRef.current = null;
    };
  }, [chatClient, chatId, clearCheckpoint, queryClient, restoredCheckpoint]);

  const stream = useCallback(
    async (input: StreamInput) => {
      const generation = input.retryOfGenerationId
        ? chatClient.regenerate({
            chatId,
            target: { generationId: input.retryOfGenerationId },
            body: {
              ...(input.responseLength ? { responseLength: input.responseLength } : {}),
            },
          })
        : chatClient.send({
            chatId,
            message: input.message ?? '',
            ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
            ...(input.responseLength ? { responseLength: input.responseLength } : {}),
          });
      activeGenerationRef.current = generation;
      const generationId = generation.state.generationId;
      generationIdRef.current = generationId;
      if (input.retryOfGenerationId) failedGenerationIdRef.current = input.retryOfGenerationId;
      else failedGenerationIdRef.current = null;
      clearCheckpoint();
      cancelRequestedRef.current = false;
      let terminalStatus: StreamStatus | null = null;
      setText('');
      setReasoning('');
      setToolSteps([]);
      setStatus('preparing');
      setError(null);
      setIsRetrying(Boolean(input.retryOfGenerationId));

      const unsubscribe = generation.subscribe((clientState, event) => {
        setText(clientState.text);
        setReasoning(clientState.reasoning);
        setToolSteps([...clientState.toolSteps]);
        if (clientState.phase === 'preparing') setStatus('preparing');
        if (clientState.phase === 'running' || clientState.phase === 'saving')
          setStatus('streaming');
        if (clientState.phase === 'awaiting_confirmation') setStatus('awaiting_confirmation');
        if (clientState.phase === 'cancel_requested') setStatus('stopping');
        if (clientState.phase === 'cancelled') setStatus('cancelled');
        if (clientState.phase === 'committed') setStatus('committed');
        if ('event' in event) {
          setError(new Error(event.event.message));
          setStatus('failed');
          terminalStatus = 'failed';
          return;
        }
        const failureMessage = getGenerationFailureMessage(event);
        if (failureMessage) {
          setError(new Error(PROVIDER_FAILURE_MESSAGE));
          setStatus('failed');
          terminalStatus = 'failed';
          return;
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
      });

      try {
        await generation.done;

        if (terminalStatus !== 'cancelled' && !cancelRequestedRef.current) {
          await invalidateChatQueries(queryClient, chatId);
        }
      } catch (caught) {
        if (cancelRequestedRef.current || isAbortError(caught)) {
          setStatus('cancelled');
          input.onCancelled?.();
          return;
        }

        const nextError = new Error(
          caught instanceof Error ? caught.message : PROVIDER_FAILURE_MESSAGE,
          { cause: caught },
        );
        setError(nextError);
        setStatus('failed');
        setIsRetrying(false);
        failedGenerationIdRef.current = generationId;
        await invalidateChatQueries(queryClient, chatId);
        input.onFailed?.(nextError);
      } finally {
        unsubscribe();
        input.onSettled?.();
        setIsRetrying(false);
        activeGenerationRef.current = null;
        generationIdRef.current = null;
      }
    },
    [chatClient, chatId, clearCheckpoint, queryClient],
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
    const generation = activeGenerationRef.current;
    if (!generationId || !generation || status === 'stopping') return;

    cancelRequestedRef.current = true;
    setStatus('stopping');

    try {
      await chatClient.cancel({ chatId, generationId });
      generation.cancel();
      setStatus('cancelled');
    } catch (caught) {
      cancelRequestedRef.current = false;
      setError(caught instanceof Error ? caught : new Error(String(caught)));
      setStatus('failed');
    }
  }, [chatClient, chatId, status]);

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
