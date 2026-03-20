import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HominemUser } from '@hominem/auth/server'
import type { AppContext } from '../src/middleware/auth'
import { apiErrorHandler } from '../src/middleware/error'

const mockGetChatByIdQuery = vi.fn()
const mockGetChatMessages = vi.fn()
const mockAddMessages = vi.fn()
const mockStreamText = vi.fn()
const mockGenerateText = vi.fn()
const mockGetAvailableTools = vi.fn()
const mockGetOpenAIAdapter = vi.fn()

vi.mock('@hominem/chat-services', () => {
  class MessageService {
    addMessages = mockAddMessages
    getChatMessages = mockGetChatMessages
  }

  return {
    getChatByIdQuery: mockGetChatByIdQuery,
    getUserChatsQuery: vi.fn(),
    getChatByNoteIdQuery: vi.fn(),
    updateChatTitleQuery: vi.fn(),
    deleteChatQuery: vi.fn(),
    clearChatMessagesQuery: vi.fn(),
    createChatQuery: vi.fn(),
    MessageService,
  }
})

vi.mock('ai', () => ({
  convertToCoreMessages: vi.fn((messages: unknown) => messages),
  generateObject: vi.fn(),
  generateText: mockGenerateText,
  streamText: mockStreamText,
}))

vi.mock('../src/utils/ai-adapters', () => ({
  toCoreMessage: vi.fn(({ role, content }: { role: string; content: string }) => ({ role, content })),
  typeToolsForAI: vi.fn(() => ({})),
}))

vi.mock('../src/utils/llm', () => ({
  getOpenAIAdapter: mockGetOpenAIAdapter,
}))

vi.mock('../src/utils/tools', () => ({
  getAvailableTools: mockGetAvailableTools,
}))

const user: HominemUser = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  email: 'chat-user@hominem.test',
  isAdmin: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function createMessage(role: 'user' | 'assistant', content: string, id: string) {
  return {
    id,
    chatId: '11111111-1111-1111-1111-111111111111',
    userId: user.id,
    role,
    content,
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

async function createApp() {
  const { chatsRoutes } = await import('../src/routes/chats')

  return new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use('*', async (c, next) => {
      c.set('user', user)
      c.set('userId', user.id)
      await next()
    })
    .route('/chats', chatsRoutes)
}

describe('chat send routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetChatByIdQuery.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      userId: user.id,
      title: 'Test Chat',
      noteId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    mockGetChatMessages.mockResolvedValue([])
    mockGetAvailableTools.mockReturnValue([])
    mockGetOpenAIAdapter.mockReturnValue({ provider: 'test' })
    mockAddMessages.mockResolvedValue([
      createMessage('user', 'hello', '22222222-2222-2222-2222-222222222222'),
      createMessage('assistant', 'hello back', '33333333-3333-3333-3333-333333333333'),
    ])
    mockGenerateText.mockResolvedValue({
      text: 'hello back',
      toolCalls: [],
    })
    mockStreamText.mockImplementation((options?: {
      onFinish?: (event: {
        text: string
        toolCalls: Array<{ toolName: string; toolCallId: string; args: Record<string, unknown> }>
      }) => Promise<void> | void
    }) => ({
      textStream: (async function* () {
        yield 'hello back'
      })(),
      toolCalls: Promise.resolve([]),
      toDataStreamResponse: async () => {
        if (options?.onFinish) {
          await options.onFinish({
            text: 'hello back',
            toolCalls: [],
          })
        }

        return new Response('stream', { status: 200 })
      },
    }))
  })

  it('persists send results atomically after generation succeeds', async () => {
    const app = await createApp()

    const response = await app.request('/chats/11111111-1111-1111-1111-111111111111/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'hello',
      }),
    })

    expect(response.status).toBe(200)
    expect(mockAddMessages).toHaveBeenCalledTimes(1)
    expect(mockAddMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: user.id,
        role: 'user',
        content: 'hello',
      }),
      expect.objectContaining({
        userId: user.id,
        role: 'assistant',
        content: 'hello back',
      }),
    ])
  })

  it('persists a useful assistant error when provider setup fails', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('provider unavailable'))
    const app = await createApp()

    const response = await app.request('/chats/11111111-1111-1111-1111-111111111111/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'hello',
      }),
    })

    expect(response.status).toBe(200)
    expect(mockAddMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        role: 'user',
        content: 'hello',
      }),
      expect.objectContaining({
        role: 'assistant',
        content: '[Error: provider unavailable]',
      }),
    ])
  })

  it('persists a useful assistant error when generation fails before text is returned', async () => {
    mockGenerateText.mockRejectedValueOnce(
      new Error(
        'Failed after 3 attempts. Last error: You exceeded your current quota, please check your plan and billing details.',
      ),
    )
    const app = await createApp()

    const response = await app.request('/chats/11111111-1111-1111-1111-111111111111/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        message: 'hello',
      }),
    })

    expect(response.status).toBe(200)
    expect(mockAddMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        role: 'user',
        content: 'hello',
      }),
      expect.objectContaining({
        role: 'assistant',
        content: expect.stringContaining('You exceeded your current quota'),
      }),
    ])
  })

  it('persists ui/send messages on finish without placeholder assistant rows', async () => {
    const app = await createApp()

    const response = await app.request('/chats/11111111-1111-1111-1111-111111111111/ui/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            id: 'user-message',
            role: 'user',
            content: 'hello',
          },
        ],
      }),
    })

    expect(response.status).toBe(200)
    expect(mockAddMessages).toHaveBeenCalledTimes(1)
    expect(mockAddMessages).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: user.id,
        role: 'user',
        content: 'hello',
      }),
      expect.objectContaining({
        userId: user.id,
        role: 'assistant',
        content: 'hello back',
      }),
    ])
  })

  it('rejects ui/send for a stale chat id instead of creating a new chat', async () => {
    mockGetChatByIdQuery.mockResolvedValueOnce(null)
    const app = await createApp()

    const response = await app.request('/chats/11111111-1111-1111-1111-111111111111/ui/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            id: 'user-message',
            role: 'user',
            content: 'hello',
          },
        ],
      }),
    })

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: 'forbidden',
      code: 'FORBIDDEN',
      message: 'Chat not found or access denied',
      details: { reason: 'ownership' },
    })
    expect(mockAddMessages).not.toHaveBeenCalled()
  })
})
