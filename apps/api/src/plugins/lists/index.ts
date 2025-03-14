import { db, takeUniqueOrThrow } from '@ponti/utils/db'
import { list, users } from '@ponti/utils/schema'
import { desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { EVENTS, track } from '../../analytics'
import acceptListInviteRoute from './accept-invite/route'
import getListInvitesRoute from './invites'
import { deleteListItemRoute, getListRoute } from './list'
import { getUserLists } from './lists.service'

// Cron jobs
// import addPhotoToPlaces from "./crons/addPhotoToPlaces";
// import migrateLatLngFloat from "./crons/migrateLatLngFloat";

const listsPlugin: FastifyPluginAsync = async (server) => {
  server.get(
    '/lists',
    {},
    async (request: FastifyRequest) => {
      const { userId } = request
      const lists = await db
        .select()
        .from(list)
        .where(eq(list.userId, userId))
        .leftJoin(users, eq(list.userId, list.id))
        .orderBy(desc(list.createdAt))
      const userLists = await getUserLists(userId)

      return [
        ...lists,
        ...userLists.map(({ list, users }) => ({
          ...list,
          createdBy: {
            email: users?.email,
          },
        })),
      ]
    }
  )

  server.post(
    '/lists',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
              minLength: 3,
              maxLength: 50,
            },
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
    async (request: FastifyRequest): Promise<{ list: typeof list.$inferInsert }> => {
      const { name } = request.body as { name: string }
      const { userId } = request
      const found = await db
        .insert(list)
        .values({
          id: crypto.randomUUID(),
          name,
          userId,
        })
        .returning()
        .then(takeUniqueOrThrow)

      track(userId, EVENTS.USER_EVENTS.LIST_CREATED, { name })

      return { list: found }
    }
  )

  server.put(
    '/lists/:id',
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
            name: { type: 'string' },
          },
          required: ['name'],
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
    async (request) => {
      const { id, name } = request.body as { id: string; name: string }
      const found = await db
        .update(list)
        .set({
          name,
        })
        .where(eq(list.id, id))
        .returning()
      return { list: found }
    }
  )

  server.delete(
    '/lists/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      await db.delete(list).where(eq(list.id, id))

      return reply.status(204).send()
    }
  )

  acceptListInviteRoute(server)
  deleteListItemRoute(server)
  getListRoute(server)
  getListInvitesRoute(server)

  // Cron jobs
  // if (process.env.NODE_ENV !== "test") {
  // addPhotoToPlaces(server).catch((err) => {
  //   console.error("Error adding photo to place", err);
  // });
  // migrateLatLngFloat(server).catch((err) => {
  //   console.error("Error migrating lat and lng", err);
  // });
  // }
}

export default fastifyPlugin(listsPlugin)
