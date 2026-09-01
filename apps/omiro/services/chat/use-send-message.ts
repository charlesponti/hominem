import {
  createGenerationClientState,
  getGenerationFailureMessage,
  parseGenerationWireEvent,
  reduceGenerationClientEvent,
} from '@hominem/chat';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { playAudioReply } from '~/components/media/audio-playback.service';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { OFFLINE_UNAVAILABLE_ERROR } from './chat-errors';
import { consumeGenerationSseXhr } from './consume-sse-xhr';
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

export function useSendMessage({ chatId }: { chatId: string }) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const lastInputRef = useRef<SendInput | null>(null);
  const handleGenerationTerminal = useCallback(async () => {
    await invalidateChatQueries(queryClient, chatId);
  }, [chatId, queryClient]);
  const { abortControllerRef, cancelGeneration, generation, generationRef, setGeneration } =
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
      if (net.isConnected === false) throw new Error(OFFLINE_UNAVAILABLE_ERROR);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      let clientState = createGenerationClientState(generationId);
      await consumeGenerationSseXhr({
        url: `${API_BASE_URL}/api/chats/${chatId}/stream`,
        payload: {
          generationId,
          message: message.trim(),
          fileIds,
          responseModality,
          responseLength: getChatResponseLength(),
        },
        replayUrl: (afterSequence) =>
          `${API_BASE_URL}/api/chats/${chatId}/generations/${generationId}/stream?afterSequence=${afterSequence}`,
        getHeaders: getAuthHeaders,
        signal: controller.signal,
        parseEvent: parseGenerationWireEvent,
        getReplayCursor: () => clientState.lastDurableSequence,
        onEvent: (event) => {
          clientState = reduceGenerationClientEvent(clientState, event);
          const current = generationRef.current;
          if (!current || current.id !== generationId) return;
          const stage = clientState.phase === 'cancel_requested' ? 'stopping' : clientState.phase;
          setGeneration({
            ...current,
            stage,
            lastDurableSequence: clientState.lastDurableSequence,
          });
          const failureMessage = getGenerationFailureMessage(event);
          if (failureMessage) throw new Error(failureMessage);
          if (
            'payload' in event &&
            event.type === 'generation.accepted' &&
            event.payload.userMessage
          ) {
            const userMessage = toMessageOutput(event.payload.userMessage);
            if (userMessage) {
              queryClient.setQueryData<ChatMessageItem[]>(
                chatKeys.messages(chatId),
                (current = []) =>
                  current.map((item) =>
                    item.id === generationRef.current?.userMessageId ? userMessage : item,
                  ),
              );
            }
            return;
          }
          if ('payload' in event && event.type === 'generation.phase_changed') {
            return;
          }
          if ('payload' in event && event.type === 'generation.committed') {
            const committed = toMessageOutput(event.payload.message);
            if (committed) {
              queryClient.setQueryData<ChatMessageItem[]>(
                chatKeys.messages(chatId),
                (current = []) => [
                  ...current.filter((item) => item.id !== committed.id),
                  committed,
                ],
              );
              if (committed.audio?.url) playAudioReply(committed.id, committed.audio.url);
            }
            setGeneration(null);
            triggerAssistantCompletionHaptic();
            void queryClient.invalidateQueries({ queryKey: inboxKeys.pages() });
            void invalidateChatQueries(queryClient, chatId);
            return;
          }
          if ('payload' in event && event.type === 'generation.cancelled') {
            return;
          }
        },
      });
    },
    onError: (error, _input, context) => {
      abortControllerRef.current = null;
      if (generationRef.current?.stage === 'stopping' || error.name === 'AbortError') return;
      const current = generationRef.current;
      if (current) setGeneration({ ...current, stage: 'failed', error: error.message });
      if (!context) return;
      queryClient.setQueryData<ChatMessageItem[]>(chatKeys.messages(chatId), (messages = []) =>
        messages.filter(
          (item) => item.id !== context.userMessageId || item.message.trim().length > 0,
        ),
      );
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
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
