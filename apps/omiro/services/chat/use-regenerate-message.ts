import { xhrHttpStream, useChat } from '@tanstack/ai-react';
import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';
import { useChatGeneration } from './use-chat-generation';

export function useRegenerateMessage(chatId: string) {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const lastMessageIdRef = useRef<string | null>(null);
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
      void queryClient.invalidateQueries({ queryKey: chatKeys.messages(chatId) });
      void invalidateChatQueries(queryClient, chatId);
    },
    onError: (error) => {
      const current = generationRef.current;
      if (current) setGeneration({ ...current, stage: 'failed', error: error.message });
    },
  });

  const regenerateMessage = useCallback(
    (messageId: string) => {
      if (chat.isLoading) return;
      lastMessageIdRef.current = messageId;
      setGeneration({ id: randomUUID(), chatId, stage: 'preparing', targetMessageId: messageId });
      void chat
        .sendMessage('', {
          body: {
            operation: {
              kind: 'regenerate',
              assistantMessageId: messageId,
              responseLength: getChatResponseLength(),
            },
          },
        })
        .catch(() => undefined);
    },
    [chat, chatId, setGeneration],
  );

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

  const retryGeneration = useCallback(() => {
    if (lastMessageIdRef.current) regenerateMessage(lastMessageIdRef.current);
  }, [regenerateMessage]);

  return { cancelGeneration, generation, regenerateMessage, retryGeneration };
}
