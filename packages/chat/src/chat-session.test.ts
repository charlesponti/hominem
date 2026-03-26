import { describe, expect, it } from 'vitest';

import {
  getArchivedChatsWithActivity,
  getChatActivityAt,
  getInboxChatsWithActivity,
  isChatResumable,
  selectChatSession,
  toChatsWithActivity,
  type ChatSessionLike,
} from './chat-session';

interface TestChat extends ChatSessionLike {
  title: string;
}

const baseChat: TestChat = {
  id: 'chat-1',
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  title: 'Chat 1',
};

describe('chat-session', () => {
  it('uses updatedAt as activity when present', () => {
    expect(getChatActivityAt(baseChat)).toBe('2026-01-01T00:00:00.000Z');
  });

  it('keeps recently active chats resumable', () => {
    expect(
      isChatResumable(
        {
          ...baseChat,
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        new Date('2026-03-10T00:00:00.000Z').getTime(),
      ),
    ).toBe(true);
  });

  it('sorts chats by latest activity', () => {
    expect(
      toChatsWithActivity(
        [
          {
            ...baseChat,
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
          {
            ...baseChat,
            id: 'chat-2',
            createdAt: '2026-02-20T00:00:00.000Z',
            updatedAt: '2026-03-02T00:00:00.000Z',
            title: 'Chat 2',
          },
        ],
        new Date('2026-03-10T00:00:00.000Z').getTime(),
      ).map((chat) => chat.id),
    ).toEqual(['chat-1', 'chat-2']);
  });

  it('selects explicit chat ids before the default active chat', () => {
    const otherChat: TestChat = {
      ...baseChat,
      id: 'chat-2',
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      title: 'Chat 2',
    };

    expect(selectChatSession([baseChat, otherChat], 'chat-2')?.id).toBe('chat-2');
    expect(selectChatSession([baseChat, otherChat])?.id).toBe('chat-1');
  });

  it('filters inbox and archived chat lists', () => {
    const archivedChat: TestChat = {
      ...baseChat,
      id: 'chat-archived',
      archivedAt: '2026-03-19T00:00:00.000Z',
      updatedAt: '2026-03-19T00:00:00.000Z',
    };
    const activeChat: TestChat = {
      ...baseChat,
      id: 'chat-active',
      archivedAt: null,
      updatedAt: '2026-03-18T00:00:00.000Z',
    };

    expect(getInboxChatsWithActivity([archivedChat, activeChat]).map((chat) => chat.id)).toEqual([
      'chat-active',
    ]);
    expect(getArchivedChatsWithActivity([archivedChat, activeChat]).map((chat) => chat.id)).toEqual(
      ['chat-archived'],
    );
  });
});
