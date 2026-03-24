import type { Chat } from '@hominem/rpc/types'
import { describe, expect, it } from 'vitest'

import {
  getArchivedChatsWithActivity,
  getChatActivityAt,
  getInboxChatsWithActivity,
  isChatResumable,
  selectChatSession,
  toChatsWithActivity,
} from '../utils/services/chat/session-state'

const baseChat: Chat = {
  id: 'chat-1',
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  title: 'Chat 1',
}

describe('session-state', () => {
  it('uses the chat updated timestamp as session activity', () => {
    expect(getChatActivityAt(baseChat)).toBe('2026-01-01T00:00:00.000Z')
  })

  it('keeps recently active older chats resumable', () => {
    expect(
      isChatResumable(
        {
          ...baseChat,
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        new Date('2026-03-10T00:00:00.000Z').getTime(),
      ),
    ).toBe(true)
  })

  it('sorts chats by latest server activity rather than creation time', () => {
    const newerChat: Chat = {
      id: 'chat-2',
      archivedAt: null,
      createdAt: '2026-02-20T00:00:00.000Z',
      updatedAt: '2026-03-02T00:00:00.000Z',
      title: 'Chat 2',
    }

    expect(
      toChatsWithActivity(
        [
          {
            ...baseChat,
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
          newerChat,
        ],
        new Date('2026-03-10T00:00:00.000Z').getTime(),
      ).map((chat) => chat.id),
    ).toEqual(['chat-1', 'chat-2'])
  })

  it('prefers an explicit chat id over the first active chat', () => {
    const otherChat: Chat = {
      id: 'chat-2',
      archivedAt: null,
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      title: 'Chat 2',
    }

    expect(selectChatSession([baseChat, otherChat], 'chat-2')?.id).toBe('chat-2')
    expect(selectChatSession([baseChat, otherChat])?.id).toBe('chat-1')
  })

  it('skips archived chats when selecting the default active chat', () => {
    const archivedChat: Chat = {
      ...baseChat,
      id: 'chat-archived',
      archivedAt: '2026-03-19T00:00:00.000Z',
      updatedAt: '2026-03-19T00:00:00.000Z',
    }

    const activeChat: Chat = {
      ...baseChat,
      id: 'chat-active',
      archivedAt: null,
      updatedAt: '2026-03-18T00:00:00.000Z',
    }

    expect(selectChatSession([archivedChat, activeChat])?.id).toBe('chat-active')
    expect(selectChatSession([archivedChat], 'chat-archived')?.id).toBe('chat-archived')
  })

  it('only returns active chats for inbox session lists', () => {
    const chats = getInboxChatsWithActivity([
      {
        ...baseChat,
        id: 'chat-archived',
        archivedAt: '2026-03-19T00:00:00.000Z',
        updatedAt: '2026-03-19T00:00:00.000Z',
      },
      {
        ...baseChat,
        id: 'chat-active',
        archivedAt: null,
        updatedAt: '2026-03-18T00:00:00.000Z',
      },
    ])

    expect(chats.map((chat) => chat.id)).toEqual(['chat-active'])
  })

  it('only returns archived chats for archive history lists', () => {
    const chats = getArchivedChatsWithActivity([
      {
        ...baseChat,
        id: 'chat-archived',
        archivedAt: '2026-03-19T00:00:00.000Z',
        updatedAt: '2026-03-19T00:00:00.000Z',
      },
      {
        ...baseChat,
        id: 'chat-active',
        archivedAt: null,
        updatedAt: '2026-03-18T00:00:00.000Z',
      },
    ])

    expect(chats.map((chat) => chat.id)).toEqual(['chat-archived'])
  })
})
