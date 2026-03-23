import type { ApiClient } from '@hominem/rpc';
import { useApiClient } from '@hominem/rpc/react';
import type { Chat, ChatMessage as RpcChatMessage } from '@hominem/rpc/types';
import { CHAT_TITLE_MAX_LENGTH } from '@hominem/chat-services';
import NetInfo from '@react-native-community/netinfo';
import { useMutation, useQuery, useQueryClient, type MutationOptions } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';

import { log } from '../../logger';
import {
  createOptimisticMessage,
  reconcileMessagesAfterSend,
  type MessageOutput,
} from './chat-contract';
import { getChatActivityAt, selectSherpaChat, type ChatWithActivity } from './session-state';
import {
  createChatInboxRefreshSnapshot,
  invalidateInboxQueries,
  upsertInboxSessionActivity,
} from '../inbox/inbox-refresh';
import { chatKeys } from '../notes/query-keys';

type SendChatMessageOutput = {
  messages: MessageOutput[];
  function_calls: string[];
};

function updateSessionCache(
  previousSessions: ChatWithActivity[] | undefined,
  snapshot: ReturnType<typeof createChatInboxRefreshSnapshot>,
) {
  return upsertInboxSessionActivity(previousSessions ?? [], snapshot)
}

function toMessageOutput(message: RpcChatMessage): MessageOutput | null {
  if (message.role === 'tool') {
    return null;
  }

  return {
    id: message.id,
    role: message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
    reasoning: message.reasoning,
    toolCalls: message.toolCalls ?? null,
    isStreaming: false,
  };
}

// Single source of truth: React Query cache
// SQLite is persistence layer only, updated after successful mutations
export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useApiClient();
  const _queryClient = useQueryClient();

  return useQuery<MessageOutput[]>({
    queryKey: chatKeys.messages(chatId),
    queryFn: async () => {
      const messages = await client.chats.getMessages({
        chatId,
        limit: 50,
      });

      const mapped = messages.flatMap((message) => {
        const output = toMessageOutput(message);
        return output ? [output] : [];
      });

      return mapped;
    },
    enabled: Boolean(chatId),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
};

export type ChatSendStatus = 'idle' | 'submitted' | 'streaming' | 'error';

// Consolidated send message with optimistic updates
export const useSendMessage = ({ chatId }: { chatId: string }) => {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [sendChatError, setSendChatError] = useState(false);
  const [chatSendStatus, setChatSendStatus] = useState<ChatSendStatus>('idle');

  const mutation = useMutation<
    SendChatMessageOutput,
    Error,
    string,
    { previousMessages: MessageOutput[] }
  >({
    mutationKey: ['sendChatMessage', chatId],

    // Optimistic update
    onMutate: async (messageText) => {
      setChatSendStatus('submitted');
      const text = messageText.trim();
      if (!text) {
        return { previousMessages: [] };
      }

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId)) || [];

      // Optimistically add user message
      const optimisticMessage = createOptimisticMessage(chatId, text, generateId());
      const now = new Date().toISOString();

      queryClient.setQueryData(chatKeys.messages(chatId), [...previousMessages, optimisticMessage]);
      queryClient.setQueryData(chatKeys.resumableSessions, (previousSessions: ChatWithActivity[] | undefined) =>
        updateSessionCache(
          previousSessions,
          createChatInboxRefreshSnapshot({
            chatId,
            noteId: null,
            title: null,
            timestamp: now,
            userId: '',
          }),
        ),
      );

      return { previousMessages };
    },

    mutationFn: async (messageText) => {
      const status = await NetInfo.fetch();
      if (!status.isConnected) {
        throw new Error('offline_unavailable');
      }

      const payload = await client.chats.send({
        chatId,
        message: messageText.trim(),
      });
      setChatSendStatus('streaming');
      const mappedMessages = [payload.messages.user, payload.messages.assistant].flatMap(
        (message) => {
          const output = toMessageOutput(message);
          return output ? [output] : [];
        },
      );

      return {
        messages: mappedMessages,
        function_calls: [],
      };
    },

    // On success, update cache with server data
    onSuccess: (data) => {
      setSendChatError(false);
      setChatSendStatus('idle');
      queryClient.setQueryData(chatKeys.messages(chatId), (old: MessageOutput[] | undefined) => {
        if (!old) {
          return data.messages;
        }
        return reconcileMessagesAfterSend(old, data.messages);
      });
      void invalidateInboxQueries(queryClient);
    },

    // Rollback on error
    onError: (error, variables, context) => {
      log('Error sending chat message:', error);
      setSendChatError(true);
      setChatSendStatus('error');
      if (context?.previousMessages) {
        queryClient.setQueryData(chatKeys.messages(chatId), context.previousMessages);
      }
    },
  });

  return {
    message,
    setMessage,
    sendChatError,
    setSendChatError,
    chatSendStatus,
    isChatSending: mutation.isPending,
    sendChatMessage: async (nextMessageText = message) => {
      const text = nextMessageText.trim();
      if (!text) {
        return {
          messages: [],
          function_calls: [],
        };
      }
      const result = await mutation.mutateAsync(text);
      setMessage('');
      return result;
    },
  };
};

