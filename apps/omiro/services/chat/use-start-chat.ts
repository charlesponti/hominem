import type { ChatsStartStreamEvent } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { OFFLINE_UNAVAILABLE_ERROR } from '~/services/chat/chat-errors';
import type { MessageOutput } from '~/services/chat/chatMessages';
import { streamSSE } from '~/services/chat/stream-sse';
import { toMessageOutput } from '~/services/chat/use-chat-messages';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { getContentRoute } from '~/services/navigation/routes';
import { chatKeys } from '~/services/notes/query-keys';

interface StartChatOptions {
  onReady?: () => void;
}

type StartChatInput = {
  title: string;
  message: string;
  fileIds?: string[];
  noteIds?: string[];
};

export function useStartChat() {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const startedChatIdRef = useRef<string | null>(null);

  const mutation = useMutation<void, Error, StartChatInput & StartChatOptions>({
    mutationFn: async ({ onReady, ...input }) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        throw new Error(OFFLINE_UNAVAILABLE_ERROR);
      }

      startedChatIdRef.current = null;
      const generationId = randomUUID();

      try {
        await streamSSE<ChatsStartStreamEvent>({
          url: `${API_BASE_URL}/api/chats/start-stream`,
          payload: {
            ...input,
            generationId,
            responseLength: getChatResponseLength(),
          },
          getHeaders: getAuthHeaders,
          onEvent: (event) => {
            if (event.type === 'accepted') {
              startedChatIdRef.current = event.chatId;
              const userMessage = event.userMessage ? toMessageOutput(event.userMessage) : null;
              queryClient.setQueryData(chatKeys.activeChat(event.chatId), event.chat);
              queryClient.setQueryData<MessageOutput[]>(
                chatKeys.messages(event.chatId),
                userMessage ? [userMessage] : [],
              );

              void invalidateInboxQueries(queryClient);
              onReady?.();
              router.push(getContentRoute('chat', event.chatId));
              return;
            }

            if (event.type === 'committed') {
              const assistantMessage = toMessageOutput(event.message);
              if (!assistantMessage || !startedChatIdRef.current) return;
              queryClient.setQueryData<MessageOutput[]>(
                chatKeys.messages(startedChatIdRef.current),
                (messages = []) => [...messages, assistantMessage],
              );
            }
          },
          onDone: () => {
            if (!startedChatIdRef.current) {
              return;
            }
            void invalidateInboxQueries(queryClient);
            void queryClient.invalidateQueries({
              queryKey: chatKeys.messages(startedChatIdRef.current),
            });
          },
        });
      } catch (error) {
        if (!startedChatIdRef.current) {
          throw error;
        }
        void invalidateInboxQueries(queryClient);
        throw error;
      }
    },
  });

  const startChat = useCallback(
    async (input: StartChatInput & StartChatOptions) => mutation.mutateAsync(input),
    [mutation],
  );

  return {
    isStartingChat: mutation.isPending,
    startChat: startChat as (input: StartChatInput & StartChatOptions) => Promise<void>,
  };
}
