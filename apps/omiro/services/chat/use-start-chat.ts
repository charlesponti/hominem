import type { ChatsStartStreamEvent } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import type { ChatMessageItem } from '~/components/chat';
import { OFFLINE_UNAVAILABLE_ERROR } from '~/services/chat/chat-errors';
import { streamSSE } from '~/services/chat/stream-sse';
import { toMessageOutput } from '~/services/chat/use-chat-messages';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';

interface StartChatOptions {
  onAccepted?: (event: Extract<ChatsStartStreamEvent, { type: 'accepted' }>) => void;
}

type StartChatInput = {
  title: string;
  message: string;
  fileIds?: string[];
};

export function useStartChat() {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();

  const startedChatIdRef = useRef<string | null>(null);
  const reconcileStartedChat = useCallback(
    (chatId: string) =>
      Promise.all([
        invalidateInboxQueries(queryClient),
        invalidateChatQueries(queryClient, chatId),
      ]),
    [queryClient],
  );

  const mutation = useMutation<string, Error, StartChatInput & StartChatOptions>({
    mutationFn: async ({ onAccepted, ...input }) => {
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
              queryClient.setQueryData<ChatMessageItem[]>(
                chatKeys.messages(event.chatId),
                userMessage ? [userMessage] : [],
              );

              void reconcileStartedChat(event.chatId);
              onAccepted?.(event);
              return;
            }

            if (event.type === 'committed') {
              const assistantMessage = toMessageOutput(event.message);
              if (!assistantMessage || !startedChatIdRef.current) return;
              queryClient.setQueryData<ChatMessageItem[]>(
                chatKeys.messages(startedChatIdRef.current),
                (messages = []) => [...messages, assistantMessage],
              );
            }
          },
          onDone: () => {
            if (!startedChatIdRef.current) {
              return;
            }
            void reconcileStartedChat(startedChatIdRef.current);
          },
        });
      } catch (error) {
        if (!startedChatIdRef.current) {
          throw error;
        }
        void reconcileStartedChat(startedChatIdRef.current);
        throw error;
      }

      if (!startedChatIdRef.current) {
        throw new Error('Chat was not created');
      }
      return startedChatIdRef.current;
    },
  });

  const startChat = useCallback(
    async (input: StartChatInput & StartChatOptions) => mutation.mutateAsync(input),
    [mutation],
  );

  return {
    isStartingChat: mutation.isPending,
    startChat: startChat as (input: StartChatInput & StartChatOptions) => Promise<string>,
  };
}
