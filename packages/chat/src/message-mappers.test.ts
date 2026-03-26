import { describe, expect, it } from 'vitest';

import { toChatMessageItem } from './message-mappers';

describe('message-mappers', () => {
  it('maps server chat messages to rendered chat items', () => {
    expect(
      toChatMessageItem({
        id: 'msg-1',
        role: 'assistant',
        content: 'Hello',
        createdAt: '2026-01-01T00:00:00.000Z',
        chatId: 'chat-1',
        reasoning: 'Thinking',
        toolCalls: null,
      }),
    ).toEqual({
      id: 'msg-1',
      role: 'assistant',
      message: 'Hello',
      created_at: '2026-01-01T00:00:00.000Z',
      chat_id: 'chat-1',
      profile_id: '',
      focus_ids: null,
      focus_items: null,
      reasoning: 'Thinking',
      toolCalls: null,
      isStreaming: false,
    });
  });

  it('ignores tool-only messages', () => {
    expect(
      toChatMessageItem({
        id: 'tool-1',
        role: 'tool',
        content: 'ignored',
        createdAt: '2026-01-01T00:00:00.000Z',
        chatId: 'chat-1',
      }),
    ).toBeNull();
  });
});
