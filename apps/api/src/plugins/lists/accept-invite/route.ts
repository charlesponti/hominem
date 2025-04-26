import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { listInvite, userLists, type users } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { verifyAuth } from '../../../middleware/auth'

const acceptListInviteRoute = async (server: FastifyInstance) => {
  server.post(
    '/invites/:listId/accept',
    {
      preHandler: verifyAuth,
      schema: {
        params: {
          type: 'object',
          properties: {
            listId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              list: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const { listId } = request.params as { listId: string }
      const { email } = request.user as typeof users.$inferSelect

      const invite = await db
        .select()
        .from(listInvite)
        .where(and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, email)))
        .then(takeUniqueOrThrow)

      if (!invite) {
        return reply.status(404).send()
      }

      if (invite.invitedUserEmail !== email) {
        return reply.status(403).send()
      }

      const list = await db.transaction(async (t) => {
        await t
          .update(listInvite)
          .set({
            accepted: true,
          })
          .where(and(eq(listInvite.listId, listId), eq(listInvite.invitedUserEmail, email)))

        await t.insert(userLists).values({
          userId,
          listId: invite.listId,
        })
      })

      return { list }
    }
  )
}

export default acceptListInviteRoute
