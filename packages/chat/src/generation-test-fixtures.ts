import type { ChatMessageSnapshot, ChatSnapshot } from './generation-schemas';

export function chatSnapshot(overrides: Partial<ChatSnapshot> = {}): ChatSnapshot {
  return {
    id: 'chat-1',
    userId: 'user-1',
    title: 'Chat',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function messageSnapshot(
  overrides: Partial<ChatMessageSnapshot> & Pick<ChatMessageSnapshot, 'id' | 'chatId' | 'content'>,
): ChatMessageSnapshot {
  return {
    ...overrides,
    userId: 'user-1',
    role: 'assistant',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}
