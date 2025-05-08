import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { list, listInvite, users } from '@hominem/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'

export default function sendListInvite(server: FastifyInstance) {
  server.post('/lists/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request
    if (!userId) {
      return reply.code(401).send({ message: 'Unauthorized' })
    }

    // Validate params and body using Zod
    const paramsResult = z
      .object({
        id: z.string().uuid(),
      })
      .safeParse(request.params)

    if (!paramsResult.success) {
      reply.status(400).send({
        error: 'Invalid parameters',
        details: paramsResult.error.format(),
      })
      return
    }

    const bodyResult = z
      .object({
        email: z.string().email(),
      })
      .safeParse(request.body)

    if (!bodyResult.success) {
      reply.status(400).send({
        error: 'Invalid request body',
        details: bodyResult.error.format(),
      })
      return
    }

    const { id } = paramsResult.data
    const { email } = bodyResult.data

    const found = await db.select().from(list).where(eq(list.id, id)).then(takeUniqueOrThrow)

    if (!found) {
      return reply.status(404).send({
        message: 'List not found',
      })
    }

    let invite = null
    try {
      invite = await db.insert(listInvite).values({
        listId: id,
        invitedUserEmail: email,
        invitedUserId: null,
        accepted: false,
        userId,
      })
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    } catch (error: any) {
      switch (error.code) {
        case 'P2002':
          return reply.status(409).send({
            message: 'Invite already exists',
          })
        default:
          break
      }

      return reply.status(500).send({
        message: 'Something went wrong',
      })
    }

    const userEmail = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .then(takeUniqueOrThrow)

    // Send email to the invited user using sendgrid
    await server.sendEmail(
      email,
      'You have been invited to a list',
      'You have been invited to a list',
      `
					<div class="email" style="font-family: sans-serif;">
						<h1>You have been invited to a list</h1>
						<p class="font-size: 16px">You have been invited to the ${found.name} list</p>
						<p class="font-size: 14px; color: grey">This list is by ${userEmail?.email}</p>
						<p>Click <a href="${process.env.APP_URL}/invites/incoming">here</a> to accept the invite</p>
					</div>
				`
    )

    return reply.status(200).send(invite)
  })
}
