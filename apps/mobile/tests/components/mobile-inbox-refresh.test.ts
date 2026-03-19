import { describe, expect, it } from 'vitest'

import {
  createChatInboxRefreshSnapshot,
  INBOX_REFRESH_QUERY_KEYS,
  upsertInboxSessionActivity,
} from '../../utils/services/inbox/inbox-refresh'

describe('mobile inbox refresh', () => {
  it('moves the touched chat session to the top of the inbox sessions cache', () => {
    const nextSessions = upsertInboxSessionActivity(
      [
        {
          archivedAt: null,
          id: 'chat-older',
          noteId: null,
          title: 'Older chat',
          createdAt: '2026-03-18T10:00:00.000Z',
          updatedAt: '2026-03-18T10:00:00.000Z',
          userId: 'user-1',
          activityAt: '2026-03-18T10:00:00.000Z',
        },
        {
          archivedAt: null,
          id: 'chat-newer',
          noteId: null,
          title: 'Newer chat',
          createdAt: '2026-03-18T11:00:00.000Z',
          updatedAt: '2026-03-18T11:00:00.000Z',
          userId: 'user-1',
          activityAt: '2026-03-18T11:00:00.000Z',
        },
      ],
      createChatInboxRefreshSnapshot({
        chatId: 'chat-older',
        noteId: null,
        title: 'Older chat',
        timestamp: '2026-03-18T12:00:00.000Z',
        userId: 'user-1',
      }),
    )

    expect(nextSessions.map((session) => session.id)).toEqual(['chat-older', 'chat-newer'])
    expect(nextSessions[0]?.activityAt).toBe('2026-03-18T12:00:00.000Z')
  })

  it('creates a new resumable session entry when the chat is not cached yet', () => {
    const nextSessions = upsertInboxSessionActivity(
      [],
      createChatInboxRefreshSnapshot({
        chatId: 'chat-new',
        noteId: null,
        title: 'Fresh chat',
        timestamp: '2026-03-18T12:00:00.000Z',
        userId: 'user-1',
      }),
    )

    expect(nextSessions).toEqual([
      {
        archivedAt: null,
        id: 'chat-new',
        noteId: null,
        title: 'Fresh chat',
        createdAt: '2026-03-18T12:00:00.000Z',
        updatedAt: '2026-03-18T12:00:00.000Z',
        userId: 'user-1',
        activityAt: '2026-03-18T12:00:00.000Z',
      },
    ])
  })

  it('declares the shared inbox query keys that must refresh together', () => {
    expect(INBOX_REFRESH_QUERY_KEYS).toEqual([['focusItems'], ['resumableSessions']])
  })
})
