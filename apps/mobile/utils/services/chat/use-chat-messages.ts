import type { Chat, ChatMessage } from '@hominem/hono-rpc/types';

import { useChat, type Message } from '@ai-sdk/react';
import { useHonoClient } from '@hominem/hono-client/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { captureException } from '@sentry/react-native';
import { useMutation, useQuery, type MutationOptions } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';

import type { Chat as LocalChat, ChatMessage as LocalChatMessage } from '~/utils/local-store/types';

import { createMobileChatFetch, getMobileChatEndpoint } from '~/utils/ai-sdk/mobile-chat-transport';
import { useAuth } from '~/utils/auth-provider';
import { AI_SDK_CHAT_MOBILE_ENABLED } from '~/utils/constants';
import { LocalStore } from '~/utils/local-store';

import { log } from '../../logger';
import queryClient from '../../query-client';

export type MessageOutput = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  message: string;
  created_at: string;
  chat_id: string;
  profile_id: string;
  focus_ids: string[] | null;
  focus_items: Array<{ id: string; text: string }> | null;
};

type SendChatMessageOutput = {
  messages: MessageOutput[];
  function_calls: string[];
};

type StartChatPayload = {
  user_message: string;
  sherpa_message: string;
  intent_id?: string;
  seed_prompt?: string;
};

const START_QUEUE_KEY = '@start_chat_queue';

function toMessageOutput(message: ChatMessage): MessageOutput {
  return {
    id: message.id,
    role: message.role === 'tool' ? 'assistant' : message.role,
    message: message.content,
    created_at: message.createdAt,
    chat_id: message.chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
  };
}

function toMessageOutputFromUIMessage(message: Message, chatId: string): MessageOutput {
  return {
    id: message.id,
    role: message.role === 'data' ? 'assistant' : message.role,
    message: message.content,
    created_at: message.createdAt
      ? new Date(message.createdAt).toISOString()
      : new Date().toISOString(),
    chat_id: chatId,
    profile_id: '',
    focus_ids: null,
    focus_items: null,
  };
}

export const useChatMessages = ({ chatId }: { chatId: string }) => {
  const client = useHonoClient();
  const [localMessages, setLocalMessages] = useState<MessageOutput[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!chatId) return;

    setIsLoadingLocal(true);
    LocalStore.listMessages(chatId)
      .then((messages) => {
        if (!isMounted) return;
        setLocalMessages(messages.map(toLocalMessageOutput));
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoadingLocal(false);
      });

    return () => {
      isMounted = false;
    };
  }, [chatId]);

  const query = useQuery<MessageOutput[]>({
    queryKey: ['chatMessages', chatId],
    queryFn: async () => {
      const response = await client.api.chats[':id'].messages.$get({
        param: { id: chatId },
      });
      const remote = (await response.json()) as ChatMessage[];
      const mapped = remote.map(toMessageOutput);
      await persistMessages(chatId, mapped);
      return mapped;
    },
    enabled: Boolean(chatId) && localMessages.length === 0,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });

  return {
    ...query,
    data: localMessages.length > 0 ? localMessages : query.data,
    isPending: isLoadingLocal || query.isPending,
  };
};

export const useSendMessage = ({ chatId }: { chatId: string }) => {
  const client = useHonoClient();
  const { getAccessToken } = useAuth();
  const [sendChatError, setSendChatError] = useState(false);

  const chat = useChat({
    id: `mobile-chat-${chatId}`,
    api: getMobileChatEndpoint(chatId),
    streamProtocol: 'data',
    // @ts-expect-error fetch function signature is compatible at runtime
    fetch: createMobileChatFetch(getAccessToken),
    onError: (error) => {
      setSendChatError(true);
      captureException(error);
    },
    onFinish: async () => {
      await syncMessages(client, chatId);
      setSendChatError(false);
    },
  });

  const { mutateAsync: sendChatMessage, isPending: isChatSending } =
    useMutation<SendChatMessageOutput>({
      mutationKey: ['sendChatMessage', chatId],
      mutationFn: async () => {
        const text = chat.input.trim();
        if (!text) {
          return {
            messages: [],
            function_calls: [],
          };
        }

        const status = await NetInfo.fetch();
        if (!status.isConnected) {
          throw new Error('offline_unavailable');
        }

        if (!AI_SDK_CHAT_MOBILE_ENABLED) {
          const response = await client.api.chats[':id'].send.$post({
            param: { id: chatId },
            json: { message: text },
          });
          const payload = (await response.json()) as {
            messages: {
              user: ChatMessage;
              assistant: ChatMessage;
            };
          };
          const mappedMessages = [
            toMessageOutput(payload.messages.user),
            toMessageOutput(payload.messages.assistant),
          ];
          await persistMessages(chatId, mappedMessages);
          queryClient.setQueryData(['chatMessages', chatId], mappedMessages);
          chat.setInput('');
          return {
            messages: mappedMessages,
            function_calls: [],
          };
        }

        await chat.append({
          role: 'user',
          content: text,
        });
        chat.setInput('');

        const uiMapped = chat.messages.map((message) =>
          toMessageOutputFromUIMessage(message, chatId),
        );
        queryClient.setQueryData(['chatMessages', chatId], uiMapped);
        await persistMessages(chatId, uiMapped);

        return {
          messages: uiMapped,
          function_calls: [],
        };
      },
      onError: (error) => {
        setSendChatError(true);
        log('Error sending chat message:', error);
        captureException(error);
      },
    });

  return {
    message: chat.input,
    isChatSending: isChatSending || chat.status === 'submitted' || chat.status === 'streaming',
    sendChatMessage,
    setMessage: chat.setInput,
    sendChatError,
    setSendChatError,
  };
};

