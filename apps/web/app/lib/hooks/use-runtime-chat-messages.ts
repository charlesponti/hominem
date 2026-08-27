import { runtimeMessageToChatMessage, type ChatMessageItem } from '@hominem/chat';
import type { ChatMessageDto } from '@hominem/rpc/types/chat.types';
import { useMemo } from 'react';

import type { ChatMessageView } from '../types/chat';
import type { ChatRuntime } from './use-chat-runtime';

function toViewMessage(message: ChatMessageItem): ChatMessageView {
  return {
    id: message.id,
    chatId: message.chat_id,
    userId: message.profile_id,
    role: message.role,
    content: message.message,
    files: null,
    toolCalls: message.toolCalls as ChatMessageDto['toolCalls'],
    reasoning: message.reasoning ?? null,
    parentMessageId: null,
    createdAt: message.created_at,
    updatedAt: message.created_at,
    isStreaming: message.isStreaming,
  };
}

export function useRuntimeChatMessages({
  chatId,
  runtime,
  productMessages,
}: {
  chatId: string;
  runtime: ChatRuntime;
  productMessages: ChatMessageView[];
}) {
  return useMemo(() => {
    const runtimeMessages = runtime.messages.flatMap((message) => {
      const converted = runtimeMessageToChatMessage(message, chatId);
      return converted ? [toViewMessage(converted)] : [];
    });
    return runtimeMessages.length > 0 ? runtimeMessages : productMessages;
  }, [chatId, productMessages, runtime.messages]);
}
