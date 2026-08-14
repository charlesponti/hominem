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

export function reconcileBackgroundedAssistantStream(
  queryClient: QueryClient,
  input: {
    chatId: string;
    assistantMessageId: string;
    message: string;
    localMessages: MessageOutput[];
  },
) {
  const { assistantMessageId, chatId, localMessages, message } = input;
  const serverMessages = queryClient.getQueryData<MessageOutput[]>(chatKeys.messages(chatId)) ?? [];
  const userIndex = serverMessages.findLastIndex(
    (item) => item.role === 'user' && item.message === message,
  );
  const hasServerReply =
    userIndex >= 0 && serverMessages.slice(userIndex + 1).some((item) => item.role === 'assistant');

  if (hasServerReply) {
    queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (current = []) =>
      current.filter((item) => item.id !== assistantMessageId),
    );
    return 'completed' as const;
  }

  const localUser = localMessages.find((item) => item.role === 'user' && item.message === message);
  const localAssistant = localMessages.find((item) => item.id === assistantMessageId);

  queryClient.setQueryData<MessageOutput[]>(chatKeys.messages(chatId), (current = []) => {
    const next = [...current];
    if (
      localUser &&
      !next.some(
        (item) => item.id === localUser.id || (item.role === 'user' && item.message === message),
      )
    ) {
      next.push(localUser);
    }
    if (localAssistant && !next.some((item) => item.id === assistantMessageId)) {
      next.push(localAssistant);
    }
    return next;
  });
  failAssistantStream(queryClient, {
    chatId,
    assistantMessageId,
    errorMessage: 'stream interrupted while the app was in the background',
  });
  return 'interrupted' as const;
}
