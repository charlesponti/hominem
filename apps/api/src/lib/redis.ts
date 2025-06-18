import { logger } from '@hominem/utils/logger'
import { redis } from '@hominem/utils/redis'
import type Redis from 'ioredis'

interface RedisOptions {
  prefix?: string
  ttl?: number
}

// Default TTL for cache entries
const DEFAULT_TTL = 3600 // 1 hour

/**
 * Redis cache helpers
 */
export const redisCache = {
  async get(redis: Redis, key: string): Promise<string | null> {
    try {
      return await redis.get(key)
    } catch (error) {
      logger.error('Redis get error:', error)
      return null
    }
  },

  async set(redis: Redis, key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, value, 'EX', ttlSeconds)
    } catch (error) {
      logger.error('Redis set error:', error)
    }
  },

  async del(redis: Redis, key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      logger.error('Redis del error:', error)
    }
  },
}

/**
 * Create a cache instance with prefix and default TTL
 */
export function createCache(options: RedisOptions = {}) {
  const prefix = options.prefix || 'api:'
  const defaultTtl = options.ttl || DEFAULT_TTL

  // Set up Redis event handlers
  redis.on('error', (err) => {
    logger.error('Redis client error:', err)
  })

  redis.on('connect', () => {
    logger.info('Redis client connected')
  })

  redis.on('ready', () => {
    logger.info('Redis client ready')
  })

  return {
    async get(key: string): Promise<string | null> {
      return await redisCache.get(redis, `${prefix}${key}`)
    },

    async set(key: string, value: string, ttl = defaultTtl): Promise<void> {
      await redisCache.set(redis, `${prefix}${key}`, value, ttl)
    },

    async del(key: string): Promise<void> {
      await redisCache.del(redis, `${prefix}${key}`)
    },

    async quit(): Promise<void> {
      if (redis.status === 'end') return
      await redis.quit()
    },
  }
}

// Export a default cache instance
export const cache = createCache()
