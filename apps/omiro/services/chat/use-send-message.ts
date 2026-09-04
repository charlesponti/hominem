import type { GenerationPhase } from '@hominem/chat';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { playAudioReply } from '~/components/media/audio-playback.service';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { OFFLINE_UNAVAILABLE_ERROR } from './chat-errors';
import { useChatGeneration } from './use-chat-generation';
import { toMessageOutput } from './use-chat-messages';

function triggerAssistantCompletionHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

function fallbackId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createOptimisticMessage(
  chatId: string,
  messageText: string,
  id = fallbackId(),
): ChatMessageItem {
  return {
    id,
    renderKey: id,
    role: 'user',
    message: messageText,
    created_at: new Date().toISOString(),
    chat_id: chatId,
    profile_id: '',
    reasoning: null,
    toolCalls: null,
    isStreaming: false,
  };
}

export interface SendInput {
  message: string;
  fileIds?: string[];
  responseModality?: 'text' | 'audio';
}

type MutationInput = SendInput & { generationId: string };
type SendContext = { userMessageId: string };

function toStage(phase: GenerationPhase) {
  return phase === 'cancel_requested' ? 'stopping' : phase;
}

export function useSendMessage({ chatId }: { chatId: string }) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const lastInputRef = useRef<SendInput | null>(null);
  const handleGenerationTerminal = useCallback(async () => {
    await invalidateChatQueries(queryClient, chatId);
  }, [chatId, queryClient]);
  const { cancelGeneration, generation, generationRef, sendGeneration, setGeneration } =
    useChatGeneration({
      chatId,
      getAuthHeaders,
      onGenerationTerminal: handleGenerationTerminal,
    });

  const mutation = useMutation<void, Error, MutationInput, SendContext>({
    mutationKey: ['chat-generation', chatId],
    retry: false,
    onMutate: async ({ message, generationId }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const userMessageId = randomUUID();
      queryClient.setQueryData<ChatMessageItem[]>(chatKeys.messages(chatId), (previous = []) => [
        ...previous,
        createOptimisticMessage(chatId, message, userMessageId),
      ]);
      setGeneration({
        id: generationId,
        chatId,
        stage: 'preparing',
        lastDurableSequence: 0,
        userMessageId,
      });
      return { userMessageId };
    },
    mutationFn: async ({ generationId, message, fileIds, responseModality }) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        throw new Error(OFFLINE_UNAVAILABLE_ERROR);
      }

      const controller = sendGeneration(
        {
          chatId,
          generationId,
          message: message.trim(),
          fileIds,
          responseModality,
          responseLength: getChatResponseLength(),
        },
        {
          id: generationId,
          chatId,
          stage: 'preparing',
          lastDurableSequence: 0,
          userMessageId: generationRef.current?.userMessageId,
        },
      );
      const unsubscribe = controller.subscribe((state, event) => {
        const current = generationRef.current;
        if (!current || current.id !== generationId) return;
        if ('event' in event) {
          setGeneration({ ...current, stage: 'failed', error: event.event.message });
          return;
        }
        const stage =
          event.type === 'generation.phase_changed'
            ? toStage(event.payload.phase)
            : toStage(state.phase);
        setGeneration({ ...current, stage, lastDurableSequence: state.lastDurableSequence });
        if (event.type === 'generation.failed') {
          setGeneration({ ...current, stage: 'failed', error: event.payload.message });
          return;
        }
        if (event.type === 'generation.accepted' && event.payload.userMessage) {
          const userMessage = toMessageOutput(event.payload.userMessage);
          if (userMessage) {
            queryClient.setQueryData<ChatMessageItem[]>(
              chatKeys.messages(chatId),
              (currentMessages = []) =>
                currentMessages.map((item) =>
                  item.id === generationRef.current?.userMessageId ? userMessage : item,
                ),
            );
          }
          return;
        }
        if (event.type === 'confirmation.required') {
          void invalidateChatQueries(queryClient, chatId);
          return;
        }
        if (event.type === 'generation.cancelled') {
          setGeneration({ ...current, stage: 'cancelled' });
          return;
        }
        if (event.type === 'generation.committed') {
          const committed = toMessageOutput(event.payload.message);
          if (committed) {
            queryClient.setQueryData<ChatMessageItem[]>(
              chatKeys.messages(chatId),
              (currentMessages = []) => [
                ...currentMessages.filter((item) => item.id !== committed.id),
                committed,
              ],
            );
            if (committed.audio?.url) playAudioReply(committed.id, committed.audio.url);
          }
          triggerAssistantCompletionHaptic();
          void queryClient.invalidateQueries({ queryKey: inboxKeys.pages() });
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
    onError: (error, _input, context) => {
      if (generationRef.current?.stage === 'stopping' || error.name === 'AbortError') {
        return;
      }
      const current = generationRef.current;
      if (current) {
        setGeneration({ ...current, stage: 'failed', error: error.message });
      }
      if (!context) {
        return;
      }
      queryClient.setQueryData<ChatMessageItem[]>(chatKeys.messages(chatId), (messages = []) =>
        messages.filter(
          (item) => item.id !== context.userMessageId || item.message.trim().length > 0,
        ),
      );
    },
    onSettled: () => {},
  });

  const sendChatMessage = useCallback(
    (input: SendInput) => {
      lastInputRef.current = input;
      return mutation.mutateAsync({ ...input, generationId: randomUUID() });
    },
    [mutation],
  );

  const retryLastGeneration = useCallback(() => {
    if (lastInputRef.current) {
      void sendChatMessage(lastInputRef.current).catch(() => undefined);
    }
  }, [sendChatMessage]);

  return {
    cancelGeneration,
    generation,
    isChatSending: mutation.isPending,
    retryFailedMessage: retryLastGeneration,
    retryLastGeneration,
    sendChatMessage,
  };
}
