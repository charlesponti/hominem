import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HominemUser } from '@hominem/auth/server'
import type { AppContext } from '../src/middleware/auth'
import { errorMiddleware } from '../src/middleware/error'

const mockGetChatByIdQuery = vi.fn()
const mockGetChatMessages = vi.fn()
const mockAddMessage = vi.fn()
const mockUpdateMessage = vi.fn()
const mockStreamText = vi.fn()
const mockGetAvailableTools = vi.fn()
const mockGetOpenAIAdapter = vi.fn()

vi.mock('@hominem/chat-services', () => {
  class MessageService {
    addMessage = mockAddMessage
    getChatMessages = mockGetChatMessages
    updateMessage = mockUpdateMessage
  }

  return {
    createChatQuery: vi.fn(),
    getChatByIdQuery: mockGetChatByIdQuery,
    getUserChatsQuery: vi.fn(),
    getChatByNoteIdQuery: vi.fn(),
    updateChatTitleQuery: vi.fn(),
    deleteChatQuery: vi.fn(),
    clearChatMessagesQuery: vi.fn(),
    MessageService,
  }
})

vi.mock('ai', () => ({
  convertToCoreMessages: vi.fn((messages: unknown) => messages),
  generateObject: vi.fn(),
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

async function createApp() {
  const { chatsRoutes } = await import('../src/routes/chats')

  return new Hono<AppContext>()
    .use('*', errorMiddleware)
    .use('*', async (c, next) => {
      c.set('user', user)
      c.set('userId', user.id)
      await next()
    })
    .route('/chats', chatsRoutes)
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
    mockUpdateMessage.mockResolvedValue(createMessage('assistant', 'hello back', '33333333-3333-3333-3333-333333333333'))
    mockAddMessage
      .mockResolvedValueOnce(createMessage('user', 'hello', '22222222-2222-2222-2222-222222222222'))
      .mockResolvedValueOnce(createMessage('assistant', '', '33333333-3333-3333-3333-333333333333'))

    mockStreamText.mockImplementation((options?: {
      onFinish?: (event: {
        text: string
        toolCalls: Array<{ toolName: string; toolCallId: string; args: Record<string, unknown> }>
      }) => Promise<void> | void
    }) => {
      return {
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
      }
    })
  })

  it('persists assistant messages with the authenticated user id for /send', async () => {
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
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: user.id,
        role: 'assistant',
      }),
    )
  })

  it('persists assistant messages with the authenticated user id for /ui/send', async () => {
    mockAddMessage.mockReset()
    mockAddMessage
      .mockResolvedValueOnce(createMessage('user', 'hello', '22222222-2222-2222-2222-222222222222'))
      .mockResolvedValueOnce(createMessage('assistant', '', '33333333-3333-3333-3333-333333333333'))

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
    expect(mockAddMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: user.id,
        role: 'assistant',
      }),
    )
  })
})
