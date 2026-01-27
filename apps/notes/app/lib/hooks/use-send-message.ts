import type { HonoClient } from '@hominem/hono-client';
import type {
  ChatsSendInput,
  ChatsSendOutput,
  ChatMessage,
  ChatsGetMessagesOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';
import { useRef } from 'react';

import type { ExtendedMessage } from '../types/chat-message';

export function useSendMessage({ chatId, userId }: { chatId: string; userId?: string }) {
  const utils = useHonoUtils();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamIdRef = useRef<string | null>(null);
  const chatIdRef = useRef<string>(chatId);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const markStreamingComplete = (currentChatId: string, messageId: string) => {
    const key = ['chats', 'getMessages', { chatId: currentChatId, limit: 50 }];
    const oldData = utils.getData<ChatsGetMessagesOutput>(key);
    if (!oldData || !oldData.success) return;

    utils.setData<ChatsGetMessagesOutput>(key, {
      ...oldData,
      data: oldData.data.map((msg) =>
        msg.id === messageId ? { ...msg, isStreaming: false } : msg,
      ),
    });
  };

  const pollForUpdates = (currentChatId: string, _messageId: string) => {
    if (!pollingIntervalRef.current) return;

    utils.invalidate(['chats', 'getMessages', { chatId: currentChatId, limit: 50 }]);
  };

  type SendMessageContext = { optimisticUserMessage: ExtendedMessage; currentChatId: string };

  return useHonoMutation<ChatsSendOutput, ChatsSendInput>(
    async (client: HonoClient, variables: ChatsSendInput) => {
      const currentChatId = variables.chatId || chatId;
      const res = await client.api.chats[':id'].send.$post({
        param: { id: currentChatId },
        json: { message: variables.message },
      });
      return res.json() as Promise<ChatsSendOutput>;
    },
    {
      onMutate: async (variables: ChatsSendInput): Promise<SendMessageContext | undefined> => {
        const currentChatId = variables.chatId || chatId;
        chatIdRef.current = currentChatId;

        const optimisticUserMessage: ExtendedMessage = {
          id: `temp-${Date.now()}`,
          chatId: currentChatId,
          userId: userId || '',
          role: 'user',
          content: variables.message,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          toolCalls: null,
          reasoning: null,
          files: null,
          parentMessageId: null,
          messageIndex: null,
        };

        return {
          optimisticUserMessage,
          currentChatId,
        };
      },
      onSuccess: (result, variables, onMutateResult: unknown) => {
        if (!result.success) return;

        const context = onMutateResult as SendMessageContext | undefined;
        const data = result.data;
        const currentChatId = context?.currentChatId || variables.chatId || chatId;
        chatIdRef.current = currentChatId;
        const streamId = data.streamId;
        streamIdRef.current = streamId;

        // Invalidate list to get new messages
        utils.invalidate(['chats', 'getMessages', { chatId: currentChatId, limit: 50 }]);

        // Start polling if streamId exists
        if (streamId) {
          pollingIntervalRef.current = setInterval(
            () => pollForUpdates(currentChatId, streamId),
            200,
          );
        }
      },
      onError: () => {
        stopPolling();
      },
    },
  );
}
