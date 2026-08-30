import {
  getGenerationFailureMessage,
  parseGenerationWireEvent,
} from '@hominem/rpc/generation-events';
import type { GenerationDomainEvent } from '@hominem/rpc/types';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { OFFLINE_UNAVAILABLE_ERROR } from '~/services/chat/chat-errors';
import { consumeGenerationSseXhr } from '~/services/chat/consume-sse-xhr';
import { toMessageOutput } from '~/services/chat/use-chat-messages';
import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';
import { chatKeys } from '~/services/notes/query-keys';

import { invalidateChatQueries } from './chat-cache';

interface StartChatOptions {
  onAccepted?: (event: Extract<GenerationDomainEvent, { type: 'generation.accepted' }>) => void;
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
      const responseLength = getChatResponseLength();
      const payload = { ...input, generationId, responseLength };

      try {
        await consumeGenerationSseXhr({
          url: `${API_BASE_URL}/api/chats/start-stream`,
          payload,
          replayUrl: () => `${API_BASE_URL}/api/chats/start-stream`,
          replayMethod: 'POST',
          replayPayload: payload,
          getHeaders: getAuthHeaders,
          parseEvent: parseGenerationWireEvent,
          onEvent: (event) => {
            const failureMessage = getGenerationFailureMessage(event);
            if (failureMessage) throw new Error(failureMessage);
            if ('payload' in event && event.type === 'generation.accepted') {
              startedChatIdRef.current = event.payload.chatId;
              const userMessage = event.payload.userMessage
                ? toMessageOutput(event.payload.userMessage)
                : null;
              queryClient.setQueryData(
                chatKeys.activeChat(event.payload.chatId),
                event.payload.chat,
              );
              queryClient.setQueryData<ChatMessageItem[]>(
                chatKeys.messages(event.payload.chatId),
                userMessage ? [userMessage] : [],
              );

              void reconcileStartedChat(event.payload.chatId);
              onAccepted?.(event);
              return;
            }

            if ('payload' in event && event.type === 'generation.committed') {
              const assistantMessage = toMessageOutput(event.payload.message);
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
    (input: StartChatInput & StartChatOptions): Promise<string> => mutation.mutateAsync(input),
    [mutation],
  );

  return {
    isStartingChat: mutation.isPending,
    startChat,
  };
}
