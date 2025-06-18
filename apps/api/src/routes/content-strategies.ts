import { ContentStrategySchema } from '@hominem/utils/schemas'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { ContentStrategiesService } from '../services/content-strategies.service.js'

export const contentStrategiesRoutes = new Hono()

const createContentStrategySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  strategy: ContentStrategySchema,
})

const updateContentStrategySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  strategy: ContentStrategySchema.optional(),
})

const contentStrategyIdSchema = z.object({
  id: z.string().uuid('Invalid content strategy ID format'),
})

const contentStrategiesService = new ContentStrategiesService()

// Create new content strategy
contentStrategiesRoutes.post(
  '/',
  requireAuth,
  zValidator('json', createContentStrategySchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        console.error('Create content strategy failed: Missing user ID')
        return c.json({ error: 'User ID is required' }, 401)
      }

      console.log(`Creating content strategy for user ${userId}`)

      const validatedData = c.req.valid('json')

      console.log({
        msg: 'Attempting to create content strategy',
        userId,
        title: validatedData.title,
        hasDescription: !!validatedData.description,
      })

      const result = await contentStrategiesService.create({
        ...validatedData,
        userId,
      })

      console.log({
        msg: 'Content strategy created successfully',
        userId,
        contentStrategyId: result.id,
        title: result.title,
      })

      return c.json(result, 201)
    } catch (error) {
      console.error('Create content strategy error:', error)
      return c.json(
        {
          error: 'Failed to create content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Get all content strategies for user
contentStrategiesRoutes.get('/', requireAuth, async (c) => {
  try {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 401)
    }

    const strategies = await contentStrategiesService.getByUserId(userId)
    return c.json(strategies)
  } catch (error) {
    console.error('Get content strategies error:', error)
    return c.json(
      {
        error: 'Failed to get content strategies',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Get specific content strategy by ID
contentStrategiesRoutes.get(
  '/:id',
  requireAuth,
  zValidator('param', contentStrategyIdSchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'User ID is required' }, 401)
      }

      const { id } = c.req.valid('param')
      const strategy = await contentStrategiesService.getById(id, userId)

      if (!strategy) {
        return c.json({ error: 'Content strategy not found' }, 404)
      }

      return c.json(strategy)
    } catch (error) {
      console.error('Get content strategy error:', error)
      return c.json(
        {
          error: 'Failed to get content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Update content strategy
contentStrategiesRoutes.put(
  '/:id',
  requireAuth,
  zValidator('param', contentStrategyIdSchema),
  zValidator('json', updateContentStrategySchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'User ID is required' }, 401)
      }

      const { id } = c.req.valid('param')
      const validatedData = c.req.valid('json')

      const result = await contentStrategiesService.update(id, userId, validatedData)

      if (!result) {
        return c.json({ error: 'Content strategy not found' }, 404)
      }

      console.log({
        msg: 'Content strategy updated successfully',
        userId,
        contentStrategyId: result.id,
      })

      return c.json(result)
    } catch (error) {
      console.error('Update content strategy error:', error)
      return c.json(
        {
          error: 'Failed to update content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)

// Delete content strategy
contentStrategiesRoutes.delete(
  '/:id',
  requireAuth,
  zValidator('param', contentStrategyIdSchema),
  async (c) => {
    try {
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'User ID is required' }, 401)
      }

      const { id } = c.req.valid('param')
      const deleted = await contentStrategiesService.delete(id, userId)

      if (!deleted) {
        return c.json({ error: 'Content strategy not found' }, 404)
      }

      console.log({
        msg: 'Content strategy deleted successfully',
        userId,
        contentStrategyId: id,
      })

      return c.body(null, 204)
    } catch (error) {
      console.error('Delete content strategy error:', error)
      return c.json(
        {
          error: 'Failed to delete content strategy',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
