import type { ChatStreamEvent } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import type { ChatMessageItem } from '~/components/chat';

import { invalidateChatQueries } from './chat-cache';
import { streamSSE } from './stream-sse';
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
      await streamSSE<ChatStreamEvent>({
        url: `${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/regenerate`,
        payload: { generationId, responseLength: getChatResponseLength() },
        getHeaders: getAuthHeaders,
        signal: controller.signal,
        onEvent: (event) => {
          const current = generationRef.current;
          if (!current || (event.type !== 'error' && event.generationId !== current.id)) return;
          if (event.type === 'status') {
            setGeneration({ ...current, stage: event.status });
            return;
          }
          if (event.type === 'committed') {
            const message = toMessageOutput(event.message);
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
          if (event.type === 'cancelled') {
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
