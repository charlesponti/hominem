import type Redis from 'ioredis'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  on: vi.fn(),
  status: 'ready',
} as unknown as Redis

// Mock logger
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

// Mock the Redis instance from utils
vi.mock('@hominem/utils/redis', () => ({
  redis: mockRedis,
}))

vi.mock('@hominem/utils/logger', () => ({
  logger: mockLogger,
}))

describe('Redis Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('redisCache helpers', () => {
    test('get() returns value from Redis', async () => {
      const { redisCache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue('test-value')

      const result = await redisCache.get(mockRedis, 'test-key')

      expect(result).toBe('test-value')
      expect(mockRedis.get).toHaveBeenCalledWith('test-key')
    })

    test('get() returns null on Redis error', async () => {
      const { redisCache } = await import('./redis.js')

      const error = new Error('Redis connection failed')
      mockRedis.get = vi.fn().mockRejectedValue(error)

      const result = await redisCache.get(mockRedis, 'test-key')

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith('Redis get error:', error)
    })

    test('set() stores value in Redis with TTL', async () => {
      const { redisCache } = await import('./redis.js')

      mockRedis.set = vi.fn().mockResolvedValue('OK')

      await redisCache.set(mockRedis, 'test-key', 'test-value', 3600)

      expect(mockRedis.set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 3600)
    })

    test('set() handles Redis errors gracefully', async () => {
      const { redisCache } = await import('./redis.js')

      const error = new Error('Redis connection failed')
      mockRedis.set = vi.fn().mockRejectedValue(error)

      await redisCache.set(mockRedis, 'test-key', 'test-value', 3600)

      expect(mockLogger.error).toHaveBeenCalledWith('Redis set error:', error)
    })

    test('del() removes key from Redis', async () => {
      const { redisCache } = await import('./redis.js')

      mockRedis.del = vi.fn().mockResolvedValue(1)

      await redisCache.del(mockRedis, 'test-key')

      expect(mockRedis.del).toHaveBeenCalledWith('test-key')
    })

    test('del() handles Redis errors gracefully', async () => {
      const { redisCache } = await import('./redis.js')

      const error = new Error('Redis connection failed')
      mockRedis.del = vi.fn().mockRejectedValue(error)

      await redisCache.del(mockRedis, 'test-key')

      expect(mockLogger.error).toHaveBeenCalledWith('Redis del error:', error)
    })
  })

  describe('createCache', () => {
    test('creates cache with default options', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue('test-value')
      mockRedis.set = vi.fn().mockResolvedValue('OK')
      mockRedis.del = vi.fn().mockResolvedValue(1)

      const cache = createCache()

      // Test get with prefix
      await cache.get('user:123')
      expect(mockRedis.get).toHaveBeenCalledWith('api:user:123')

      // Test set with prefix and default TTL
      await cache.set('user:123', 'user-data')
      expect(mockRedis.set).toHaveBeenCalledWith('api:user:123', 'user-data', 'EX', 3600)

      // Test del with prefix
      await cache.del('user:123')
      expect(mockRedis.del).toHaveBeenCalledWith('api:user:123')
    })

    test('creates cache with custom options', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.set = vi.fn().mockResolvedValue('OK')

      const cache = createCache({ prefix: 'test:', ttl: 1800 })

      await cache.set('key', 'value')
      expect(mockRedis.set).toHaveBeenCalledWith('test:key', 'value', 'EX', 1800)
    })

    test('set() allows custom TTL override', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.set = vi.fn().mockResolvedValue('OK')

      const cache = createCache({ ttl: 3600 })

      await cache.set('key', 'value', 7200)
      expect(mockRedis.set).toHaveBeenCalledWith('api:key', 'value', 'EX', 7200)
    })

    test('quit() closes Redis connection when not already ended', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.status = 'ready'
      mockRedis.quit = vi.fn().mockResolvedValue('OK')

      const cache = createCache()
      await cache.quit()

      expect(mockRedis.quit).toHaveBeenCalled()
    })

    test('quit() skips closing when Redis is already ended', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.status = 'end'
      mockRedis.quit = vi.fn().mockResolvedValue('OK')

      const cache = createCache()
      await cache.quit()

      expect(mockRedis.quit).not.toHaveBeenCalled()
    })

    test('sets up Redis event handlers', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.on = vi.fn()

      createCache()

      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function))
    })

    test('error event handler logs errors', async () => {
      const { createCache } = await import('./redis.js')

      let errorHandler: ((err: Error) => void) | undefined
      mockRedis.on = vi.fn().mockImplementation((event, handler) => {
        if (event === 'error') {
          errorHandler = handler
        }
      })

      createCache()

      const testError = new Error('Redis error')
      if (errorHandler) {
        errorHandler(testError)
      }

      expect(mockLogger.error).toHaveBeenCalledWith('Redis client error:', testError)
    })

    test('connect event handler logs connection', async () => {
      const { createCache } = await import('./redis.js')

      let connectHandler: (() => void) | undefined
      mockRedis.on = vi.fn().mockImplementation((event, handler) => {
        if (event === 'connect') {
          connectHandler = handler
        }
      })

      createCache()

      if (connectHandler) {
        connectHandler()
      }

      expect(mockLogger.info).toHaveBeenCalledWith('Redis client connected')
    })

    test('ready event handler logs ready state', async () => {
      const { createCache } = await import('./redis.js')

      let readyHandler: (() => void) | undefined
      mockRedis.on = vi.fn().mockImplementation((event, handler) => {
        if (event === 'ready') {
          readyHandler = handler
        }
      })

      createCache()

      if (readyHandler) {
        readyHandler()
      }

      expect(mockLogger.info).toHaveBeenCalledWith('Redis client ready')
    })
  })

  describe('default cache instance', () => {
    test('exports a default cache instance', async () => {
      const { cache } = await import('./redis.js')

      expect(cache).toBeDefined()
      expect(typeof cache.get).toBe('function')
      expect(typeof cache.set).toBe('function')
      expect(typeof cache.del).toBe('function')
      expect(typeof cache.quit).toBe('function')
    })

    test('default cache uses api: prefix', async () => {
      const { cache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue('test-value')

      await cache.get('test-key')

      expect(mockRedis.get).toHaveBeenCalledWith('api:test-key')
    })

    test('default cache uses 3600s TTL', async () => {
      const { cache } = await import('./redis.js')

      mockRedis.set = vi.fn().mockResolvedValue('OK')

      await cache.set('test-key', 'test-value')

      expect(mockRedis.set).toHaveBeenCalledWith('api:test-key', 'test-value', 'EX', 3600)
    })
  })

  describe('edge cases and error handling', () => {
    test('handles undefined Redis responses', async () => {
      const { redisCache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue(undefined)

      const result = await redisCache.get(mockRedis, 'test-key')

      expect(result).toBeUndefined()
    })

    test('handles null Redis responses', async () => {
      const { redisCache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue(null)

      const result = await redisCache.get(mockRedis, 'test-key')

      expect(result).toBeNull()
    })

    test('handles empty string keys', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue('value')

      const cache = createCache()
      await cache.get('')

      expect(mockRedis.get).toHaveBeenCalledWith('api:')
    })

    test('handles zero TTL', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.set = vi.fn().mockResolvedValue('OK')

      const cache = createCache()
      await cache.set('key', 'value', 0)

      expect(mockRedis.set).toHaveBeenCalledWith('api:key', 'value', 'EX', 0)
    })

    test('handles very large TTL values', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.set = vi.fn().mockResolvedValue('OK')

      const cache = createCache()
      const largeTtl = 2147483647 // Max 32-bit signed integer
      await cache.set('key', 'value', largeTtl)

      expect(mockRedis.set).toHaveBeenCalledWith('api:key', 'value', 'EX', largeTtl)
    })

    test('handles concurrent operations', async () => {
      const { createCache } = await import('./redis.js')

      mockRedis.get = vi.fn().mockResolvedValue('value')
      mockRedis.set = vi.fn().mockResolvedValue('OK')

      const cache = createCache()

      // Simulate concurrent operations
      const operations = [
        cache.get('key1'),
        cache.set('key2', 'value2'),
        cache.get('key3'),
        cache.set('key4', 'value4'),
      ]

      await Promise.all(operations)

      expect(mockRedis.get).toHaveBeenCalledTimes(2)
      expect(mockRedis.set).toHaveBeenCalledTimes(2)
    })
  })
})
