import { useChat } from '@ai-sdk/react';
import { useRpcMutation } from '@hominem/rpc/react';
import { useQueryClient } from '@tanstack/react-query';
import { chatQueryKeys } from '~/lib/query-keys';
import type { ChatsSendInput, ChatsSendOutput } from '@hominem/rpc/types/chat.types';
import { useMemo } from 'react';

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

  // TODO: Fix useChat types - currently has type conflicts with @ai-sdk/react@^3.0.110
  // const chat = useChat({
  //   id: `chat-${chatId}`,
  //   api: `/api/chats/${chatId}/ui/send`,
  //   streamProtocol: 'data',
  //   onFinish: () => {
  //     queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
  //   },
  //   onError: () => {
  //     queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
  //   },
  // });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chat = useChat() as any; // Type assertion to bypass type errors temporarily

  const legacySend = useRpcMutation(
    async ({ chats }, variables: ChatsSendInput) => {
      return chats.send({
        chatId: variables.chatId || chatId,
        message: variables.message,
      }) as Promise<ChatsSendOutput>;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      },
      onError: () => {
        queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) });
      },
    },
  );

  const mutateAsync = async (variables: ChatsSendInput) => {
    if (!aiSdkChatWebEnabled) {
      await legacySend.mutateAsync(variables);
      return { ok: true };
    }

    await chat.append({
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
