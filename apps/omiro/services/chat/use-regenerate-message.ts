import { createGenerationClientState, reduceGenerationClientEvent } from '@hominem/chat';
import {
  getGenerationFailureMessage,
  parseGenerationWireEvent,
  toGenerationClientEvents,
} from '@hominem/rpc/generation-events';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { consumeGenerationSseXhr } from './consume-sse-xhr';
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
      let clientState = createGenerationClientState(generationId);
      await consumeGenerationSseXhr({
        url: `${API_BASE_URL}/api/chats/${chatId}/messages/${messageId}/regenerate`,
        payload: { generationId, responseLength: getChatResponseLength() },
        replayUrl: (afterSequence) =>
          `${API_BASE_URL}/api/chats/${chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
        getHeaders: getAuthHeaders,
        signal: controller.signal,
        parseEvent: parseGenerationWireEvent,
        onEvent: (event) => {
          const current = generationRef.current;
          if (!current || event.generationId !== current.id) return;
          for (const clientEvent of toGenerationClientEvents(event)) {
            clientState = reduceGenerationClientEvent(clientState, clientEvent);
            if (clientState.phase === 'preparing' || clientState.phase === 'saving') {
              setGeneration({ ...current, stage: clientState.phase });
            }
            if (clientState.phase === 'cancel_requested') {
              setGeneration({ ...current, stage: 'stopping' });
            }
            if (clientState.phase === 'cancelled') {
              setGeneration({ ...current, stage: 'cancelled' });
            }
          }
          const failureMessage = getGenerationFailureMessage(event);
          if (failureMessage) throw new Error(failureMessage);
          if ('payload' in event && event.type === 'generation.phase_changed') {
            return;
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
            return;
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
