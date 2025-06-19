import type { User } from '@hominem/utils/schema'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { ForbiddenError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
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

export const listsRoutes = new Hono()

const ListNameSchema = z.string().min(3).max(50)

const createListSchema = z.object({
  name: ListNameSchema,
  isPublic: z.boolean().optional().default(false),
})

const updateListSchema = z.object({
  name: ListNameSchema.optional(),
  isPublic: z.boolean().optional(),
})

const listIdParamSchema = z.object({
  id: z.string().uuid('Invalid list ID format'),
})

const listItemParamSchema = z.object({
  listId: z.string().uuid('Invalid list ID format'),
  itemId: z.string().uuid('Invalid item ID format'),
})

const sendInviteBodySchema = z.object({
  email: z.string().email('Invalid email format'),
})

const listsQuerySchema = z.object({
  itemType: z.string().optional(),
})

// Get all lists for user
listsRoutes.get('/', requireAuth, zValidator('query', listsQuerySchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  const { itemType } = c.req.valid('query')

  try {
    const [ownedLists, sharedUserLists] = await Promise.all([
      getOwnedLists(userId, itemType),
      getUserLists(userId, itemType),
    ])

    return c.json({ lists: [...ownedLists, ...sharedUserLists] })
  } catch (error) {
    console.error('Error fetching lists:', error)
    return c.json(
      {
        error: 'Failed to fetch lists',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Create a new list
listsRoutes.post('/', requireAuth, zValidator('json', createListSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { name, isPublic } = c.req.valid('json')

    const serviceResponse = await createList(name, userId)

    if (!serviceResponse) {
      return c.json({ error: 'Failed to create list' }, 500)
    }

    return c.json({ list: serviceResponse }, 201)
  } catch (error) {
    console.error('Error creating list:', error)
    return c.json(
      {
        error: 'Failed to create list',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Update a list
listsRoutes.put(
  '/:id',
  requireAuth,
  zValidator('param', listIdParamSchema),
  zValidator('json', updateListSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      throw ForbiddenError('Unauthorized')
    }

    try {
      const { id: listId } = c.req.valid('param')
      const updateData = c.req.valid('json')
      const { name } = updateData

      if (name === undefined) {
        return c.json({ error: 'Name is required for list update' }, 400)
      }

      const serviceResponse = await updateList(listId, name, userId)

      if (!serviceResponse) {
        return c.json({ error: 'List not found or update failed' }, 404)
      }

      return c.json({ list: serviceResponse })
    } catch (error) {
      console.error('Error updating list:', error)
      return c.json(
        {
          error: 'Failed to update list',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete a list
listsRoutes.delete('/:id', requireAuth, zValidator('param', listIdParamSchema), async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { id } = c.req.valid('param')

    const success = await deleteList(id, userId)

    if (!success) {
      return c.json({ error: 'Failed to delete list or list not found' }, 404)
    }

    return c.body(null, 204)
  } catch (error) {
    console.error('Error deleting list:', error)
    return c.json(
      {
        error: 'Failed to delete list',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get a specific list by ID
listsRoutes.get('/:id', zValidator('param', listIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const userId = c.get('userId')

    const listData = await getListById(id, userId)

    if (!listData) {
      return c.json({ message: 'List not found' }, 404)
    }

    return c.json({ list: listData })
  } catch (error) {
    console.error('Error fetching list:', error)
    return c.json(
      {
        error: 'Failed to fetch list',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Delete a list item
listsRoutes.delete(
  '/:listId/items/:itemId',
  zValidator('param', listItemParamSchema),
  async (c) => {
    try {
      const { listId, itemId } = c.req.valid('param')

      const success = await deleteListItem(listId, itemId)

      if (!success) {
        return c.json({ error: 'Failed to delete list item or item not found' }, 404)
      }

      return c.body(null, 204)
    } catch (error) {
      console.error('Error deleting list item:', error)
      return c.json(
        {
          error: 'Failed to delete list item',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Get list invites
listsRoutes.get('/:id/invites', zValidator('param', listIdParamSchema), async (c) => {
  try {
    const { id } = c.req.valid('param')
    const invites = await getListInvites(id)

    return c.json(invites)
  } catch (error) {
    console.error('Error fetching list invites:', error)
    return c.json(
      {
        error: 'Failed to fetch list invites',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Send list invite
listsRoutes.post(
  '/:id/invites',
  requireAuth,
  zValidator('param', listIdParamSchema),
  zValidator('json', sendInviteBodySchema),
  async (c) => {
    const userId = c.get('userId')
    const currentUser = c.get('user') as User

    if (!userId || !currentUser) {
      return c.json({ message: 'Unauthorized' }, 401)
    }

    try {
      const { id: listId } = c.req.valid('param')
      const { email: invitedUserEmail } = c.req.valid('json')

      // Directly pass the individual parameters to match the function signature
      const serviceResponse = await sendListInvite(listId, invitedUserEmail, userId)

      if ('error' in serviceResponse) {
        const status =
          serviceResponse.status >= 400 && serviceResponse.status < 600
            ? serviceResponse.status
            : 500
        return c.json(
          { message: serviceResponse.error },
          status as 400 | 401 | 403 | 404 | 409 | 500
        )
      }

      const createdInvite = serviceResponse

      const listDetails = await getListById(listId, userId)
      const listName = listDetails && !('error' in listDetails) ? listDetails.name : 'a shared list'
      const appUrl = process.env.APP_URL || 'http://localhost:3000'

      // TODO: Implement email sending through Hono context or service
      // await c.get('emailService').sendEmail(...)
      // TODO: Send email to invited user

      return c.json({ invite: createdInvite }, 201)
    } catch (error) {
      console.error('Error sending list invite:', error)
      return c.json(
        {
          error: 'Failed to send list invite',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Accept list invite
listsRoutes.post(
  '/invites/:listId/accept',
  requireAuth,
  zValidator('param', z.object({ listId: z.string().uuid() })),
  async (c) => {
    const userId = c.get('userId')
    const currentUser = c.get('user') as User

    if (!userId || !currentUser || !currentUser.email) {
      return c.json({ error: 'Unauthorized or user email not available' }, 401)
    }

    try {
      const { listId } = c.req.valid('param')

      const serviceResponse = await acceptListInvite(listId, currentUser.email, userId)

      if ('error' in serviceResponse) {
        const status =
          serviceResponse.status >= 400 && serviceResponse.status < 600
            ? serviceResponse.status
            : 500
        return c.json({ error: serviceResponse.error }, status as 400 | 401 | 403 | 404 | 409 | 500)
      }

      const userListEntry = serviceResponse

      return c.json({
        message: 'Invite accepted successfully.',
        data: userListEntry,
      })
    } catch (error) {
      console.error('Error accepting list invite:', error)
      return c.json(
        {
          error: 'Failed to accept list invite',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
