import { db, takeUniqueOrThrow } from '@ponti/utils/db'
import { list, listInvite, users } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

const getListInvitesRoute = (server: FastifyInstance) => {
  server.get(
    '/lists/:id/invites',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                accepted: { type: 'boolean' },
                listId: { type: 'string' },
                invitedUserEmail: { type: 'string' },
                invitedUserId: { type: 'string' },
                // The user who created the invite
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const invites = await db.select().from(listInvite).where(eq(listInvite.listId, id))

      return reply.status(200).send(invites)
    }
  )

  // Create a new list invite route
  server.post(
    '/lists/:id/invites',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            email: { type: 'string' },
          },
          required: ['email'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accepted: { type: 'boolean' },
              listId: { type: 'string' },
              invitedUserEmail: { type: 'string' },
              invitedUserId: { type: 'string' },
              // The user who created the invite
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const { id } = request.params as { id: string }
      const { email } = request.body as { email: string }
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
						<p class="font-size: 16px">You have been invited to the ${list.name} list</p>
						<p class="font-size: 14px; color: grey">This list is by ${userEmail?.email}</p>
						<p>Click <a href="${process.env.APP_URL}/invites/incoming">here</a> to accept the invite</p>
					</div>
				`
      )

      return reply.status(200).send(invite)
    }
  )
}

export default getListInvitesRoute
