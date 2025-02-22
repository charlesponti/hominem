import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import Redis from 'ioredis'

interface RedisPluginOptions {
  url?: string
  host?: string
  port?: number
  password?: string
  db?: number
  maxRetriesPerRequest?: number
  enableReadyCheck?: boolean
}

const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (fastify, opts) => {
  const config = {
    host: opts.host,
    port: opts.port,
    // password: opts.password,
    db: opts.db || 0,
    maxRetriesPerRequest: opts.maxRetriesPerRequest || 3,
    enableReadyCheck: opts.enableReadyCheck || true,
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  }

  const client = opts.url ? new Redis(opts.url) : new Redis(config)

  client.on('error', (err) => {
    fastify.log.error({ err }, 'Redis client error')
  })

  client.on('connect', () => {
    fastify.log.info('Redis client connected')
  })

  client.on('ready', () => {
    fastify.log.info('Redis client ready')
  })

  fastify.decorate('redis', client)

  fastify.addHook('onClose', async (instance) => {
    if (client.status === 'end') return
    await client.quit()
  })
}

export default fp(redisPlugin, {
  name: 'fastify-redis',
})
