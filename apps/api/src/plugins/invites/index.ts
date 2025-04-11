import { db } from '@ponti/utils/db'
import { list, listInvite, users } from '@ponti/utils/schema'
import { and, asc, eq } from 'drizzle-orm'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { verifyAuth } from 'src/middleware/auth'

export const invitesPlugin: FastifyPluginAsync = async (server) => {
  server.get(
    '/invites',
    {
      preHandler: verifyAuth,
      schema: {
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
                list: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const invites = await db
        .select()
        .from(listInvite)
        .where(and(eq(listInvite.invitedUserId, userId), eq(listInvite.accepted, false)))
        .leftJoin(list, eq(list.id, listInvite.listId))
        .leftJoin(users, eq(users.id, listInvite.userId))
        .orderBy(asc(listInvite.listId))

      return reply.status(200).send(invites)
    }
  )

  server.get(
    '/invites/outgoing',
    {
      preHandler: verifyAuth,
      schema: {
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const invites = await db
        .select()
        .from(listInvite)
        .where(and(eq(listInvite.userId, userId)))

      return reply.status(200).send(invites)
    }
  )
}
