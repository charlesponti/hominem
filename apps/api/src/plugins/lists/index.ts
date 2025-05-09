import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { EVENTS, track } from '../../analytics'
import { ForbiddenError } from '../../lib/errors'
import { verifyAuth } from '../../middleware/auth'
import {
  createList,
  deleteList,
  deleteListItem,
  formatList,
  getListById,
  getListInvites,
  getListPlacesMap,
  getOwnedLists,
  getUserLists,
  updateList,
} from '../../services/lists.service'
import acceptListInviteRoute from './list-invite-accept'
import sendListInviteRoute from './list-invite-send'

const ListNameSchema = z.string().min(3).max(50)

const createListSchema = z.object({
  name: ListNameSchema,
})

const updateListSchema = z.object({
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

      const [ownedLists, sharedUserLists] = await Promise.all([
        getOwnedLists(userId),
        getUserLists(userId),
      ])

      const listIds = [
        ...ownedLists.map((list) => list.id),
        ...sharedUserLists.map((list) => list.id),
      ]

      const listPlacesMap = await getListPlacesMap(listIds)

      const formattedOwnedLists = ownedLists.map((listData) =>
        formatList(listData, listPlacesMap.get(listData.id) || [], true)
      )

      const formattedSharedLists = sharedUserLists.map((listData) =>
        formatList(listData, listPlacesMap.get(listData.id) || [], false)
      )

      return { lists: [...formattedOwnedLists, ...formattedSharedLists] }
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

      const result = createListSchema.safeParse(request.body)
      if (!result.success) {
        reply.status(400).send({
          error: 'Invalid request body',
          details: result.error.format(),
        })
        return
      }
      const { name } = result.data

      const newList = await createList(name, userId)

      if (!newList) {
        reply.status(500).send({ error: 'Failed to create list' })
        return
      }

      track(userId, EVENTS.LIST_CREATED, { listId: newList.id, name: newList.name })
      return reply.status(201).send({ list: newList })
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

      const updatedList = await updateList(id, name, userId)

      if (!updatedList) {
        reply.status(404).send({ error: 'Failed to update list or list not found' })
        return
      }

      return { list: updatedList }
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

      const result = deleteListSchema.safeParse(request.params)
      if (!result.success) {
        reply.status(400).send({
          error: 'Invalid parameters',
          details: result.error.format(),
        })
        return
      }
      const { id } = result.data

      const success = await deleteList(id, userId)

      if (!success) {
        reply.status(404).send({ error: 'Failed to delete list or list not found' })
        return
      }

      return reply.status(204).send()
    }
  )

  server.get('/lists/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = z.object({ id: z.string().uuid() }).safeParse(request.params)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Invalid parameters',
        details: result.error.format(),
      })
    }
    const { id } = result.data
    const { userId } = request

    const listData = await getListById(id, userId)

    if (!listData) {
      return reply.status(404).send({ message: 'List not found' })
    }

    return { list: listData }
  })

  server.delete(
    '/lists/:listId/items/:itemId',
    async (request: FastifyRequest, reply: FastifyReply) => {
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

      const success = await deleteListItem(listId, itemId)

      if (!success) {
        reply.status(404).send({ error: 'Failed to delete list item or item not found' })
        return
      }

      return reply.status(204).send()
    }
  )

  server.get('/lists/:id/invites', async (request: FastifyRequest, reply: FastifyReply) => {
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
    const invites = await getListInvites(id)

    return reply.status(200).send(invites)
  })

  sendListInviteRoute(server)
  acceptListInviteRoute(server)
}

export default listsPlugin
