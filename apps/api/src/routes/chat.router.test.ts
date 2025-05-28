import type { ChatMessageSelect } from '@hominem/utils/types'
import { describe, expect, test, vi } from 'vitest'
import {
  assertErrorResponse,
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '../../test/api-test-utils.js'

// Type definitions for test responses
interface ChatHistoryResponse {
  chatId: string
  messages: ChatMessageSelect[]
  hasMore: boolean
}

// Create mock instances for reuse
const mockChatService = {
  getOrCreateActiveChat: vi.fn(),
  getChatById: vi.fn(),
  getConversationWithToolCalls: vi.fn(),
  getChatMessages: vi.fn(),
  clearChatMessages: vi.fn(),
  saveCompleteConversation: vi.fn(),
  formatMessagesForAI: vi.fn(),
  generateStandaloneQuestion: vi.fn(),
  generateChatMessagesFromResponse: vi.fn(),
}

// Mock the authentication middleware
vi.mock('../middleware/auth.js', () => ({
  verifyAuth: vi.fn((request, reply, done) => {
    // Check if request has authentication headers (like the makeAuthenticatedRequest would add)
    const hasAuth = request.headers.authorization || request.headers['x-user-id']

    if (hasAuth) {
      request.userId = 'test-user-id'
      done()
    } else {
      // Simulate unauthorized - reply with 401
      reply.code(401).send({ error: 'Unauthorized' })
    }
  }),
}))

// Mock the dependencies
vi.mock('../services/chat.service.js', () => ({
  ChatService: vi.fn().mockImplementation(() => mockChatService),
}))

vi.mock('../services/performance.service.js', () => ({
  getPerformanceService: vi.fn(() => ({
    startTimer: vi.fn(() => ({
      mark: vi.fn(),
      stop: vi.fn(),
    })),
  })),
}))

vi.mock('../services/prompt.service.js', () => ({
  promptService: {
    getPrompt: vi.fn(),
  },
}))

vi.mock('../services/vector.service.js', () => ({
  HominemVectorStore: {
    searchDocuments: vi.fn(),
    searchDocumentsTool: vi.fn(),
  },
}))

vi.mock('../plugins/redis.js', () => ({
  redisCache: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

vi.mock('@hominem/utils/tools', () => ({
  allTools: {
    calculatorTool: vi.fn(),
    calculate_transactions: vi.fn(),
  },
}))

vi.mock(import('ai'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
  }
})

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn(),
}))

// Test data
const TEST_USER_ID = 'test-user-id'
const TEST_CHAT_ID = 'test-chat-456'
const TEST_MESSAGE_ID = 'test-message-789'

