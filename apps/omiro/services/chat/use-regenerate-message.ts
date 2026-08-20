import type { ChatStreamEvent } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import type { ChatGenerationState } from './chat-generation';
import type { MessageOutput } from './chatMessages';
import { streamSSE } from './stream-sse';
import { toMessageOutput } from './use-chat-messages';

type RegenerateInput = { messageId: string; generationId: string };

export function useRegenerateMessage(chatId: string) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef<ChatGenerationState | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const [generation, setGeneration] = useState<ChatGenerationState | null>(null);

  const setCurrentGeneration = useCallback((next: ChatGenerationState | null) => {
    generationRef.current = next;
    setGeneration(next);
  }, []);

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
            setCurrentGeneration({ ...current, stage: event.status });
            return;
          }
          if (event.type === 'committed') {
            const message = toMessageOutput(event.message);
            if (message) {
              queryClient.setQueryData<MessageOutput[]>(
                chatKeys.messages(chatId),
                (messages = []) =>
                  messages.map((item) => (item.id === current.targetMessageId ? message : item)),
              );
            }
            setCurrentGeneration(null);
            return;
          }
          if (event.type === 'cancelled') {
            setCurrentGeneration({ ...current, stage: 'cancelled' });
          }
        },
      });
    },
    onError: (error) => {
      if (error.name === 'AbortError') return;
      const current = generationRef.current;
      if (current) setCurrentGeneration({ ...current, stage: 'failed', error: error.message });
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const regenerateMessage = useCallback(
    (messageId: string) => {
      lastMessageIdRef.current = messageId;
      const generationId = randomUUID();
      setCurrentGeneration({
        id: generationId,
        chatId,
        stage: 'preparing',
        targetMessageId: messageId,
      });
      void mutation.mutateAsync({ messageId, generationId });
    },
    [chatId, mutation, setCurrentGeneration],
  );

  const cancelGeneration = useCallback(async () => {
    const current = generationRef.current;
    if (!current || current.stage === 'stopping') return;
    setCurrentGeneration({ ...current, stage: 'stopping' });
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/chats/${chatId}/generations/${current.id}/cancel`,
      {
        method: 'POST',
        headers,
      },
    );
    if (!response.ok) {
      setCurrentGeneration({ ...current, stage: 'failed', error: 'Unable to stop reply.' });
      return;
    }
    abortControllerRef.current?.abort();
    setCurrentGeneration({ ...current, stage: 'cancelled' });
  }, [chatId, getAuthHeaders, setCurrentGeneration]);

  const retryGeneration = useCallback(() => {
    if (lastMessageIdRef.current) regenerateMessage(lastMessageIdRef.current);
  }, [regenerateMessage]);

  return { cancelGeneration, generation, regenerateMessage, retryGeneration };
}
