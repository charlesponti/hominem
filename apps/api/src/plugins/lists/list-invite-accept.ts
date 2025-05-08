import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { listInvite, userLists, type users } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { verifyAuth } from '../../middleware/auth.js'

const acceptListInviteRoute = async (server: FastifyInstance) => {
  server.post(
    '/invites/:listId/accept',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      // Validate params using Zod
      const result = z
        .object({
          listId: z.string().uuid(),
        })
        .safeParse(request.params)

      if (!result.success) {
        reply.status(400).send({
          error: 'Invalid parameters',
          details: result.error.format(),
        })
        return
      }

      const { listId } = result.data
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
