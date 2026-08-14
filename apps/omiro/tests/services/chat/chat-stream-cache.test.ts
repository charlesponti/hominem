import type { Chat } from '@hominem/rpc/types';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  appendAssistantChunk,
  failAssistantStream,
  finishAssistantStream,
  reconcileBackgroundedAssistantStream,
  seedStartedChat,
} from '~/services/chat/chat-stream-cache';
import type { MessageOutput } from '~/services/chat/chatMessages';
import { chatKeys } from '~/services/notes/query-keys';

import { mockMmkvModule } from '../../mocks/mmkv';

vi.mock('~/services/storage/mmkv', () => mockMmkvModule());

describe('chat stream cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  it('seeds the new chat and its first two timeline messages before navigation', () => {
    const chat: Chat = {
      archivedAt: null,
      createdAt: '2026-07-01T08:00:00.000Z',
      id: 'chat-1',
      noteId: null,
      title: 'First chat',
      updatedAt: '2026-07-01T08:00:00.000Z',
      userId: 'user-1',
    };

    seedStartedChat(queryClient, {
      chat,
      message: 'Hello world',
      userMessageId: 'user-message-1',
      assistantMessageId: 'assistant-message-1',
    });

    expect(queryClient.getQueryData(chatKeys.activeChat(chat.id))).toEqual(chat);
    expect(queryClient.getQueryData(chatKeys.messages(chat.id))).toEqual([
      expect.objectContaining({
        id: 'user-message-1',
        role: 'user',
        message: 'Hello world',
      }),
      expect.objectContaining({
        id: 'assistant-message-1',
        role: 'assistant',
        message: '',
        isStreaming: true,
      }),
    ]);
  });

  it('appends chunks and finalizes the assistant placeholder', () => {
    const chat: Chat = {
      archivedAt: null,
      createdAt: '2026-07-01T08:00:00.000Z',
      id: 'chat-1',
      noteId: null,
      title: 'First chat',
      updatedAt: '2026-07-01T08:00:00.000Z',
      userId: 'user-1',
    };

    seedStartedChat(queryClient, {
      chat,
      message: 'Hello world',
      userMessageId: 'user-message-1',
      assistantMessageId: 'assistant-message-1',
    });

    appendAssistantChunk(queryClient, {
      chatId: chat.id,
      assistantMessageId: 'assistant-message-1',
      chunk: 'Hello',
    });
    appendAssistantChunk(queryClient, {
      chatId: chat.id,
      assistantMessageId: 'assistant-message-1',
      chunk: ' there',
    });
    finishAssistantStream(queryClient, {
      chatId: chat.id,
      assistantMessageId: 'assistant-message-1',
    });

    expect(queryClient.getQueryData(chatKeys.messages(chat.id))).toEqual([
      expect.objectContaining({ id: 'user-message-1', role: 'user' }),
      expect.objectContaining({
        id: 'assistant-message-1',
        role: 'assistant',
        message: 'Hello there',
        isStreaming: false,
      }),
    ]);
  });

  it('keeps the user message visible if the assistant stream fails after ready', () => {
    const chat: Chat = {
      archivedAt: null,
      createdAt: '2026-07-01T08:00:00.000Z',
      id: 'chat-1',
      noteId: null,
      title: 'First chat',
      updatedAt: '2026-07-01T08:00:00.000Z',
      userId: 'user-1',
    };

    seedStartedChat(queryClient, {
      chat,
      message: 'Hello world',
      userMessageId: 'user-message-1',
      assistantMessageId: 'assistant-message-1',
    });

    failAssistantStream(queryClient, {
      chatId: chat.id,
      assistantMessageId: 'assistant-message-1',
      errorMessage: 'stream interrupted',
    });

    expect(queryClient.getQueryData(chatKeys.messages(chat.id))).toEqual([
      expect.objectContaining({ id: 'user-message-1', role: 'user', message: 'Hello world' }),
      expect.objectContaining({
        id: 'assistant-message-1',
        role: 'assistant',
        isStreaming: false,
        message: 'Something went wrong: stream interrupted',
      }),
    ]);
  });

  it('keeps only the latest fifty messages for a chat', () => {
    const chat: Chat = {
      archivedAt: null,
      createdAt: '2026-07-01T08:00:00.000Z',
      id: 'chat-1',
      noteId: null,
      title: 'First chat',
      updatedAt: '2026-07-01T08:00:00.000Z',
      userId: 'user-1',
    };
    queryClient.setQueryData(
      chatKeys.messages(chat.id),
      Array.from({ length: 49 }, (_, index) => ({
        id: `old-${index}`,
        isStreaming: false,
        message: String(index),
        role: 'user' as const,
      })),
    );

    seedStartedChat(queryClient, {
      chat,
      message: 'Newest user message',
      userMessageId: 'user-message-1',
      assistantMessageId: 'assistant-message-1',
    });

    const messages = queryClient.getQueryData<Array<{ id: string }>>(chatKeys.messages(chat.id));
    expect(messages).toHaveLength(50);
    expect(messages?.[0]?.id).toBe('old-1');
    expect(messages?.at(-1)?.id).toBe('assistant-message-1');
  });

  it('uses the server reply when a backgrounded stream completed', () => {
    queryClient.setQueryData(chatKeys.messages('chat-1'), [
      {
        id: 'user-server',
        role: 'user',
        message: 'Hello world',
      },
      {
        id: 'assistant-server',
        role: 'assistant',
        message: 'Hello from the server',
      },
    ]);

    expect(
      reconcileBackgroundedAssistantStream(queryClient, {
        chatId: 'chat-1',
        assistantMessageId: 'assistant-local',
        message: 'Hello world',
        localMessages: [],
      }),
    ).toBe('completed');
    expect(queryClient.getQueryData(chatKeys.messages('chat-1'))).toEqual([
      expect.objectContaining({ id: 'user-server' }),
      expect.objectContaining({ id: 'assistant-server' }),
    ]);
  });

  it('marks the local placeholder interrupted when the server has no reply', () => {
    const localMessages = [
      {
        id: 'user-local',
        role: 'user' as const,
        message: 'Hello world',
      },
      {
        id: 'assistant-local',
        role: 'assistant' as const,
        message: 'Partial reply',
        isStreaming: true,
      },
    ] as MessageOutput[];
    queryClient.setQueryData(chatKeys.messages('chat-1'), [
      {
        id: 'user-server',
        role: 'user',
        message: 'Hello world',
      },
    ]);

    expect(
      reconcileBackgroundedAssistantStream(queryClient, {
        chatId: 'chat-1',
        assistantMessageId: 'assistant-local',
        message: 'Hello world',
        localMessages,
      }),
    ).toBe('interrupted');
    expect(queryClient.getQueryData(chatKeys.messages('chat-1'))).toEqual([
      expect.objectContaining({ id: 'user-server' }),
      expect.objectContaining({
        id: 'assistant-local',
        isStreaming: false,
        message: 'Partial reply',
      }),
    ]);
  });
});
