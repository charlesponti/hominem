import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto, GenerationDomainEvent } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import { consumeSseResponse } from '../chat/consume-sse-response';

interface StartChatInput {
  title: string;
  message: string;
  fileIds?: string[];
  responseLength?: 'short' | 'medium' | 'long';
  onAccepted?: (event: Extract<GenerationDomainEvent, { type: 'generation.accepted' }>) => void;
  onCommitted?: (event: Extract<GenerationDomainEvent, { type: 'generation.committed' }>) => void;
}

export function useStartChat() {
  const client = useQueryClient();
  const apiClient = useApiClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation<void, Error, StartChatInput>({
    mutationFn: async ({ onAccepted, onCommitted, ...input }) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await apiClient.api.chats['start-stream'].$post(
          {
            json: {
              ...input,
              generationId: crypto.randomUUID(),
            },
          },
          { init: { signal: abortController.signal } },
        );

        await consumeSseResponse(response, (event) => {
          if ('payload' in event && event.type === 'generation.accepted') {
            client.setQueryData(chatQueryKeys.get(event.payload.chatId), event.payload.chat);
            client.setQueryData(
              chatQueryKeys.messages(event.payload.chatId),
              event.payload.userMessage ? [event.payload.userMessage] : [],
            );
            onAccepted?.(event);
          }

          if ('payload' in event && event.type === 'generation.committed') {
            client.setQueryData<ChatMessageDto[]>(
              chatQueryKeys.messages(event.payload.message.chatId),
              (messages = []) => [...messages, event.payload.message],
            );
            onCommitted?.(event);
          }
        });

        await client.invalidateQueries({ queryKey: chatQueryKeys.list });
      } finally {
        abortControllerRef.current = null;
      }
    },
  });

  const start = useCallback((input: StartChatInput) => mutation.mutateAsync(input), [mutation]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    cancel,
    error: mutation.error,
    isStarting: mutation.isPending,
    start,
  };
}
