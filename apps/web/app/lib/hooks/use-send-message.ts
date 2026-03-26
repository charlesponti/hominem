import { useChat } from '@ai-sdk/react';
import { normalizeSendInput } from '@hominem/chat-services';
import { useRpcMutation } from '@hominem/rpc/react';
import type {
  ChatMessage,
  ChatsSendInput,
  ChatsSendOutput,
  ChatsGetMessagesOutput,
} from '@hominem/rpc/types/chat.types';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useMemo } from 'react';

import { chatQueryKeys } from '~/lib/query-keys';

import { useFeatureFlag } from './use-feature-flags';

type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';
type AiChatStatus = 'error' | 'ready' | 'streaming' | 'submitted';

function legacyStatusToChat(mutationStatus: string): ChatStatus {
  if (mutationStatus === 'pending') return 'submitted';
  if (mutationStatus === 'error') return 'error';
  return 'idle';
}

function aiStatusToChat(status: AiChatStatus): ChatStatus {
  if (status === 'submitted') return 'submitted';
  if (status === 'streaming') return 'streaming';
  if (status === 'error') return 'error';
  return 'idle';
}

export function useSendMessage({ chatId }: { chatId: string; userId?: string }) {
  const queryClient = useQueryClient();
  const aiSdkChatWebEnabled = useFeatureFlag('aiSdkChatWeb');
  const apiBase = import.meta.env.VITE_PUBLIC_API_URL as string;

  const chat = useChat({
    id: `chat-${chatId}`,
    transport: new DefaultChatTransport({
      api: `${apiBase}/api/chats/${chatId}/ui/send`,
      credentials: 'include',
    }),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
    },
  });

  const legacySend = useRpcMutation(
    async ({ chats }, variables: ChatsSendInput) => {
      return chats.send({
        chatId: variables.chatId || chatId,
        message: variables.message,
      }) as Promise<ChatsSendOutput>;
    },
    {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: chatQueryKeys.messages(chatId) });
        const optimistic: ChatMessage = {
          id: `optimistic-${Date.now()}`,
          chatId,
          userId: '',
          role: 'user',
          content: variables.message,
          files: null,
          toolCalls: null,
          reasoning: null,
          parentMessageId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<ChatsGetMessagesOutput>(chatQueryKeys.messages(chatId), (prev) => [
          ...(prev ?? []),
          optimistic,
        ]);
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      },
    },
  );

  const mutateAsync = async (variables: ChatsSendInput) => {
    const normalizedInput = normalizeSendInput({
      message: variables.message,
    });
    if (!normalizedInput) {
      return { ok: true };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are offline. Please check your connection and try again.');
    }

    if (!aiSdkChatWebEnabled) {
      await legacySend.mutateAsync({
        ...variables,
        message: normalizedInput.message,
      });
      return { ok: true };
    }

    await chat.sendMessage({
      text: normalizedInput.message,
    });
    return { ok: true };
  };

  return useMemo(
    () => ({
      mutateAsync,
      isPending: aiSdkChatWebEnabled
        ? chat.status === 'submitted' || chat.status === 'streaming'
        : legacySend.isPending,
      status: (aiSdkChatWebEnabled
        ? aiStatusToChat(chat.status)
        : legacyStatusToChat(legacySend.status)) satisfies ChatStatus,
      stop: chat.stop,
      error: aiSdkChatWebEnabled ? (chat.error ?? null) : (legacySend.error ?? null),
    }),
    [
      aiSdkChatWebEnabled,
      chat.error,
      chat.status,
      chat.stop,
      legacySend.error,
      legacySend.isPending,
      legacySend.status,
    ],
  );
}