const mockChat = {
  id: TEST_CHAT_ID,
  userId: TEST_USER_ID,
  title: 'Test Chat',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockMessage = {
  id: TEST_MESSAGE_ID,
  chatId: TEST_CHAT_ID,
  userId: TEST_USER_ID,
  role: 'user',
  content: 'Hello, world!',
  toolCalls: null,
  reasoning: null,
  files: null,
  parentMessageId: null,
  messageIndex: '0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Chat Router', () => {
  const { getServer } = useApiTestLifecycle()

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()

    // Setup default mock implementations
    mockChatService.getOrCreateActiveChat.mockResolvedValue(mockChat)
    mockChatService.getChatById.mockResolvedValue(mockChat)
    mockChatService.getConversationWithToolCalls.mockResolvedValue([mockMessage])
    mockChatService.getChatMessages.mockResolvedValue([mockMessage])
    mockChatService.clearChatMessages.mockResolvedValue({ rowCount: 1 })
    mockChatService.formatMessagesForAI.mockReturnValue([
      { role: 'user', content: 'Hello, world!' },
    ])
  })

  describe('DELETE /:chatId/messages', () => {
    test('should clear chat messages successfully', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'DELETE',
        url: `/api/chat/${TEST_CHAT_ID}/messages`,
      })

      const body = assertSuccessResponse(response) as { success: boolean; message: string }
      expect(body.success).toBe(true)
      expect(body.message).toBe('Chat messages cleared successfully')
      expect(mockChatService.getChatById).toHaveBeenCalledWith(TEST_CHAT_ID)
      expect(mockChatService.clearChatMessages).toHaveBeenCalledWith(TEST_CHAT_ID)
    })

    test('should return 404 when chat not found', async () => {
      mockChatService.getChatById.mockResolvedValue(null)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'DELETE',
        url: `/api/chat/${TEST_CHAT_ID}/messages`,
      })

      assertErrorResponse(response, 404)
      expect(mockChatService.clearChatMessages).not.toHaveBeenCalled()
    })

    test('should return 403 when user does not own chat', async () => {
      mockChatService.getChatById.mockResolvedValue({
        ...mockChat,
        userId: 'different-user',
      })

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'DELETE',
        url: `/api/chat/${TEST_CHAT_ID}/messages`,
      })

      assertErrorResponse(response, 403)
      expect(mockChatService.clearChatMessages).not.toHaveBeenCalled()
    })

    test('should return 401 when unauthorized', async () => {
      const response = await getServer().inject({
        method: 'DELETE',
        url: `/api/chat/${TEST_CHAT_ID}/messages`,
        headers: {},
      })

      assertErrorResponse(response, 401)
    })
  })

  describe('GET /history/:chatId', () => {
    test('should return chat history with default pagination', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}`,
      })

      const body = assertSuccessResponse(response) as unknown as ChatHistoryResponse
      expect(body.chatId).toBe(TEST_CHAT_ID)
      expect(Array.isArray(body.messages)).toBe(true)
      expect(typeof body.hasMore).toBe('boolean')
      expect(mockChatService.getChatById).toHaveBeenCalledWith(TEST_CHAT_ID)
      expect(mockChatService.getConversationWithToolCalls).toHaveBeenCalledWith(TEST_CHAT_ID, {
        limit: 20,
        offset: 0,
        orderBy: 'desc',
      })
    })

    test('should validate and use custom limit and offset parameters', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}?limit=50&offset=10`,
      })

      const body = assertSuccessResponse(response) as unknown as ChatHistoryResponse
      expect(body.chatId).toBe(TEST_CHAT_ID)
      expect(mockChatService.getConversationWithToolCalls).toHaveBeenCalledWith(TEST_CHAT_ID, {
        limit: 50,
        offset: 10,
        orderBy: 'desc',
      })
    })

    test('should enforce limit bounds (1-100)', async () => {
      // Test limit above maximum
      const response1 = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}?limit=150`,
      })

      const body1 = assertSuccessResponse(response1) as unknown as ChatHistoryResponse
      expect(mockChatService.getConversationWithToolCalls).toHaveBeenCalledWith(TEST_CHAT_ID, {
        limit: 100,
        offset: 0,
        orderBy: 'desc',
      })

      // Test limit below minimum
      const response2 = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}?limit=0`,
      })

      const body2 = assertSuccessResponse(response2) as unknown as ChatHistoryResponse
      expect(mockChatService.getConversationWithToolCalls).toHaveBeenCalledWith(TEST_CHAT_ID, {
        limit: 1,
        offset: 0,
        orderBy: 'desc',
      })
    })

    test('should enforce offset minimum (>= 0)', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}?offset=-5`,
      })

      const body = assertSuccessResponse(response) as unknown as ChatHistoryResponse
      expect(mockChatService.getConversationWithToolCalls).toHaveBeenCalledWith(TEST_CHAT_ID, {
        limit: 20,
        offset: 0,
        orderBy: 'desc',
      })
    })

    test('should handle invalid query parameters gracefully', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}?limit=invalid&offset=notanumber`,
      })

      const body = assertSuccessResponse(response) as unknown as ChatHistoryResponse
      // Should use defaults when parsing fails
      expect(mockChatService.getConversationWithToolCalls).toHaveBeenCalledWith(TEST_CHAT_ID, {
        limit: 20,
        offset: 0,
        orderBy: 'desc',
      })
    })

    test('should return 404 when chat not found', async () => {
      mockChatService.getChatById.mockResolvedValue(null)

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}`,
      })

      assertErrorResponse(response, 404)
      expect(mockChatService.getConversationWithToolCalls).not.toHaveBeenCalled()
    })

    test('should return 403 when user does not own chat', async () => {
      mockChatService.getChatById.mockResolvedValue({
        ...mockChat,
        userId: 'different-user',
      })

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}`,
      })

      assertErrorResponse(response, 403)
      expect(mockChatService.getConversationWithToolCalls).not.toHaveBeenCalled()
    })

    test('should return 401 when unauthorized', async () => {
      const response = await getServer().inject({
        method: 'GET',
        url: `/api/chat/history/${TEST_CHAT_ID}`,
        headers: {},
      })

      assertErrorResponse(response, 401)
    })
  })
})
