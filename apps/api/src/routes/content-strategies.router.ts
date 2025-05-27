import { ContentStrategySchema } from '@hominem/utils/schemas'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'
import { ContentStrategiesService } from '../services/content-strategies.service'

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
  id: z.string().uuid(),
})

export async function contentStrategiesRoutes(fastify: FastifyInstance) {
  const contentStrategiesService = new ContentStrategiesService()

  // Create new content strategy
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        fastify.log.error('Create content strategy failed: Missing user ID')
        return reply.status(401).send({ error: 'User ID is required' })
      }

      fastify.log.info(`Creating content strategy for user ${userId}`)

      const validationResult = createContentStrategySchema.safeParse(request.body)
      if (!validationResult.success) {
        const validationErrors = validationResult.error.format()
        fastify.log.error({
          msg: 'Create content strategy validation failed',
          userId,
          errors: validationErrors,
        })
        return reply.status(400).send({
          error: 'Invalid content strategy data',
          details: validationErrors,
        })
      }

      const validatedData = validationResult.data

      fastify.log.info({
        msg: 'Attempting to create content strategy',
        userId,
        title: validatedData.title,
        hasDescription: !!validatedData.description,
      })

      const result = await contentStrategiesService.create({
        ...validatedData,
        userId,
      })

      fastify.log.info({
        msg: 'Content strategy created successfully',
        userId,
        contentStrategyId: result.id,
        title: result.title,
      })

      return reply.status(201).send(result)
    } catch (error) {
      fastify.log.error('Create content strategy error:', error)
      return handleError(error as Error, reply)
    }
  })

  // Get all content strategies for user
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }

      const strategies = await contentStrategiesService.getByUserId(userId)
      return reply.send(strategies)
    } catch (error) {
      fastify.log.error('Get content strategies error:', error)
      return handleError(error as Error, reply)
    }
  })

  // Get specific content strategy by ID
  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }

      const { id } = contentStrategyIdSchema.parse(request.params)
      const strategy = await contentStrategiesService.getById(id, userId)

      if (!strategy) {
        return reply.status(404).send({ error: 'Content strategy not found' })
      }

      return reply.send(strategy)
    } catch (error) {
      fastify.log.error('Get content strategy error:', error)
      return handleError(error as Error, reply)
    }
  })

  // Update content strategy
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }

      const { id } = contentStrategyIdSchema.parse(request.params)

      const validationResult = updateContentStrategySchema.safeParse(request.body)
      if (!validationResult.success) {
        const validationErrors = validationResult.error.format()
        return reply.status(400).send({
          error: 'Invalid content strategy data',
          details: validationErrors,
        })
      }

      const validatedData = validationResult.data
      const result = await contentStrategiesService.update(id, userId, validatedData)

      if (!result) {
        return reply.status(404).send({ error: 'Content strategy not found' })
      }

      fastify.log.info({
        msg: 'Content strategy updated successfully',
        userId,
        contentStrategyId: result.id,
      })

      return reply.send(result)
    } catch (error) {
      fastify.log.error('Update content strategy error:', error)
      return handleError(error as Error, reply)
    }
  })

  // Delete content strategy
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }

      const { id } = contentStrategyIdSchema.parse(request.params)
      const deleted = await contentStrategiesService.delete(id, userId)

      if (!deleted) {
        return reply.status(404).send({ error: 'Content strategy not found' })
      }

      fastify.log.info({
        msg: 'Content strategy deleted successfully',
        userId,
        contentStrategyId: id,
      })

      return reply.status(204).send()
    } catch (error) {
      fastify.log.error('Delete content strategy error:', error)
      return handleError(error as Error, reply)
    }
  })
}