// Simplified start chat - uses React Query retry instead of custom queue
export const useStartChat = ({
  userMessage,
  _sherpaMessage,
  _intentId,
  _seedPrompt,
  ...props
}: {
  userMessage: string;
  _sherpaMessage: string;
  _intentId?: string;
  _seedPrompt?: string;
} & MutationOptions<Chat, Error, void>) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, void>({
    mutationKey: ['startChat'],
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    mutationFn: async () => {
      const status = await NetInfo.fetch();
      if (!status.isConnected) {
        // React Query will handle retry when back online
        throw new Error('offline_retry');
      }

      const chat = await startRemoteChat(client, userMessage);
      return chat;
    },

    onSuccess: (chat) => {
      queryClient.setQueryData(chatKeys.resumableSessions, (previousSessions: ChatWithActivity[] | undefined) =>
        updateSessionCache(
          previousSessions,
          createChatInboxRefreshSnapshot({
            chatId: chat.id,
            noteId: chat.noteId,
            title: chat.title ?? null,
            timestamp: chat.createdAt,
            userId: chat.userId,
          }),
        ),
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.activeChat(chat.id) });
      void invalidateInboxQueries(queryClient);
    },
    ...props,
  });
};

export const useArchiveChat = ({
  chatId,
  ...props
}: { chatId: string } & MutationOptions<Chat, Error, void>) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Chat, Error, void>({
    mutationKey: ['archiveChat', chatId],
    mutationFn: async () => {
      return client.chats.archive({ chatId });
    },
    onSuccess: (chat) => {
      const activityAt = getChatActivityAt(chat);
      queryClient.setQueryData<ChatWithActivity[] | undefined>(
        chatKeys.resumableSessions,
        (previousSessions) => {
          const previous = previousSessions ?? []
          const snapshot = createChatInboxRefreshSnapshot({
            chatId: chat.id,
            noteId: chat.noteId,
            title: chat.title ?? null,
            timestamp: activityAt,
            userId: chat.userId,
          })

          return upsertInboxSessionActivity(previous, snapshot)
        },
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.activeChat(chatId) });
      void invalidateInboxQueries(queryClient);
    },
    ...props,
  });
};

export const useActiveChat = (chatId?: string | null) => {
  const client = useApiClient();

  return useQuery<Chat | null>({
    queryKey: chatKeys.activeChat(chatId ?? null),
    queryFn: async () => {
      if (chatId) {
        const chat = await client.chats.get({ chatId });
        const { messages: _messages, ...chatRecord } = chat;
        return chatRecord;
      }

      const chats = await client.chats.list({ limit: 50 });
      return selectSherpaChat(chats, chatId);
    },
  });
};

async function startRemoteChat(client: ApiClient, initialMessage: string): Promise<Chat> {
  const title = initialMessage.trim().slice(0, CHAT_TITLE_MAX_LENGTH) || 'Sherpa chat';

  const chat = await client.chats.create({
    title,
  });

  if (initialMessage.trim()) {
    await client.chats.send({
      chatId: chat.id,
      message: initialMessage,
    });
  }

  return chat;
}

const generateId = () => randomUUID();
