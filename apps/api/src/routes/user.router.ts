import { db } from '@hominem/utils/db'
import { users } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { verifyAuth } from 'src/middleware/auth'

const usersPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/me', { preHandler: verifyAuth }, async (request, reply) => {
    if (!request.userId || !request.user) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    try {
      return reply.code(200).send(request.user)
    } catch (err) {
      request.log.error('Could not fetch user', { err })
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  server.delete('/me', { preHandler: verifyAuth }, async (request, reply) => {
    if (!request.userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    await db.delete(users).where(eq(users.id, request.userId))
    return { success: true }
  })
}

export default fp(usersPlugin)
