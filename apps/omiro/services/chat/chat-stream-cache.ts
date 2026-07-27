import type { Chat } from '@hominem/rpc/types';
import type { QueryClient } from '@tanstack/react-query';

import { chatKeys } from '~/services/notes/query-keys';

import {
  createOptimisticMessage,
  createStreamingPlaceholder,
  type MessageOutput,
} from './chatMessages';

const CHAT_MESSAGES_LIMIT = 50;

function keepLatestMessages(messages: MessageOutput[]) {
  return messages.slice(-CHAT_MESSAGES_LIMIT);
}

export function seedStartedChat(
  queryClient: QueryClient,
  input: {
    chat: Chat;
    message: string;
    userMessageId: string;
    assistantMessageId: string;
  },
) {
  const { assistantMessageId, chat, message, userMessageId } = input;

  queryClient.setQueryData(chatKeys.activeChat(chat.id), chat);
  queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chat.id), (previous = []) =>
    keepLatestMessages([
      ...previous,
      createOptimisticMessage(chat.id, message, null, userMessageId),
      createStreamingPlaceholder(chat.id, assistantMessageId),
    ]),
  );
}

export function appendAssistantChunk(
  queryClient: QueryClient,
  input: {
    chatId: string;
    assistantMessageId: string;
    chunk: string;
  },
) {
  const { assistantMessageId, chatId, chunk } = input;

  queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (previousMessages) =>
    previousMessages?.map((message) =>
      message.id === assistantMessageId
        ? { ...message, message: message.message + chunk }
        : message,
    ),
  );
}

export function finishAssistantStream(
  queryClient: QueryClient,
  input: {
    chatId: string;
    assistantMessageId: string;
  },
) {
  const { assistantMessageId, chatId } = input;

  queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (previousMessages) =>
    previousMessages?.map((message) =>
      message.id === assistantMessageId ? { ...message, isStreaming: false } : message,
    ),
  );
}

export function failAssistantStream(
  queryClient: QueryClient,
  input: {
    chatId: string;
    assistantMessageId: string;
    errorMessage: string;
  },
) {
  const { assistantMessageId, chatId, errorMessage } = input;

  queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (previousMessages) =>
    previousMessages?.map((message) =>
      message.id === assistantMessageId
        ? {
            ...message,
            isStreaming: false,
            message:
              message.message.trim().length > 0
                ? message.message
                : `Something went wrong: ${errorMessage}`,
          }
        : message,
    ),
  );
}
