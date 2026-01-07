import crypto from 'node:crypto'
import {
  createPossession,
  deletePossession,
  listPossessions,
  updatePossession,
} from '@hominem/data/services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { ForbiddenError } from '../lib/errors.js'
export const possessionsRoutes = new Hono()

const createPossessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  dateAcquired: z.string(),
  purchasePrice: z.number(),
  categoryId: z.string(),
})

const updatePossessionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  dateAcquired: z.string().optional(),
  purchasePrice: z.number().optional(),
  categoryId: z.string().optional(),
})

const possessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid possession ID format'),
})

// Get all possessions for user
possessionsRoutes.get('/', async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const items = await listPossessions(userId)

    return c.json(items)
  } catch (error) {
    console.error('Error fetching possessions:', error)
    return c.json(
      {
        error: 'Failed to fetch possessions',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Create a new possession
possessionsRoutes.post('/', zValidator('json', createPossessionSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const data = c.req.valid('json')

    const created = await createPossession({
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : 'generated-id',
      userId,
      dateAcquired: new Date(data.dateAcquired),
    })

    return c.json(created, 201)
  } catch (error) {
    console.error('Error creating possession:', error)
    return c.json(
      {
        error: 'Failed to create possession',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Update a possession
possessionsRoutes.put(
  '/:id',
  zValidator('param', possessionIdParamSchema),
  zValidator('json', updatePossessionSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      throw ForbiddenError('Unauthorized')
    }

    try {
      const { id } = c.req.valid('param')
      const data = c.req.valid('json')

      const updated = await updatePossession({
        ...data,
        id,
        userId,
        dateAcquired: data.dateAcquired ? new Date(data.dateAcquired) : undefined,
      })

      return c.json(updated)
    } catch (error) {
      console.error('Error updating possession:', error)
      return c.json(
        {
          error: 'Failed to update possession',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete a possession
possessionsRoutes.delete('/:id', zValidator('param', possessionIdParamSchema), async (c) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const userId = c.get('userId')
  if (!userId) {
    throw ForbiddenError('Unauthorized')
  }

  try {
    const { id } = c.req.valid('param')

    await deletePossession(id, userId)

    return c.body(null, 204)
  } catch (error) {
    console.error('Error deleting possession:', error)
    return c.json(
      {
        error: 'Failed to delete possession',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
