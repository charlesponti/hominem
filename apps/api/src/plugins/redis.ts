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
}

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
}

const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (fastify) => {
  redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis client error')
  })

  redis.on('connect', () => {
    fastify.log.info('Redis client connected')
  })

  redis.on('ready', () => {
    fastify.log.info('Redis client ready')
  })

  fastify.addHook('onClose', async (instance) => {
    if (redis.status === 'end') return
    await redis.quit()
  })
}

export default fp(redisPlugin, {
  name: 'fastify-redis',
})
