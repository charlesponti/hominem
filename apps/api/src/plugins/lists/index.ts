import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { item, list, listInvite } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { EVENTS, track } from '../../analytics'
import { ForbiddenError } from '../../lib/errors'
import { verifyAuth } from '../../middleware/auth'
import {
  formatList,
  getListPlacesMap,
  getOwnedLists,
  getUserLists,
} from '../../services/lists.service'
import acceptListInviteRoute from './list-invite-accept'
import sendListInviteRoute from './list-invite-send'

const ListNameSchema = z.string().min(3).max(50)

const createListSchema = z.object({
  name: ListNameSchema,
})

const updateListSchema = z.object({
  id: z.string().uuid(),
  name: ListNameSchema,
})

const deleteListSchema = z.object({
  id: z.string().uuid(),
})

const listsPlugin: FastifyPluginAsync = async (server) => {
  server.get(
    '/lists',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request

      if (!userId) {
        throw ForbiddenError('Unauthorized')
      }

      // Fetch owned and shared lists in parallel
      const [ownedLists, sharedUserLists] = await Promise.all([
        getOwnedLists(userId),
        getUserLists(userId),
      ])

      // Extract list IDs for fetching places
      const listIds = [
        ...ownedLists.map(({ list }) => list.id),
        ...sharedUserLists.filter(({ list }) => !!list).map(({ list }) => list.id),
      ]

      // Build a map of list places
      const listPlacesMap = await getListPlacesMap(listIds)

      // Format owned lists
      const formattedOwnedLists = ownedLists.map((listData) =>
        formatList(listData, listPlacesMap.get(listData.list.id) || [], true)
      )

      // Format shared lists
      const formattedSharedLists = sharedUserLists
        .filter(({ list }) => !!list)
        .map((sharedListData) => {
          // Need to adapt the shape to match ListWithUser
          const listWithUser = {
            list: sharedListData.list!,
            user: sharedListData.users,
          }
          return formatList(listWithUser, listPlacesMap.get(sharedListData.list!.id) || [], false)
        })

      return [...formattedOwnedLists, ...formattedSharedLists]
    }
  )

  server.post(
    '/lists',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        throw ForbiddenError('Unauthorized')
      }

      // Validate request body using Zod
      const result = createListSchema.safeParse(request.body)
      if (!result.success) {
        reply.status(400).send({
          error: 'Invalid request body',
          details: result.error.format(),
        })
        return
      }

      const { name } = result.data

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

  server.put(
    '/lists/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        throw ForbiddenError('Unauthorized')
      }

      // Validate params and body using Zod
      const paramsResult = z.object({ id: z.string().uuid() }).safeParse(request.params)
      if (!paramsResult.success) {
        reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.format(),
        })
        return
      }

      const { id } = paramsResult.data

      const bodyResult = updateListSchema.safeParse(request.body)
      if (!bodyResult.success) {
        reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.format(),
        })
        return
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
    }
  )

  server.delete(
    '/lists/:id',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        throw ForbiddenError('Unauthorized')
      }

      // Validate params using Zod
      const result = deleteListSchema.safeParse(request.params)
      if (!result.success) {
        reply.status(400).send({
          error: 'Invalid parameters',
          details: result.error.format(),
        })
        return
      }

      const { id } = result.data

      await db.delete(list).where(eq(list.id, id))

      return reply.status(204).send()
    }
  )

  server.get('/lists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    // Validate params using Zod
    const result = z.object({ id: z.string().uuid() }).safeParse(request.params)
    if (!result.success) {
      reply.status(400).send({
        error: 'Invalid parameters',
        details: result.error.format(),
      })
      return
    }

    const { id } = result.data

    const found = await db.select().from(list).where(eq(list.id, id)).then(takeUniqueOrThrow)

    if (!found) {
      return reply.status(404).send({ message: 'List not found' })
    }

    // Import getListPlaces from service
    const { getListPlaces } = await import('../../services/lists.service')
    const listItems = await getListPlaces(id)

    return { ...found, items: listItems, userId: found.userId }
  })

  server.delete(
    '/lists/:listId/items/:itemId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Validate params using Zod
      const result = z
        .object({
          listId: z.string().uuid(),
          itemId: z.string().uuid(),
        })
        .safeParse(request.params)

      if (!result.success) {
        reply.status(400).send({
          error: 'Invalid parameters',
          details: result.error.format(),
        })
        return
      }

      const { listId, itemId } = result.data

      await db.delete(item).where(and(eq(item.listId, listId), eq(item.itemId, itemId)))

      return reply.status(204).send()
    }
  )

  server.get('/lists/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
    // Validate params using Zod
    const result = z
      .object({
        id: z.string().uuid(),
      })
      .safeParse(request.params)

    if (!result.success) {
      reply.status(400).send({
        error: 'Invalid parameters',
        details: result.error.format(),
      })
      return
    }

    const { id } = result.data
    const invites = await db.select().from(listInvite).where(eq(listInvite.listId, id))

    return reply.status(200).send(invites)
  })

  sendListInviteRoute(server)
  acceptListInviteRoute(server)

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

export default listsPlugin
