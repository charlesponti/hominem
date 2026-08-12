import type { ChatsStartStreamEvent, ChatsStartStreamInput } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import {
  appendAssistantChunk,
  failAssistantStream,
  finishAssistantStream,
  seedStartedChat,
} from '~/services/chat/chat-stream-cache';
import { streamSSE } from '~/services/chat/stream-sse';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { getContentRoute } from '~/services/navigation/routes';
import { chatKeys } from '~/services/notes/query-keys';

interface StartChatOptions {
  onReady?: () => void;
}

export function useStartChat() {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const startedChatIdRef = useRef<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const userMessageIdRef = useRef<string | null>(null);

  const mutation = useMutation<void, Error, ChatsStartStreamInput & StartChatOptions>({
    mutationFn: async ({ onReady, ...input }) => {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        throw new Error('offline_unavailable');
      }

      startedChatIdRef.current = null;
      assistantMessageIdRef.current = randomUUID();
      userMessageIdRef.current = randomUUID();

      try {
        await streamSSE<ChatsStartStreamEvent>({
          url: `${API_BASE_URL}/api/chats/start-stream`,
          payload: {
            ...input,
            responseLength: getChatResponseLength(),
          },
          getHeaders: getAuthHeaders,
          onEvent: (event) => {
            if (event.type === 'ready') {
              startedChatIdRef.current = event.chatId;

              seedStartedChat(queryClient, {
                chat: event.chat,
                message: input.message.trim(),
                userMessageId: userMessageIdRef.current ?? randomUUID(),
                assistantMessageId: assistantMessageIdRef.current ?? randomUUID(),
              });

              void invalidateInboxQueries(queryClient);
              onReady?.();
              router.push(getContentRoute('chat', event.chatId));
              return;
            }

            if (event.type === 'chunk') {
              if (!startedChatIdRef.current || !assistantMessageIdRef.current) {
                return;
              }

              appendAssistantChunk(queryClient, {
                chatId: startedChatIdRef.current,
                assistantMessageId: assistantMessageIdRef.current,
                chunk: event.chunk,
              });
            }
          },
          onDone: () => {
            if (!startedChatIdRef.current || !assistantMessageIdRef.current) {
              return;
            }

            finishAssistantStream(queryClient, {
              chatId: startedChatIdRef.current,
              assistantMessageId: assistantMessageIdRef.current,
            });
            void invalidateInboxQueries(queryClient);
            void queryClient.invalidateQueries({
              queryKey: chatKeys.messages(startedChatIdRef.current),
            });
          },
        });
      } catch (error) {
        if (!startedChatIdRef.current || !assistantMessageIdRef.current) {
          throw error;
        }

        failAssistantStream(queryClient, {
          chatId: startedChatIdRef.current,
          assistantMessageId: assistantMessageIdRef.current,
          errorMessage: error instanceof Error ? error.message : 'Stream error',
        });
        void invalidateInboxQueries(queryClient);
      }
    },
  });

  const startChat = useCallback(
    async (input: ChatsStartStreamInput & StartChatOptions) => mutation.mutateAsync(input),
    [mutation],
  );

  return {
    isStartingChat: mutation.isPending,
    startChat,
    startChatError: mutation.error,
  };
}
