import { getGenerationFailureMessage } from '@hominem/chat';
import type { GenerationHistoryEvent as GenerationDomainEvent } from '@hominem/chat';
import { ChatClient } from '@hominem/chat/client';
import type { ChatGenerationController, GenerationClientState } from '@hominem/chat/client';
import { xhrChatTransport } from '@hominem/chat/transport/xhr';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useCallback, useRef } from 'react';

import type { ChatMessageItem } from '~/components/chat';
import { API_BASE_URL } from '~/constants';
import { getChatResponseLength } from '~/hooks/use-chat-response-length';
import { useAuth } from '~/services/auth/auth-provider';
import { OFFLINE_UNAVAILABLE_ERROR } from '~/services/chat/chat-errors';
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

function createCheckpointStore() {
  const checkpoints = new Map<string, GenerationClientState>();
  return {
    get: (generationId: string) => checkpoints.get(generationId) ?? null,
    set: (state: GenerationClientState) => {
      checkpoints.set(state.generationId, state);
    },
    remove: (generationId: string) => {
      checkpoints.delete(generationId);
    },
  };
}

export function useStartChat() {
  const { getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const chatClientRef = useRef<ChatClient | null>(null);
  const generationRef = useRef<ChatGenerationController | null>(null);
  const startedChatIdRef = useRef<string | null>(null);
  if (!chatClientRef.current) {
    chatClientRef.current = new ChatClient({
      baseUrl: API_BASE_URL,
      headers: getAuthHeaders,
      transport: xhrChatTransport(),
      checkpointStore: createCheckpointStore(),
    });
  }

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
      if (net.isConnected === false) throw new Error(OFFLINE_UNAVAILABLE_ERROR);

      startedChatIdRef.current = null;
      const generation = chatClientRef.current!.start({
        ...input,
        generationId: randomUUID(),
        responseLength: getChatResponseLength(),
      });
      generationRef.current = generation;
      generation.subscribe((_state, event) => {
        if (!('payload' in event)) return;
        const failureMessage = getGenerationFailureMessage(event);
        if (failureMessage) throw new Error(failureMessage);
        if (event.type === 'generation.accepted') {
          startedChatIdRef.current = event.payload.chatId;
          const userMessage = event.payload.userMessage
            ? toMessageOutput(event.payload.userMessage)
            : null;
          queryClient.setQueryData(chatKeys.activeChat(event.payload.chatId), event.payload.chat);
          queryClient.setQueryData<ChatMessageItem[]>(
            chatKeys.messages(event.payload.chatId),
            userMessage ? [userMessage] : [],
          );
          void reconcileStartedChat(event.payload.chatId);
          onAccepted?.(event);
        }
        if (event.type === 'generation.committed' && startedChatIdRef.current) {
          const assistantMessage = toMessageOutput(event.payload.message);
          if (!assistantMessage) return;
          queryClient.setQueryData<ChatMessageItem[]>(
            chatKeys.messages(startedChatIdRef.current),
            (messages = []) => [...messages, assistantMessage],
          );
        }
      });

      try {
        await generation.done;
      } catch (error) {
        if (startedChatIdRef.current) void reconcileStartedChat(startedChatIdRef.current);
        throw error;
      } finally {
        generationRef.current = null;
      }
      if (!startedChatIdRef.current) throw new Error('Chat was not created');
      await reconcileStartedChat(startedChatIdRef.current);
      return startedChatIdRef.current;
    },
  });

  const startChat = useCallback(
    (input: StartChatInput & StartChatOptions): Promise<string> => mutation.mutateAsync(input),
    [mutation],
  );

  const cancel = useCallback(() => {
    generationRef.current?.cancel();
  }, []);

  return {
    cancel,
    isStartingChat: mutation.isPending,
    startChat,
  };
}
