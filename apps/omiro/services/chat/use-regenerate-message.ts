import { parseGenerationStreamEvent } from '@hominem/rpc/generation-events';
import type { GenerationStreamEvent } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { consumeSseXhr } from './consume-sse-xhr';
import { useChatGeneration } from './use-chat-generation';
import { toMessageOutput } from './use-chat-messages';

type RegenerateInput = { messageId: string; generationId: string };

export function useRegenerateMessage(chatId: string) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const lastMessageIdRef = useRef<string | null>(null);
  const { abortControllerRef, cancelGeneration, generation, generationRef, setGeneration } =
    useChatGeneration({ chatId, getAuthHeaders });

  const mutation = useMutation<void, Error, RegenerateInput>({
    retry: false,
    mutationFn: async ({ messageId, generationId }) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      await consumeSseXhr<GenerationStreamEvent>({
        url: `${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/regenerate`,
        payload: { generationId, responseLength: getChatResponseLength() },
        getHeaders: getAuthHeaders,
        signal: controller.signal,
        parseEvent: parseGenerationStreamEvent,
        onEvent: (event) => {
          const current = generationRef.current;
          if (!current || event.generationId !== current.id) return;
          if ('payload' in event && event.type === 'generation.phase_changed') {
            if (event.payload.phase === 'preparing' || event.payload.phase === 'saving')
              setGeneration({ ...current, stage: event.payload.phase });
            return;
          }
          if ('event' in event && event.event.type === 'error') {
            throw new Error(event.event.message);
          }
          if ('payload' in event && event.type === 'generation.committed') {
            const message = toMessageOutput(event.payload.message);
            if (message) {
              queryClient.setQueryData<ChatMessageItem[]>(
                chatKeys.messages(chatId),
                (messages = []) =>
                  messages.map((item) => (item.id === current.targetMessageId ? message : item)),
              );
            }
            setGeneration(null);
            void invalidateChatQueries(queryClient, chatId);
            return;
          }
          if ('payload' in event && event.type === 'generation.cancelled') {
            setGeneration({ ...current, stage: 'cancelled' });
          }
        },
      });
    },
    onError: (error) => {
      if (error.name === 'AbortError') return;
      const current = generationRef.current;
      if (current) setGeneration({ ...current, stage: 'failed', error: error.message });
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const regenerateMessage = useCallback(
    (messageId: string) => {
      lastMessageIdRef.current = messageId;
      const generationId = randomUUID();
      setGeneration({
        id: generationId,
        chatId,
        stage: 'preparing',
        targetMessageId: messageId,
      });
      void mutation.mutateAsync({ messageId, generationId }).catch(() => undefined);
    },
    [chatId, mutation, setGeneration],
  );

  const retryGeneration = useCallback(() => {
    if (lastMessageIdRef.current) regenerateMessage(lastMessageIdRef.current);
  }, [regenerateMessage]);

  return { cancelGeneration, generation, regenerateMessage, retryGeneration };
}
