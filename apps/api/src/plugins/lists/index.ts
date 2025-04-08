import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { list, users } from '@hominem/utils/schema'
import { desc, eq } from 'drizzle-orm'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { verifyAuth } from 'src/middleware/auth'
import { z } from 'zod'
import { EVENTS, track } from '../../analytics'
import { ForbiddenError } from '../../lib/errors'
import acceptListInviteRoute from './accept-invite/route'
import getListInvitesRoute from './invites'
import { deleteListItemRoute, getListRoute } from './list'
import { getUserLists } from './lists.service'

// Define Zod schemas
const createListSchema = {
  body: z.object({
    name: z.string().min(3).max(50),
  }),
}

const updateListSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(3).max(50),
  }),
}

const deleteListSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
}

const listsPlugin: FastifyPluginAsync = async (server) => {
  server.get('/lists', {}, async (request: FastifyRequest) => {
    const { userId } = request

    if (!userId) {
      throw ForbiddenError('Unauthorized')
    }

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
  })

  server.post(
    '/lists',
    { preHandler: verifyAuth },
    async (request: FastifyRequest): Promise<{ list: typeof list.$inferInsert }> => {
      const { userId } = request
      if (!userId) {
        throw ForbiddenError('Unauthorized')
      }

      const parsedName = createListSchema.body.safeParse(request.body)
      if (!parsedName.success) {
        throw new Error(parsedName.error.message)
      }
      const { name } = parsedName.data

      const found = await db
        .insert(list)
        .values({
          id: crypto.randomUUID(),
          name,
          userId,
        })
        .returning()
        .then(takeUniqueOrThrow)

      track(userId, EVENTS.LIST_CREATED, { name })

      return { list: found }
    }
  )

  server.put('/lists/:id', { preHandler: verifyAuth }, async (request) => {
    const paramsResult = updateListSchema.params.safeParse(request.params)
    if (!paramsResult.success) {
      throw new Error(paramsResult.error.message)
    }
    const { id } = paramsResult.data

    const bodyResult = updateListSchema.body.safeParse(request.body)
    if (!bodyResult.success) {
      throw new Error(bodyResult.error.message)
    }
    const { name } = bodyResult.data

    const found = await db
      .update(list)
      .set({
        name,
      })
      .where(eq(list.id, id))
      .returning()
    return { list: found }
  })

  server.delete('/lists/:id', { preHandler: verifyAuth }, async (request, reply) => {
    const result = deleteListSchema.params.safeParse(request.params)
    if (!result.success) {
      throw new Error(result.error.message)
    }
    const { id } = result.data

    await db.delete(list).where(eq(list.id, id))

    return reply.status(204).send()
  })

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
