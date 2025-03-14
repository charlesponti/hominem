import { db } from '@ponti/utils/db'
import { users } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const usersPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get<{
    Querystring: object
    Headers: object
    Reply: typeof users.$inferSelect
  }>(
    '/me',
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }

      try {
        const foundUser = await db.select().from(users).where(eq(users.id, request.userId)).limit(1)

        /**
         * If user does not exist in our database, we should create the user
         * since they're already authenticated with Clerk
         */
        if (foundUser.length === 0) {
          // Get user information from Clerk to create local user record
          try {
            const result = await db.insert(users).values({
              id: request.userId,
              email: request.userId, // You may want to get email from Clerk API
              name: 'User', // You may want to get name from Clerk API
            }).returning()
            
            return reply.code(200).send(result[0])
          } catch (err) {
            request.log.error('Failed to create user', { err })
            return reply.code(500).send({ error: 'Failed to create user' })
          }
        }

        return reply.code(200).send(foundUser[0])
      } catch (err) {
        request.log.error('Could not fetch user', { err })
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  server.delete(
    '/me',
    async (request, reply) => {
      if (!request.userId) {
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      
      await db.delete(users).where(eq(users.id, request.userId))
      return { success: true }
    }
  )
}

export default fp(usersPlugin)