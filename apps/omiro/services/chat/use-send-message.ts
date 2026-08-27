import NetInfo from '@react-native-community/netinfo';
import { xhrHttpStream, useChat } from '@tanstack/ai-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys, inboxKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { OFFLINE_UNAVAILABLE_ERROR } from './chat-errors';
import { createOptimisticMessage, type MessageOutput } from './chatMessages';
import { useChatGeneration } from './use-chat-generation';

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
  const lastInputRef = useRef<SendInput | null>(null);
  const { generation, generationRef, setGeneration } = useChatGeneration({
    chatId,
    getAuthHeaders,
  });
  const chat = useChat({
    threadId: chatId,
    persistence: true,
    queue: 'drop',
    connection: xhrHttpStream(`${API_BASE_URL}/api/chats/${chatId}/agent`, async () => ({
      headers: await getAuthHeaders(),
      withCredentials: true,
    })),
    onFinish: () => {
      setGeneration(null);
      triggerAssistantCompletionHaptic();
      void queryClient.invalidateQueries({ queryKey: inboxKeys.pages() });
      void invalidateChatQueries(queryClient, chatId);
    },
  });

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
      setGeneration({ id: generationId, chatId, stage: 'preparing', userMessageId });
      return { userMessageId };
    },
    mutationFn: async ({ message, fileIds, responseModality }) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) throw new Error(OFFLINE_UNAVAILABLE_ERROR);
      await chat.sendMessage(message.trim(), {
        body: {
          operation: {
            kind: 'send',
            fileIds,
            responseModality,
            responseLength: getChatResponseLength(),
          },
        },
      });
    },
    onError: (error, _input, context) => {
      if (generationRef.current?.stage === 'stopping' || error.name === 'AbortError') return;
      const current = generationRef.current;
      if (current) setGeneration({ ...current, stage: 'failed', error: error.message });
      if (!context) return;
      queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (messages = []) =>
        messages.filter(
          (item) => item.id !== context.userMessageId || item.message.trim().length > 0,
        ),
      );
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
    if (lastInputRef.current) void sendChatMessage(lastInputRef.current).catch(() => undefined);
  }, [sendChatMessage]);

  const cancelGeneration = useCallback(async () => {
    const runId = chat.runId;
    const current = generationRef.current;
    if (runId) {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE_URL}/api/chats/${chatId}/agent/runs/${runId}/cancel`, {
        method: 'POST',
        headers,
      });
    }
    chat.stop();
    if (current) setGeneration({ ...current, stage: 'cancelled' });
  }, [chat, chatId, generationRef, getAuthHeaders, setGeneration]);

  return {
    cancelGeneration,
    generation,
    isChatSending: mutation.isPending,
    retryFailedMessage: retryLastGeneration,
    retryLastGeneration,
    sendChatMessage,
  };
}
