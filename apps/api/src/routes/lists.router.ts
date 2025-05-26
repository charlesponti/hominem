import type { User } from '@hominem/utils/schema'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { ForbiddenError } from '../lib/errors.js'
import { verifyAuth } from '../middleware/auth.js'
import {
  acceptListInvite,
  createList,
  deleteList,
  deleteListItem,
  getListById,
  getListInvites,
  getOwnedLists,
  getUserLists,
  sendListInvite,
  updateList,
} from '../services/lists.service.js'

const ListNameSchema = z.string().min(3).max(50)

const createListSchema = z.object({
  name: ListNameSchema,
  isPublic: z.boolean().optional().default(false),
})

const updateListSchema = z.object({
  name: ListNameSchema.optional(),
  isPublic: z.boolean().optional(),
})

const deleteListSchema = z.object({
  id: z.string().uuid(),
})

// Schema for list invite data
const NewListInviteSchema = z.object({
  listId: z.string().uuid(),
  invitedUserEmail: z.string().email(),
  userId: z.string().uuid(),
})

const listIdParamSchema = z.object({ id: z.string().uuid() })
const inviteListIdParamSchema = z.object({ listId: z.string().uuid() })

const sendInviteBodySchema = z.object({
  email: z.string().email(),
})

const listsPlugin: FastifyPluginAsync = async (server) => {
  server.get('/lists', { preHandler: verifyAuth }, async (request) => {
    const { userId } = request
    if (!userId) {
      throw ForbiddenError('Unauthorized')
    }

    const { itemType } = request.query as Record<string, string>

    const [ownedLists, sharedUserLists] = await Promise.all([
      getOwnedLists(userId, itemType),
      getUserLists(userId, itemType),
    ])

    return { lists: [...ownedLists, ...sharedUserLists] }
  })

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
        return reply.status(400).send({
          error: 'Invalid request body',
          details: result.error.format(),
        })
      }
      const { name, isPublic } = result.data

      const serviceResponse = await createList(name, userId)

      if (!serviceResponse) {
        return reply.status(500).send({ error: 'Failed to create list' })
      }

      return reply.status(201).send({ list: serviceResponse })
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

      const paramsResult = listIdParamSchema.safeParse(request.params)
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.format(),
        })
      }
      const { id: listId } = paramsResult.data

      const bodyResult = updateListSchema.safeParse(request.body)
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.format(),
        })
      }

      const updateData = bodyResult.data
      const { name } = updateData

      if (name === undefined) {
        return reply.status(400).send({
          error: 'Name is required for list update',
        })
      }

      const serviceResponse = await updateList(listId, name, userId)

      if (!serviceResponse) {
        return reply.status(404).send({ error: 'List not found or update failed' })
      }

      return { list: serviceResponse }
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

  server.post(
    '/lists/:id/invites',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      const currentUser = request.user as User

      if (!userId || !currentUser) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const paramsResult = listIdParamSchema.safeParse(request.params)
      if (!paramsResult.success) {
        reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.format(),
        })
        return
      }
      const { id: listId } = paramsResult.data

      const bodyResult = sendInviteBodySchema.safeParse(request.body)
      if (!bodyResult.success) {
        reply.status(400).send({
          error: 'Invalid request body',
          details: bodyResult.error.format(),
        })
        return
      }
      const { email: invitedUserEmail } = bodyResult.data

      // Directly pass the individual parameters to match the function signature
      const serviceResponse = await sendListInvite(listId, invitedUserEmail, userId)

      if ('error' in serviceResponse) {
        return reply.status(serviceResponse.status).send({ message: serviceResponse.error })
      }

      const createdInvite = serviceResponse

      const listDetails = await getListById(listId, userId)
      const listName = listDetails && !('error' in listDetails) ? listDetails.name : 'a shared list'
      const appUrl = process.env.APP_URL || 'http://localhost:3000'

      try {
        await server.sendEmail(
          invitedUserEmail,
          "You've been invited to a list!",
          `You've been invited to join the list "${listName}". Click the link to accept: ${appUrl}/invites/incoming`,
          `
            <div class="email" style="font-family: sans-serif;">
              <h1 style="color: #333;">You've been invited to a list!</h1>
              <p style="color: #555;">
                You've been invited to join the list "${listName}".
              </p>
              <p style="color: #555;">
                Click <a href="${appUrl}/invites/incoming" style="color: #007BFF;">here</a> to view and accept your invites.
              </p>
            </div>
          `
        )
      } catch (emailError) {
        server.log.error(
          { error: emailError, listId, invitedUserEmail },
          'Failed to send invite email'
        )
      }

      return reply.status(201).send({ invite: createdInvite })
    }
  )

  server.post(
    '/invites/:listId/accept',
    { preHandler: verifyAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      const currentUser = request.user as User

      if (!userId || !currentUser || !currentUser.email) {
        return reply.status(401).send({ error: 'Unauthorized or user email not available' })
      }

      const paramsResult = inviteListIdParamSchema.safeParse(request.params)
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: 'Invalid parameters',
          details: paramsResult.error.format(),
        })
      }
      const { listId } = paramsResult.data

      const serviceResponse = await acceptListInvite(listId, currentUser.email, userId)

      if ('error' in serviceResponse) {
        return reply.status(serviceResponse.status).send({ error: serviceResponse.error })
      }

      const userListEntry = serviceResponse

      return reply
        .status(200)
        .send({ message: 'Invite accepted successfully.', data: userListEntry })
    }
  )
}

export default listsPlugin
