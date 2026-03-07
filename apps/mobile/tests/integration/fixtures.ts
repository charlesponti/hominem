import type { UserProfile } from '../../utils/auth/types'

export interface ChatThreadFixture {
  chatId: string
  userId: string
  title: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: string
  }>
}

export interface NetworkStateFixture {
  isConnected: boolean
  isInternetReachable: boolean
}

export function buildAuthUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    email: 'mobile-test@hominem.test',
    name: 'Mobile Test User',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function buildChatThreadFixture(overrides: Partial<ChatThreadFixture> = {}): ChatThreadFixture {
  return {
    chatId: 'chat-1',
    userId: 'user-1',
    title: 'Integration chat',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    ...overrides,
  }
}

export function buildOfflineNetworkState(overrides: Partial<NetworkStateFixture> = {}): NetworkStateFixture {
  return {
    isConnected: false,
    isInternetReachable: false,
    ...overrides,
  }
}

export function buildOnlineNetworkState(overrides: Partial<NetworkStateFixture> = {}): NetworkStateFixture {
  return {
    isConnected: true,
    isInternetReachable: true,
    ...overrides,
  }
}