export const useStartChat = ({
  userMessage,
  sherpaMessage,
  intentId,
  seedPrompt,
  ...props
}: {
  userMessage: string;
  sherpaMessage: string;
  intentId?: string;
  seedPrompt?: string;
} & MutationOptions<LocalChat>) => {
  const client = useHonoClient();

  const payload: StartChatPayload = {
    user_message: userMessage,
    sherpa_message: sherpaMessage,
    intent_id: intentId,
    seed_prompt: seedPrompt,
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      if (!state.isConnected) return;

      const queued = await AsyncStorage.getItem(START_QUEUE_KEY);
      if (!queued) return;

      const parsed = JSON.parse(queued) as StartChatPayload[];
      await AsyncStorage.removeItem(START_QUEUE_KEY);

      for (const queuedPayload of parsed) {
        try {
          await startRemoteChat(client, queuedPayload.user_message);
        } catch (error) {
          captureException(error);
        }
      }
    });

    return () => unsubscribe();
  }, [client]);

  return useMutation<LocalChat>({
    mutationKey: ['startChat'],
    mutationFn: async () => {
      const status = await NetInfo.fetch();
      if (!status.isConnected) {
        const existing = await AsyncStorage.getItem(START_QUEUE_KEY);
        const queued = existing ? (JSON.parse(existing) as StartChatPayload[]) : [];
        await AsyncStorage.setItem(START_QUEUE_KEY, JSON.stringify([...queued, payload]));
        throw new Error('queued_offline');
      }

      const chat = await startRemoteChat(client, payload.user_message);

      await LocalStore.createChat({
        id: chat.id,
        createdAt: chat.createdAt,
        endedAt: null,
        title: chat.title ?? null,
      });

      if (userMessage) {
        await persistMessages(chat.id, [
          {
            id: generateId(),
            role: 'user',
            message: userMessage,
            created_at: new Date().toISOString(),
            chat_id: chat.id,
            profile_id: '',
            focus_ids: null,
            focus_items: null,
          },
        ]);
      }

      return {
        id: chat.id,
        createdAt: chat.createdAt,
        endedAt: null,
        title: chat.title,
      };
    },
    ...props,
  });
};

export const useEndChat = ({
  chatId,
  ...props
}: { chatId: string } & MutationOptions<LocalChat>) => {
  return useMutation<LocalChat>({
    mutationKey: ['endChat', chatId],
    mutationFn: async () => {
      const endedAt = new Date().toISOString();
      const updatedChat = await LocalStore.endChat(chatId, endedAt);
      return updatedChat;
    },
    ...props,
  });
};

export const useActiveChat = () => {
  return useQuery<LocalChat | null>({
    queryKey: ['activeChatLocal'],
    queryFn: async () => {
      const chats = await LocalStore.listChats();
      const active = chats.find((chat) => !chat.endedAt);
      return active ?? null;
    },
  });
};

async function syncMessages(client: ReturnType<typeof useHonoClient>, chatId: string) {
  const response = await client.api.chats[':id'].messages.$get({
    param: { id: chatId },
    query: { limit: '50' },
  });
  const remote = (await response.json()) as ChatMessage[];
  const mapped = remote.map(toMessageOutput);
  await persistMessages(chatId, mapped);
  queryClient.setQueryData(['chatMessages', chatId], mapped);
}

async function startRemoteChat(
  client: ReturnType<typeof useHonoClient>,
  initialMessage: string,
): Promise<Chat> {
  const title = initialMessage.trim().slice(0, 64) || 'Sherpa chat';

  const chatResponse = await client.api.chats.$post({
    json: { title },
  });

  const chat = (await chatResponse.json()) as Chat;

  if (initialMessage.trim()) {
    await client.api.chats[':id'].send.$post({
      param: { id: chat.id },
      json: { message: initialMessage },
    });
  }

  return chat;
}

const generateId = () => randomUUID();

const toLocalMessageOutput = (message: LocalChatMessage): MessageOutput => ({
  id: message.id,
  role: message.role,
  message: message.content,
  created_at: message.createdAt,
  chat_id: message.chatId,
  profile_id: '',
  focus_ids: message.focusIdsJson ? (JSON.parse(message.focusIdsJson) as string[]) : null,
  focus_items: message.focusItemsJson
    ? (JSON.parse(message.focusItemsJson) as Array<{ id: string; text: string }>)
    : null,
});

const persistMessages = async (chatId: string, messages: MessageOutput[]) => {
  await Promise.all(
    messages.map((msg) =>
      LocalStore.addMessage({
        id: msg.id ?? generateId(),
        chatId,
        role: msg.role,
        content: msg.message ?? '',
        focusItemsJson: msg.focus_items ? JSON.stringify(msg.focus_items) : null,
        focusIdsJson: msg.focus_ids ? JSON.stringify(msg.focus_ids) : null,
        createdAt: msg.created_at ?? new Date().toISOString(),
      }),
    ),
  );
};
