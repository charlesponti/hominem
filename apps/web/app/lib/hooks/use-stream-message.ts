import { useApiClient } from '@hominem/rpc/react';
import type { ChatStreamEvent } from '@hominem/rpc/types';
import { useSignal } from '@preact/signals-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export function useStreamMessage({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient();
  const client = useApiClient();
  const text = useSignal('');
  const status = useSignal<StreamStatus>('idle');
  const error = useSignal<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (input: {
      message: string;
      fileIds?: string[];
      noteIds?: string[];
      onChunk?: (chunk: string) => void;
    }) => {
      text.value = '';
      status.value = 'streaming';
      error.value = null;

      abortControllerRef.current = new AbortController();

      try {
        const streamRes = await client.api.chats[':id'].stream.$post({
          param: { id: chatId },
          json: {
            generationId: crypto.randomUUID(),
            message: input.message,
            ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
            ...(input.noteIds && input.noteIds.length > 0 ? { noteIds: input.noteIds } : {}),
          },
        });
        const body = streamRes.body;
        if (!body) throw new Error('No response body');

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = '';

        const processLine = (line: string) => {
          if (!line.startsWith('data: ')) return;
          const data = line.slice(6).trimEnd();
          if (data === '[DONE]') return;
          let event: ChatStreamEvent;
          try {
            event = JSON.parse(data) as ChatStreamEvent;
          } catch {
            return;
          }
          if (event.type === 'error') throw new Error(event.message);
          if (event.type === 'committed') {
            text.value = event.message.content;
            input.onChunk?.(event.message.content);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() ?? '';
          for (const line of lines) processLine(line);
        }

        const final = decoder.decode();
        if (final) lineBuffer += final;
        for (const line of lineBuffer.split('\n')) processLine(line);

        status.value = 'done';
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
      } catch (err) {
        if (abortControllerRef.current?.signal.aborted) {
          status.value = 'idle';
          return;
        }
        const nextError = err instanceof Error ? err : new Error(String(err));
        error.value = nextError;
        status.value = 'error';
      }
    },
    [chatId, client, error, queryClient, status, text],
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    status.value = 'idle';
    text.value = '';
  }, [status, text]);

  return {
    stream,
    cancel,
    text: text.value,
    status: status.value,
    error: error.value,
    isStreaming: status.value === 'streaming',
  };
}
