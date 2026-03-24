import { useChat } from '@ai-sdk/react';
import { useRpcMutation } from '@hominem/rpc/react';
import type { ChatMessage, ChatsSendInput, ChatsSendOutput, ChatsGetMessagesOutput } from '@hominem/rpc/types/chat.types';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { chatQueryKeys } from '~/lib/query-keys';

import { useFeatureFlag } from './use-feature-flags';

type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

function legacyStatusToChat(mutationStatus: string): ChatStatus {
  if (mutationStatus === 'pending') return 'submitted';
  if (mutationStatus === 'error') return 'error';
  return 'idle';
}

export function useSendMessage({ chatId }: { chatId: string; userId?: string }) {
  const queryClient = useQueryClient();
  const aiSdkChatWebEnabled = useFeatureFlag('aiSdkChatWeb');
  const apiBase = import.meta.env.VITE_PUBLIC_API_URL as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chat = useChat({
    id: `chat-${chatId}`,
    api: `${apiBase}/api/chats/${chatId}/ui/send`,
    streamProtocol: 'data',
    credentials: 'include',
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
    },
  } as any);

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
        queryClient.setQueryData<ChatsGetMessagesOutput>(
          chatQueryKeys.messages(chatId),
          (prev) => [...(prev ?? []), optimistic],
        );
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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('You are offline. Please check your connection and try again.');
    }

    if (!aiSdkChatWebEnabled) {
      await legacySend.mutateAsync(variables);
      return { ok: true };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (chat as any).append({
      role: 'user',
      content: variables.message,
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
        ? (chat.status as ChatStatus)
        : legacyStatusToChat(legacySend.status)) satisfies ChatStatus,
      stop: chat.stop,
      error: (aiSdkChatWebEnabled ? chat.error : legacySend.error) as Error | null,
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
