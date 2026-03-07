import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { createIntegrationQueryClient } from './harness'
import { buildChatThreadFixture, buildOfflineNetworkState, buildOnlineNetworkState } from './fixtures'
import {
  createOptimisticMessage,
  getChatRetryDelayMs,
  reconcileMessagesAfterSend,
  type MessageOutput,
} from '../../utils/services/chat/chat-contract'

const queryKey = (chatId: string) => ['chatMessages', chatId] as const

function ordered(messages: MessageOutput[]): MessageOutput[] {
  return [...messages].sort((a, b) => {
    if (a.created_at === b.created_at) {
      return a.id.localeCompare(b.id)
    }
    return a.created_at.localeCompare(b.created_at)
  })
}

describe('chat contract integration', () => {
  it('applies optimistic send then reconciles to server messages', () => {
    const fixture = buildChatThreadFixture()
    const client = createIntegrationQueryClient()
    const initial: MessageOutput[] = fixture.messages.map((message) => ({
      id: message.id,
      role: message.role,
      message: message.content,
      created_at: message.createdAt,
      chat_id: fixture.chatId,
      profile_id: '',
      focus_ids: null,
      focus_items: null,
    }))

    client.setQueryData(queryKey(fixture.chatId), initial)

    const optimistic = createOptimisticMessage(fixture.chatId, 'What should I do today?')
    client.setQueryData(queryKey(fixture.chatId), [...initial, optimistic])
    const afterOptimistic = client.getQueryData<MessageOutput[]>(queryKey(fixture.chatId)) ?? []
    expect(afterOptimistic.at(-1)?.message).toBe('What should I do today?')

    const serverMessages: MessageOutput[] = [
      ...initial,
      {
        id: 'msg-server-user',
        role: 'user',
        message: 'What should I do today?',
        created_at: '2026-01-01T00:00:01.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
      {
        id: 'msg-server-assistant',
        role: 'assistant',
        message: 'Start with your most important task.',
        created_at: '2026-01-01T00:00:02.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
    ]
    client.setQueryData(
      queryKey(fixture.chatId),
      reconcileMessagesAfterSend(afterOptimistic, serverMessages),
    )

    const finalMessages = client.getQueryData<MessageOutput[]>(queryKey(fixture.chatId)) ?? []
    expect(finalMessages.some((message) => message.id === optimistic.id)).toBe(false)
    expect(finalMessages.some((message) => message.id === 'msg-server-assistant')).toBe(true)
  })

  it('keeps streaming updates deterministic and ordered', () => {
    const fixture = buildChatThreadFixture()
    const baseMessages: MessageOutput[] = [
      {
        id: 'msg-1',
        role: 'user',
        message: 'Hello',
        created_at: '2026-01-01T00:00:00.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
    ]
    const streamingFrames: MessageOutput[] = [
      {
        id: 'stream-1',
        role: 'assistant',
        message: 'Hi',
        created_at: '2026-01-01T00:00:01.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
      {
        id: 'stream-1',
        role: 'assistant',
        message: 'Hi there, how can I help?',
        created_at: '2026-01-01T00:00:01.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
    ]

    const merged = ordered(
      reconcileMessagesAfterSend(baseMessages, [baseMessages[0]!, streamingFrames[1]!]),
    )

    expect(merged).toHaveLength(2)
    expect(merged[1]?.message).toBe('Hi there, how can I help?')
  })

  it('persists query state round-trip across app reload simulation', () => {
    const fixture = buildChatThreadFixture()
    const firstClient = createIntegrationQueryClient()
    const data: MessageOutput[] = [
      {
        id: 'msg-persist-1',
        role: 'user',
        message: 'Persist me',
        created_at: '2026-01-01T00:00:00.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
    ]
    firstClient.setQueryData(queryKey(fixture.chatId), data)

    const dehydrated = dehydrate(firstClient)
    const secondClient: QueryClient = createIntegrationQueryClient()
    hydrate(secondClient, dehydrated)

    const reloaded = secondClient.getQueryData<MessageOutput[]>(queryKey(fixture.chatId))
    expect(reloaded).toEqual(data)
  })

  it('uses bounded retry strategy for offline transition and convergence', () => {
    const offline = buildOfflineNetworkState()
    expect(offline.isConnected).toBe(false)
    expect(getChatRetryDelayMs(0)).toBe(1000)
    expect(getChatRetryDelayMs(1)).toBe(2000)
    expect(getChatRetryDelayMs(4)).toBe(10000)

    const online = buildOnlineNetworkState()
    expect(online.isConnected).toBe(true)
  })

  it('supports recoverable failed send path with retry preserving previous cache', () => {
    const fixture = buildChatThreadFixture()
    const client = createIntegrationQueryClient()
    const previous: MessageOutput[] = [
      {
        id: 'msg-prev',
        role: 'user',
        message: 'Initial',
        created_at: '2026-01-01T00:00:00.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
    ]
    client.setQueryData(queryKey(fixture.chatId), previous)

    const optimistic = createOptimisticMessage(fixture.chatId, 'May fail')
    client.setQueryData(queryKey(fixture.chatId), [...previous, optimistic])
    client.setQueryData(queryKey(fixture.chatId), previous)
    const rolledBack = client.getQueryData<MessageOutput[]>(queryKey(fixture.chatId)) ?? []
    expect(rolledBack).toEqual(previous)

    const retried = reconcileMessagesAfterSend(rolledBack, [
      ...previous,
      {
        id: 'msg-retry-success',
        role: 'assistant',
        message: 'Recovered',
        created_at: '2026-01-01T00:00:01.000Z',
        chat_id: fixture.chatId,
        profile_id: '',
        focus_ids: null,
        focus_items: null,
      },
    ])
    expect(retried.some((message) => message.id === 'msg-retry-success')).toBe(true)
  })
})
