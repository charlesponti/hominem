import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import type { FastifyPluginAsync } from 'fastify'
import { verifyIsAdmin } from './auth/utils/index.js'

const adminPlugin: FastifyPluginAsync = async (server) => {
  server.get('/admin/users', { preValidation: verifyIsAdmin }, async (request, reply) => {
    try {
      const results = await db.select().from(users)
      return reply.code(200).send(results)
    } catch (err) {
      request.log.info('Could not fetch users', err)
      return reply.code(500).send()
    }
  })
}

export default adminPlugin
