import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto, ChatStreamEvent } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import { consumeChatStream } from '../chat/stream-events';
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
  noteIds?: string[];
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
      setText('');
      setReasoning('');
      setToolSteps([]);
      setStatus('preparing');
      setError(null);

      try {
        const streamRes = await client.api.chats[':id'].stream.$post(
          {
            param: { id: chatId },
            json: {
              generationId,
              message: input.message,
              ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
              ...(input.noteIds && input.noteIds.length > 0 ? { noteIds: input.noteIds } : {}),
              ...(input.responseLength ? { responseLength: input.responseLength } : {}),
            },
          },
          { init: { signal: abortController.signal } },
        );

        await consumeChatStream(streamRes, (event: ChatStreamEvent) => {
          if (event.type === 'error') {
            throw new Error(event.message);
          }

          if (event.type === 'accepted') {
            input.onAccepted?.(event.userMessage);
            return;
          }

          if (event.type === 'status') {
            terminalStatus = event.status === 'preparing' ? 'preparing' : 'streaming';
            setStatus(terminalStatus);
            return;
          }

          if (event.type === 'text-delta') {
            setText((current) => current + event.text);
            return;
          }

          if (event.type === 'reasoning-delta') {
            setReasoning((current) => current + event.text);
            return;
          }

          if (event.type === 'tool-step') {
            setToolSteps((current) => {
              const index = current.findIndex((step) => step.toolCallId === event.toolCallId);
              const next = {
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                status: event.status,
              };
              if (index === -1) return [...current, next];
              return current.map((step, stepIndex) => (stepIndex === index ? next : step));
            });
            return;
          }

          if (event.type === 'cancelled') {
            terminalStatus = 'cancelled';
            setStatus('cancelled');
            input.onCancelled?.();
            return;
          }

          if (event.type === 'committed') {
            terminalStatus = 'committed';
            setText(event.message.content);
            setStatus('committed');
            input.onCommitted?.(event.message);
          }
        });

        if (terminalStatus !== 'cancelled' && !cancelRequestedRef.current) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) }),
            queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
            queryClient.invalidateQueries({ queryKey: chatQueryKeys.list }),
          ]);
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

        const nextError = caught instanceof Error ? caught : new Error(String(caught));
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
