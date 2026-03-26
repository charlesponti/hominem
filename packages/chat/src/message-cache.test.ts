import { describe, expect, it } from 'vitest';

import {
  createOptimisticMessage,
  getChatRetryDelayMs,
  reconcileMessagesAfterSend,
  type ChatMessageItem,
} from './message-cache';

describe('message-cache', () => {
  it('creates optimistic user messages', () => {
    const message = createOptimisticMessage('chat-1', 'Hello');

    expect(message.chat_id).toBe('chat-1');
    expect(message.message).toBe('Hello');
    expect(message.role).toBe('user');
    expect(message.toolCalls).toBeNull();
  });

  it('reconciles optimistic messages with server messages', () => {
    const optimistic = createOptimisticMessage('chat-1', 'Hello', 'optimistic-1');
    const previous: ChatMessageItem[] = [optimistic];
    const serverMessages: ChatMessageItem[] = [
      {
        ...optimistic,
        id: 'server-user-1',
      },
      {
        id: 'server-assistant-1',
        role: 'assistant',
        message: 'Hi there',
        created_at: '2026-01-01T00:00:01.000Z',
        chat_id: 'chat-1',
        profile_id: '',
        focus_ids: null,
        focus_items: null,
        reasoning: null,
        toolCalls: null,
        isStreaming: false,
      },
    ];

    expect(reconcileMessagesAfterSend(previous, serverMessages)).toEqual(serverMessages);
  });

  it('uses a bounded retry delay', () => {
    expect(getChatRetryDelayMs(0)).toBe(1000);
    expect(getChatRetryDelayMs(1)).toBe(2000);
    expect(getChatRetryDelayMs(4)).toBe(10000);
  });
});
