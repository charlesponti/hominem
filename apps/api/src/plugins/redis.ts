import { logger } from '@ponti/utils/logger'
import { redis } from '@ponti/utils/redis'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import type Redis from 'ioredis'

interface RedisPluginOptions {
  url?: string
  host?: string
  port?: number
  password?: string
  db?: number
  maxRetriesPerRequest?: number
  enableReadyCheck?: boolean
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

const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (fastify, options) => {
  // Get prefix for cache keys
  const prefix = options.prefix || 'api:'
  // Get default TTL
  const defaultTtl = options.ttl || DEFAULT_TTL

  redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis client error')
  })

  redis.on('connect', () => {
    fastify.log.info('Redis client connected')
  })

  redis.on('ready', () => {
    fastify.log.info('Redis client ready')
  })

  // Initialize cache object
  const cache = {
    async get(key: string): Promise<string | null> {
      return await redisCache.get(redis, `${prefix}${key}`)
    },

    async set(key: string, value: string, ttl = defaultTtl): Promise<void> {
      await redisCache.set(redis, `${prefix}${key}`, value, ttl)
    },

    async del(key: string): Promise<void> {
      await redisCache.del(redis, `${prefix}${key}`)
    },
  }

  // Decorate fastify instance with cache
  fastify.decorate('cache', cache)

  fastify.addHook('onClose', async (instance) => {
    if (redis.status === 'end') return
    await redis.quit()
  })
}

export default fp(redisPlugin, {
  name: 'fastify-redis',
})
