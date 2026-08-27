import type { ChatMessageDto } from '@hominem/rpc/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import type { ChatRuntime } from './use-chat-runtime';
import type { ResponseLength } from './use-response-length';

export type StreamStatus =
  | 'idle'
  | 'preparing'
  | 'streaming'
  | 'stopping'
  | 'cancelled'
  | 'committed'
  | 'failed';

export interface StreamInput {
  message: string;
  fileIds?: string[];
  responseLength?: ResponseLength;
  onAccepted?: (userMessage: ChatMessageDto | null) => void;
  onCommitted?: (message: ChatMessageDto) => void;
  onCancelled?: () => void;
  onFailed?: (error: Error) => void;
}

type MessagePart = {
  type?: string;
  content?: unknown;
  text?: unknown;
  name?: unknown;
  toolCallId?: unknown;
  state?: unknown;
};

function partsOf(value: unknown): MessagePart[] {
  if (!value || typeof value !== 'object' || !('parts' in value)) return [];
  const parts = (value as { parts?: unknown }).parts;
  return Array.isArray(parts) ? (parts as MessagePart[]) : [];
}

function textFromParts(parts: MessagePart[], type: string) {
  return parts.reduce((text, part) => {
    if (part.type !== type) return text;
    return `${text}${typeof part.content === 'string' ? part.content : typeof part.text === 'string' ? part.text : ''}`;
  }, '');
}

type ToolStatus = 'requested' | 'running' | 'completed' | 'failed' | 'reused';

function toolStepsFromParts(parts: MessagePart[]): Array<{
  toolCallId: string;
  toolName: string;
  status: ToolStatus;
}> {
  return parts.reduce<Array<{ toolCallId: string; toolName: string; status: ToolStatus }>>(
    (steps, part) => {
      if (!part.type?.includes('tool')) return steps;
      steps.push({
        toolCallId: typeof part.toolCallId === 'string' ? part.toolCallId : crypto.randomUUID(),
        toolName: typeof part.name === 'string' ? part.name : 'tool',
        status:
          part.state === 'output-available'
            ? 'completed'
            : part.state === 'output-error'
              ? 'failed'
              : part.state === 'input-available'
                ? 'requested'
                : 'running',
      });
      return steps;
    },
    [],
  );
}

function messageDto(chatId: string, role: 'user' | 'assistant', content: string): ChatMessageDto {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    chatId,
    userId: '',
    role,
    content,
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function useStreamMessage({ chatId, runtime }: { chatId: string; runtime: ChatRuntime }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<StreamInput | null>(null);
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const chat = runtime;

  const assistantParts = useMemo(() => {
    const message = [...chat.messages]
      .reverse()
      .find((candidate) => candidate.role === 'assistant');
    return partsOf(message);
  }, [chat.messages]);

  const stream = useCallback(
    async (input: StreamInput) => {
      inputRef.current = input;
      setError(null);
      setStatus('preparing');
      input.onAccepted?.(messageDto(chatId, 'user', input.message));
      try {
        await chat.sendMessage(input.message, {
          body: {
            operation: {
              kind: 'send',
              fileIds: input.fileIds,
              responseLength: input.responseLength,
            },
          },
        });
        const message = [...chat.messages]
          .reverse()
          .find((candidate) => candidate.role === 'assistant');
        const parts = partsOf(message);
        const committed = messageDto(chatId, 'assistant', textFromParts(parts, 'text'));
        committed.reasoning = textFromParts(parts, 'reasoning') || null;
        setStatus('committed');
        input.onCommitted?.(committed);
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatQueryKeys.list }),
        ]);
      } catch (caught) {
        const nextError = caught instanceof Error ? caught : new Error(String(caught));
        setError(nextError);
        setStatus('failed');
        input.onFailed?.(nextError);
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
    inputRef.current?.onCancelled?.();
  }, [chat, chatId]);

  return {
    cancel,
    error,
    generationId: chat.runId,
    isStreaming: chat.isLoading,
    status: chat.isLoading ? 'streaming' : status,
    stream,
    text: textFromParts(assistantParts, 'text'),
    reasoning: textFromParts(assistantParts, 'reasoning'),
    toolSteps: toolStepsFromParts(assistantParts),
  };
}
