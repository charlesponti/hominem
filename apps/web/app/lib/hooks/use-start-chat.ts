import { getGenerationFailureMessage } from '@hominem/chat';
import type { GenerationHistoryEvent as GenerationDomainEvent } from '@hominem/chat';
import { ChatClient } from '@hominem/chat/client';
import type { ChatGenerationController, GenerationClientState } from '@hominem/chat/client';
import { fetchChatTransport } from '@hominem/chat/transport/fetch';
import { useApiClient } from '@hominem/rpc/react';
import type { ChatMessageDto } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

interface StartChatInput {
  title: string;
  message: string;
  fileIds?: string[];
  responseLength?: 'short' | 'medium' | 'long';
  onAccepted?: (event: Extract<GenerationDomainEvent, { type: 'generation.accepted' }>) => void;
  onCommitted?: (event: Extract<GenerationDomainEvent, { type: 'generation.committed' }>) => void;
}

function createCheckpointStore() {
  return {
    get: (generationId: string): GenerationClientState | null => {
      if (typeof window === 'undefined') return null;
      const raw = window.localStorage.getItem(`chat-generation:${generationId}`);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as GenerationClientState;
      } catch {
        window.localStorage.removeItem(`chat-generation:${generationId}`);
        return null;
      }
    },
    set: (state: GenerationClientState) => {
      window.localStorage.setItem(`chat-generation:${state.generationId}`, JSON.stringify(state));
    },
    remove: (generationId: string) => {
      window.localStorage.removeItem(`chat-generation:${generationId}`);
    },
  };
}

export function useStartChat() {
  const queryClient = useQueryClient();
  const apiClient = useApiClient();
  const chatClientRef = useRef<ChatClient | null>(null);
  const generationRef = useRef<ChatGenerationController | null>(null);
  const chatIdRef = useRef<string | null>(null);
  if (!chatClientRef.current) {
    chatClientRef.current = new ChatClient({
      baseUrl: import.meta.env.VITE_PUBLIC_API_URL,
      transport: fetchChatTransport((input, init) => {
        const requestUrl =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const requestInit = init ?? {};
        if (requestUrl.endsWith('/api/chats/start-stream')) {
          return apiClient.api.chats['start-stream'].$post(
            { json: JSON.parse(String(requestInit.body ?? '{}')) },
            { init: requestInit },
          );
        }
        return fetch(input, { ...requestInit, credentials: 'include' });
      }),
      checkpointStore: createCheckpointStore(),
    });
  }

  const mutation = useMutation<void, Error, StartChatInput>({
    mutationFn: async ({ onAccepted, onCommitted, ...input }) => {
      const generation = chatClientRef.current!.start(input);
      generationRef.current = generation;
      generation.subscribe((_state, event) => {
        if (!('payload' in event)) return;
        const failureMessage = getGenerationFailureMessage(event);
        if (failureMessage) throw new Error(failureMessage);
        if (event.type === 'generation.accepted') {
          chatIdRef.current = event.payload.chatId;
          queryClient.setQueryData(chatQueryKeys.get(event.payload.chatId), event.payload.chat);
          queryClient.setQueryData<ChatMessageDto[]>(
            chatQueryKeys.messages(event.payload.chatId),
            event.payload.userMessage ? [event.payload.userMessage] : [],
          );
          onAccepted?.(event);
        }
        if (event.type === 'generation.committed') {
          queryClient.setQueryData<ChatMessageDto[]>(
            chatQueryKeys.messages(event.payload.message.chatId),
            (messages = []) => [...messages, event.payload.message],
          );
          onCommitted?.(event);
        }
      });
      try {
        await generation.done;
        await queryClient.invalidateQueries({ queryKey: chatQueryKeys.list });
      } finally {
        generationRef.current = null;
        chatIdRef.current = null;
      }
    },
  });

  const start = useCallback((input: StartChatInput) => mutation.mutateAsync(input), [mutation]);

  const cancel = useCallback(async () => {
    const generation = generationRef.current;
    if (!generation) return;
    if (chatIdRef.current) {
      await chatClientRef.current?.cancel({
        chatId: chatIdRef.current,
        generationId: generation.state.generationId,
      });
    }
    generation.cancel();
  }, []);

  return {
    cancel,
    error: mutation.error,
    isStarting: mutation.isPending,
    start,
  };
}
