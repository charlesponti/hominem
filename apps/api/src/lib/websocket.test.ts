import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'
import { EventEmitter } from 'node:events'

// Mock WebSocket and WebSocketServer
class MockWebSocket extends EventEmitter {
  readyState = 1 // WebSocket.OPEN
  send = vi.fn()
}

class MockWebSocketServer extends EventEmitter {
  clients = new Set<MockWebSocket>()
  handleUpgrade = vi.fn()
  close = vi.fn((callback?: () => void) => {
    if (callback) callback()
  })
  // Don't override emit - let EventEmitter handle it
}

// Mock Redis
const mockRedisSubscriber = {
  duplicate: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  quit: vi.fn(() => Promise.resolve()),
}

const mockRedis = {
  duplicate: vi.fn(() => mockRedisSubscriber),
}

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}

// Mock auth
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
}

const mockGetHominemUser = vi.fn()

// Mock handlers
const mockWsHandlers = {
  process: vi.fn(),
}

const mockRedisHandlers = {
  process: vi.fn(),
}

// Set up mocks
vi.mock('ws', () => ({
  WebSocketServer: MockWebSocketServer,
  WebSocket: MockWebSocket,
}))

vi.mock('@hominem/utils/redis', () => ({
  redis: mockRedis,
}))

vi.mock('@hominem/utils/logger', () => ({
  logger: mockLogger,
}))

vi.mock('@hominem/utils/consts', () => ({
  REDIS_CHANNELS: {
    IMPORT_PROGRESS: 'import-progress',
  },
}))

vi.mock('../middleware/auth.js', () => ({
  supabaseClient: mockSupabaseClient,
  getHominemUser: mockGetHominemUser,
}))

vi.mock('../websocket/handlers.js', () => ({
  wsHandlers: mockWsHandlers,
}))

vi.mock('../websocket/redis-handlers.js', () => ({
  redisHandlers: mockRedisHandlers,
}))

