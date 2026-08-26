import type { ChatStreamEvent } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

import { playAudioReply } from '~/components/media/audio-playback.service';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

import { OFFLINE_UNAVAILABLE_ERROR } from './chat-errors';
import type { ChatGenerationState } from './chat-generation';
import { createOptimisticMessage, type MessageOutput } from './chatMessages';
import { streamSSE } from './stream-sse';
import { toMessageOutput } from './use-chat-messages';

function triggerAssistantCompletionHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export interface SendInput {
  message: string;
  fileIds?: string[];
  responseModality?: 'text' | 'audio';
  messageId?: string;
}

type MutationInput = SendInput & { generationId: string };
type SendContext = { userMessageId: string };

export function useSendMessage({ chatId }: { chatId: string }) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef<ChatGenerationState | null>(null);
  const lastInputRef = useRef<SendInput | null>(null);
  const [generation, setGeneration] = useState<ChatGenerationState | null>(null);

  const setCurrentGeneration = useCallback((next: ChatGenerationState | null) => {
    generationRef.current = next;
    setGeneration(next);
  }, []);

  const mutation = useMutation<void, Error, MutationInput, SendContext>({
    mutationKey: ['chat-generation', chatId],
    retry: false,
    onMutate: async ({ message, messageId, generationId }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const userMessageId = messageId ?? randomUUID();
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (previous = []) => [
        ...previous,
        createOptimisticMessage(chatId, message, userMessageId),
      ]);
      setCurrentGeneration({ id: generationId, chatId, stage: 'preparing', userMessageId });
      return { userMessageId };
    },
    mutationFn: async ({ generationId, message, fileIds, responseModality }) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) throw new Error(OFFLINE_UNAVAILABLE_ERROR);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      await streamSSE<ChatStreamEvent>({
        url: `${API_BASE_URL}/api/chats/${chatId}/stream`,
        payload: {
          generationId,
          message: message.trim(),
          fileIds,
          responseModality,
          responseLength: getChatResponseLength(),
        },
        getHeaders: getAuthHeaders,
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === 'accepted' && event.userMessage) {
            const userMessage = toMessageOutput(event.userMessage);
            if (userMessage) {
              queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (current = []) =>
                current.map((item) =>
                  item.id === generationRef.current?.userMessageId ? userMessage : item,
                ),
              );
            }
            return;
          }
          if (event.type === 'status') {
            const current = generationRef.current;
            if (current?.id === event.generationId) {
              setCurrentGeneration({ ...current, stage: event.status });
            }
            return;
          }
          if (event.type === 'committed') {
            const committed = toMessageOutput(event.message);
            if (committed) {
              queryClient.setQueryData<MessageOutput[]>(
                chatKeys.messages(chatId),
                (current = []) => [
                  ...current.filter((item) => item.id !== committed.id),
                  committed,
                ],
              );
              if (committed.audio?.url) playAudioReply(committed.id, committed.audio.url);
            }
            setCurrentGeneration(null);
            triggerAssistantCompletionHaptic();
            void queryClient.invalidateQueries({ queryKey: inboxKeys.pages() });
            return;
          }
          if (event.type === 'cancelled') {
            const current = generationRef.current;
            if (current?.id === event.generationId) {
              setCurrentGeneration({ ...current, stage: 'cancelled' });
            }
          }
        },
      });
    },
    onError: (error, _input, context) => {
      abortControllerRef.current = null;
      if (generationRef.current?.stage === 'stopping' || error.name === 'AbortError') return;
      const current = generationRef.current;
      if (current) setCurrentGeneration({ ...current, stage: 'failed', error: error.message });
      if (!context) return;
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (messages = []) =>
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
      return mutation
        .mutateAsync({ ...input, generationId: randomUUID() })
        .catch((error: unknown) => Promise.reject(error));
    },
    [mutation],
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

  const retryLastGeneration = useCallback(() => {
    if (lastInputRef.current) void sendChatMessage(lastInputRef.current);
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
