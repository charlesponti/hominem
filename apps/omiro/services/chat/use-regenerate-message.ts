import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { useChatGeneration } from './use-chat-generation';
import { toMessageOutput } from './use-chat-messages';

type RegenerateInput = { messageId: string; generationId: string };

export function useRegenerateMessage(chatId: string) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const lastMessageIdRef = useRef<string | null>(null);
  const handleGenerationTerminal = useCallback(async () => {
    await invalidateChatQueries(queryClient, chatId);
  }, [chatId, queryClient]);
  const { cancelGeneration, generation, generationRef, regenerateGeneration, setGeneration } =
    useChatGeneration({
      chatId,
      getAuthHeaders,
      onGenerationTerminal: handleGenerationTerminal,
    });

  const mutation = useMutation<void, Error, RegenerateInput>({
    retry: false,
    mutationFn: async ({ messageId, generationId }) => {
      const controller = regenerateGeneration(
        {
          chatId,
          messageId,
          body: { generationId, responseLength: getChatResponseLength() },
        },
        {
          id: generationId,
          chatId,
          stage: 'preparing',
          lastDurableSequence: 0,
          targetMessageId: messageId,
        },
      );
      const unsubscribe = controller.subscribe((state, event) => {
        const current = generationRef.current;
        if (!current || event.generationId !== current.id) return;
        setGeneration({
          ...current,
          stage: state.phase === 'cancel_requested' ? 'stopping' : state.phase,
          lastDurableSequence: state.lastDurableSequence,
        });
        if ('event' in event) {
          setGeneration({ ...current, stage: 'failed', error: event.event.message });
          return;
        }
        if (event.type === 'generation.failed') {
          setGeneration({ ...current, stage: 'failed', error: event.payload.message });
          return;
        }
        if (event.type === 'generation.cancelled') {
          setGeneration({ ...current, stage: 'cancelled' });
          return;
        }
        if (event.type === 'generation.committed') {
          const message = toMessageOutput(event.payload.message);
          if (message) {
            queryClient.setQueryData<ChatMessageItem[]>(
              chatKeys.messages(chatId),
              (messages = []) =>
                messages.map((item) => (item.id === current.targetMessageId ? message : item)),
            );
          }
          void invalidateChatQueries(queryClient, chatId);
          setGeneration(null);
        }
      });
      const completed = await controller.done;
      if (completed.phase === 'failed') {
        throw new Error(completed.error ?? 'Generation failed.');
      }
      unsubscribe();
    },
    onError: (error) => {
      if (error.name === 'AbortError') {
        return;
      }
      const current = generationRef.current;
      if (current) {
        setGeneration({ ...current, stage: 'failed', error: error.message });
      }
    },
    onSettled: () => {},
  });

  const regenerateMessage = useCallback(
    (messageId: string) => {
      lastMessageIdRef.current = messageId;
      const generationId = randomUUID();
      setGeneration({
        id: generationId,
        chatId,
        stage: 'preparing',
        lastDurableSequence: 0,
        targetMessageId: messageId,
      });
      void mutation.mutateAsync({ messageId, generationId }).catch(() => undefined);
    },
    [chatId, mutation, setGeneration],
  );

  const retryGeneration = useCallback(() => {
    if (lastMessageIdRef.current) {
      regenerateMessage(lastMessageIdRef.current);
    }
  }, [regenerateMessage]);

  return { cancelGeneration, generation, regenerateMessage, retryGeneration };
}
