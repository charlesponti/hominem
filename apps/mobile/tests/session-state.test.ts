import { describe, expect, it } from 'vitest'

import { getChatActivityAt, isChatResumable, selectSherpaChat, toChatsWithActivity } from '../utils/services/chat/session-state'
import type { Chat, ChatMessage } from '../utils/local-store/types'

const baseChat: Chat = {
  id: 'chat-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  endedAt: null,
  title: 'Chat 1',
}

function message(chatId: string, createdAt: string): ChatMessage {
  return {
    id: `${chatId}-${createdAt}`,
    chatId,
    role: 'user',
    content: 'hello',
    createdAt,
  }
}

describe('session-state', () => {
  it('uses the last message timestamp as session activity', () => {
    expect(
      getChatActivityAt(baseChat, [
        message(baseChat.id, '2026-01-02T00:00:00.000Z'),
        message(baseChat.id, '2026-02-01T00:00:00.000Z'),
      ]),
    ).toBe('2026-02-01T00:00:00.000Z')
  })

  it('keeps recently active older chats resumable', () => {
    expect(
      isChatResumable(
        baseChat,
        [message(baseChat.id, '2026-03-01T00:00:00.000Z')],
        new Date('2026-03-10T00:00:00.000Z').getTime(),
      ),
    ).toBe(true)
  })

  it('sorts chats by latest activity rather than creation time', () => {
    const newerChat: Chat = {
      id: 'chat-2',
      createdAt: '2026-02-20T00:00:00.000Z',
      endedAt: null,
      title: 'Chat 2',
    }

    expect(
      toChatsWithActivity(
        [baseChat, newerChat],
        {
          'chat-1': [message('chat-1', '2026-03-09T00:00:00.000Z')],
          'chat-2': [message('chat-2', '2026-03-02T00:00:00.000Z')],
        },
        new Date('2026-03-10T00:00:00.000Z').getTime(),
      ).map((chat) => chat.id),
    ).toEqual(['chat-1', 'chat-2'])
  })

  it('prefers an explicit sherpa chat id over the first active chat', () => {
    const otherChat: Chat = {
      id: 'chat-2',
      createdAt: '2026-01-03T00:00:00.000Z',
      endedAt: null,
      title: 'Chat 2',
    }

    expect(selectSherpaChat([baseChat, otherChat], 'chat-2')?.id).toBe('chat-2')
    expect(selectSherpaChat([baseChat, otherChat])?.id).toBe('chat-1')
  })
})
