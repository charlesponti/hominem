import { client } from '@hominem/utils/db'
import { redis } from '@hominem/utils/redis'
import type { FastifyPluginAsync } from 'fastify'

const shutdownPlugin: FastifyPluginAsync = async (server) => {
  process.on('SIGINT', () => server.close())
  process.on('SIGTERM', () => server.close())

  server.addHook('onClose', async (instance) => {
    instance.log.info('Closing connections...')
    const promises = []
    if (redis && typeof redis.quit === 'function') {
      instance.log.info('Closing Redis connection...')
      promises.push(redis.quit().catch((err) => instance.log.error({ err }, 'Error closing Redis')))
    } else {
      instance.log.warn('Redis client not available or quit function missing.')
    }
    if (client && typeof client.end === 'function') {
      instance.log.info('Closing database connection...')
      promises.push(
        client
          .end({ timeout: 5 })
          .catch((err: unknown) => instance.log.error({ err }, 'Error closing database'))
      ) // 5 second timeout
    } else {
      instance.log.warn('Database client not available or end function missing.')
    }
    await Promise.all(promises)
    instance.log.info('Connections closed.')
  })
}

export default shutdownPlugin
