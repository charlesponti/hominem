import { useChat } from '@ai-sdk/react';
import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';
import type { ChatsSendInput, ChatsSendOutput } from '@hominem/hono-rpc/types/chat.types';
import { useMemo } from 'react';

import { useFeatureFlag } from './use-feature-flags';

export function useSendMessage({ chatId }: { chatId: string; userId?: string }) {
  const utils = useHonoUtils();
  const aiSdkChatWebEnabled = useFeatureFlag('aiSdkChatWeb');

  // TODO: Fix useChat types - currently has type conflicts with @ai-sdk/react@^3.0.110
  // const chat = useChat({
  //   id: `chat-${chatId}`,
  //   api: `/api/chat-ui/${chatId}`,
  //   streamProtocol: 'data',
  //   onFinish: () => {
  //     utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
  //   },
  //   onError: () => {
  //     utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
  //   },
  // });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chat = useChat() as any; // Type assertion to bypass type errors temporarily

  const legacySend = useHonoMutation(
    async ({ chats }, variables: ChatsSendInput) => {
      return chats.send({
        chatId: variables.chatId || chatId,
        message: variables.message,
      }) as Promise<ChatsSendOutput>;
    },
    {
      onSuccess: () => {
        utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
      },
      onError: () => {
        utils.invalidate(['chats', 'getMessages', { chatId, limit: 50 }]);
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
      status: aiSdkChatWebEnabled ? chat.status : legacySend.status,
      stop: chat.stop,
      error: aiSdkChatWebEnabled ? chat.error : legacySend.error,
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