describe('WebSocket Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Redis subscriber mock
    mockRedisSubscriber.duplicate = vi.fn()
    mockRedisSubscriber.on = vi.fn()
    mockRedisSubscriber.subscribe = vi.fn()
    mockRedisSubscriber.unsubscribe = vi.fn()
    mockRedisSubscriber.quit = vi.fn(() => Promise.resolve())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createWebSocketManager', () => {
    test('creates WebSocket manager with all components', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()

      expect(manager).toHaveProperty('wss')
      expect(manager).toHaveProperty('redisSubscriber')
      expect(manager).toHaveProperty('handleUpgrade')
      expect(manager).toHaveProperty('close')
      expect(typeof manager.handleUpgrade).toBe('function')
      expect(typeof manager.close).toBe('function')
    })

    test('sets up Redis subscriber and subscribes to channels', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      createWebSocketManager()

      expect(mockRedis.duplicate).toHaveBeenCalled()
      expect(mockRedisSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function))
      expect(mockRedisSubscriber.subscribe).toHaveBeenCalledWith('import-progress')
      expect(mockLogger.info).toHaveBeenCalledWith('Subscribed to Redis channel: import-progress')
    })

    test('processes Redis messages through handlers', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      let messageHandler: (channel: string, message: string) => void
      mockRedisSubscriber.on = vi.fn().mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler
        }
      })

      const manager = createWebSocketManager()

      const testChannel = 'import-progress'
      const testMessage = JSON.stringify({ status: 'processing', progress: 50 })
      
      messageHandler!(testChannel, testMessage)

      expect(mockRedisHandlers.process).toHaveBeenCalledWith(
        manager.wss,
        testChannel,
        testMessage
      )
    })
  })

  describe('WebSocket connection handling', () => {
    test('handles new WebSocket connections', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockWs = new MockWebSocket()

      // Simulate connection
      manager.wss.emit('connection', mockWs)

      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('Connected to server')
      )
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket client connected')
    })

    test('handles WebSocket messages', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockWs = new MockWebSocket()

      // Simulate connection
      manager.wss.emit('connection', mockWs)

      const testMessage = JSON.stringify({ type: 'ping' })
      mockWs.emit('message', Buffer.from(testMessage))

      expect(mockWsHandlers.process).toHaveBeenCalledWith(mockWs, testMessage)
    })

    test('handles WebSocket errors', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockWs = new MockWebSocket()

      // Simulate connection
      manager.wss.emit('connection', mockWs)

      const testError = new Error('WebSocket error')
      mockWs.emit('error', testError)

      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket connection error:', testError)
    })

    test('handles WebSocket disconnection', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockWs = new MockWebSocket()

      // Simulate connection
      manager.wss.emit('connection', mockWs)

      mockWs.emit('close')

      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket client disconnected')
    })
  })

  describe('WebSocket upgrade handling', () => {
    test('handles upgrade with valid token', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {
        url: '/ws?token=valid-token',
      } as IncomingMessage
      const mockSocket = {} as Duplex
      const mockHead = Buffer.from('test')

      // Mock successful authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      mockGetHominemUser.mockResolvedValue({ id: 'hominem-user-123' })

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      expect(manager.wss.handleUpgrade).toHaveBeenCalledWith(
        mockRequest,
        mockSocket,
        mockHead,
        expect.any(Function)
      )

      // Simulate the upgrade callback
      const mockWs = new MockWebSocket()
      await upgradeCallback!(mockWs)

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith('valid-token')
      expect(mockGetHominemUser).toHaveBeenCalledWith('user-123')
      // Just verify authentication was successful
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith('valid-token')
      expect(mockGetHominemUser).toHaveBeenCalledWith('user-123')
    })

    test('rejects upgrade with no token', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {
        url: '/ws',
      } as IncomingMessage
      const mockSocket = {
        destroy: vi.fn(),
      } as unknown as Duplex
      const mockHead = Buffer.from('test')

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      const mockWs = new MockWebSocket()
      await upgradeCallback!(mockWs)

      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket authentication failed: no token provided')
      expect(mockSocket.destroy).toHaveBeenCalled()
    })

    test('rejects upgrade with invalid token', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {
        url: '/ws?token=invalid-token',
      } as IncomingMessage
      const mockSocket = {
        destroy: vi.fn(),
      } as unknown as Duplex
      const mockHead = Buffer.from('test')

      // Mock failed authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      })

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      const mockWs = new MockWebSocket()
      await upgradeCallback!(mockWs)

      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket authentication failed: invalid token')
      expect(mockSocket.destroy).toHaveBeenCalled()
    })

    test('rejects upgrade when user not found', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {
        url: '/ws?token=valid-token',
      } as IncomingMessage
      const mockSocket = {
        destroy: vi.fn(),
      } as unknown as Duplex
      const mockHead = Buffer.from('test')

      // Mock successful Supabase auth but no Hominem user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      mockGetHominemUser.mockResolvedValue(null)

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      const mockWs = new MockWebSocket()
      await upgradeCallback!(mockWs)

      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket authentication failed: user not found')
      expect(mockSocket.destroy).toHaveBeenCalled()
    })

    test('handles authentication errors', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {
        url: '/ws?token=valid-token',
      } as IncomingMessage
      const mockSocket = {
        destroy: vi.fn(),
      } as unknown as Duplex
      const mockHead = Buffer.from('test')

      // Mock authentication error
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'))

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      const mockWs = new MockWebSocket()
      await upgradeCallback!(mockWs)

      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket authentication error:', expect.any(Error))
      expect(mockSocket.destroy).toHaveBeenCalled()
    })

    test('handles upgrade with no URL', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {} as IncomingMessage // No URL
      const mockSocket = {} as Duplex
      const mockHead = Buffer.from('test')

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      const mockWs = new MockWebSocket()
      await upgradeCallback!(mockWs)

      // Should return early without processing
      expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled()
    })
  })

  describe('WebSocket manager cleanup', () => {
    test('closes cleanly', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()

      await manager.close()

      expect(mockRedisSubscriber.unsubscribe).toHaveBeenCalledWith('import-progress')
      expect(mockRedisSubscriber.quit).toHaveBeenCalled()
      expect(manager.wss.close).toHaveBeenCalledWith(expect.any(Function))
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server closed')
    })

    test('handles Redis quit errors during cleanup', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      mockRedisSubscriber.quit = vi.fn(() => Promise.reject(new Error('Redis quit failed')))

      const manager = createWebSocketManager()

      // Should not throw, but should still close WebSocket server
      await manager.close()

      expect(mockRedisSubscriber.quit).toHaveBeenCalled()
      expect(manager.wss.close).toHaveBeenCalled()
    })
  })

  describe('edge cases and error scenarios', () => {
    test('handles malformed URLs in upgrade', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const mockRequest = {
        url: 'not-a-valid-url',
      } as IncomingMessage
      const mockSocket = {
        destroy: vi.fn(),
      } as unknown as Duplex
      const mockHead = Buffer.from('test')

      let upgradeCallback: (ws: MockWebSocket) => void
      manager.wss.handleUpgrade = vi.fn().mockImplementation((request, socket, head, callback) => {
        upgradeCallback = callback
      })

      await manager.handleUpgrade(mockRequest, mockSocket, mockHead)

      const mockWs = new MockWebSocket()
      
      // This should not throw an error, but handle gracefully
      await expect(upgradeCallback!(mockWs)).resolves.toBeUndefined()
    })

    test('handles concurrent WebSocket connections', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      const manager = createWebSocketManager()
      const connections = []

      // Simulate multiple connections
      for (let i = 0; i < 5; i++) {
        const mockWs = new MockWebSocket()
        connections.push(mockWs)
        manager.wss.emit('connection', mockWs)
      }

      // All connections should receive welcome message
      // Note: may include extra logger calls from setup
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket client connected')
      connections.forEach(ws => {
        expect(ws.send).toHaveBeenCalledWith(
          expect.stringContaining('Connected to server')
        )
      })
    })

    test('handles message processing errors', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      // Mock handler to throw error
      mockWsHandlers.process = vi.fn().mockRejectedValue(new Error('Handler error'))

      const manager = createWebSocketManager()
      const mockWs = new MockWebSocket()

      manager.wss.emit('connection', mockWs)

      const testMessage = JSON.stringify({ type: 'test' })
      
      // Emit the message and wait a bit for async processing
      mockWs.emit('message', Buffer.from(testMessage))
      
      // Wait for the async message handler to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      
      // Verify the handler was called and error was logged
      expect(mockWsHandlers.process).toHaveBeenCalledWith(mockWs, testMessage)
      expect(mockLogger.error).toHaveBeenCalledWith('WebSocket message handler error:', expect.any(Error))
    })

    test('handles Redis message processing errors', async () => {
      const { createWebSocketManager } = await import('./websocket.js')

      // Mock Redis handler to throw error
      mockRedisHandlers.process = vi.fn().mockImplementation(() => {
        throw new Error('Redis handler error')
      })

      let messageHandler: (channel: string, message: string) => void = () => {}
      mockRedisSubscriber.on = vi.fn().mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler
        }
      })

      const manager = createWebSocketManager()

      const testChannel = 'import-progress'
      const testMessage = JSON.stringify({ status: 'processing' })
      
      // Should not throw, errors should be handled gracefully
      expect(() => {
        messageHandler(testChannel, testMessage)
      }).not.toThrow()
      
      // Verify the handler was called and error was logged
      expect(mockRedisHandlers.process).toHaveBeenCalledWith(manager.wss, testChannel, testMessage)
      expect(mockLogger.error).toHaveBeenCalledWith('Redis message handler error:', expect.any(Error))
    })
  })
})

