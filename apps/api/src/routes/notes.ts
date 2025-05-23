import { ContentService, ForbiddenError, TaskMetadataSchema } from '@hominem/utils/services'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'

const contentTagSchema = z.object({
  value: z.string(),
})

const ContentTypeEnum = z.enum(['note', 'task', 'timer', 'journal', 'document'])

const createContentSchema = z.object({
  type: ContentTypeEnum.default('note'),
  content: z.string(),
  title: z.string().optional(),
  tags: z.array(contentTagSchema).optional().default([]),
  taskMetadata: TaskMetadataSchema.optional().nullable(),
  analysis: z.record(z.unknown()).optional(),
})

const updateContentSchema = z.object({
  type: ContentTypeEnum.optional(),
  content: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(contentTagSchema).optional(),
  taskMetadata: TaskMetadataSchema.optional(),
  analysis: z.record(z.unknown()).optional(),
})

const contentIdSchema = z.object({
  id: z.string(),
})

export async function contentRoutes(fastify: FastifyInstance) {
  const contentService = new ContentService()

  // Create new content
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        fastify.log.error('Create content failed: Missing user ID')
        return reply.status(401).send({ error: 'User ID is required' })
      }

      fastify.log.info(`Creating content for user ${userId}`)

      const validationResult = createContentSchema.safeParse(request.body)
      if (!validationResult.success) {
        const validationErrors = validationResult.error.format()
        fastify.log.error({
          msg: 'Create content validation failed',
          userId,
          errors: validationErrors,
        })
        return reply.status(400).send({
          error: 'Invalid content data',
          details: validationErrors,
        })
      }

      const validatedData = validationResult.data

      fastify.log.info({
        msg: 'Attempting to create content',
        userId,
        contentType: validatedData.type,
        contentLength: validatedData.content.length,
        hasTitle: !!validatedData.title,
        tagsCount: validatedData.tags?.length || 0,
      })

      const result = await contentService.create({ ...validatedData, userId })

      fastify.log.info({
        msg: 'Content created successfully',
        userId,
        contentId: result.id,
        contentType: result.type,
      })

      return result
    } catch (error) {
      fastify.log.error({
        msg: 'Create content error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        userId: request.userId,
      })

      if (error instanceof ForbiddenError) {
        // Keep if ForbiddenError is still relevant
        return reply.status(403).send({ error: error.message })
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: error.format(),
        })
      }
      return handleError(error as Error, reply)
    }
  })

  const listContentQuerySchema = z.object({
    types: z.array(ContentTypeEnum).optional(),
    query: z.string().optional(),
    tags: z
      .string()
      .transform((val) => (val ? val.split(',') : undefined))
      .optional(),
  })

  // List content with optional filters
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }

      const { types, query, tags } = listContentQuerySchema.parse(request.query)
      // Call contentService.list with currently supported filters
      const result = await contentService.list(userId, { types, query, tags })
      return result
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Get content by ID
  fastify.get('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }
      const { id } = contentIdSchema.parse(request.params)
      const result = await contentService.getById(id, userId)
      return result
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Update content
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }
      const { id } = contentIdSchema.parse(request.params)
      const validatedData = updateContentSchema.parse(request.body)
      // Ensure ContentInput matches what ContentService.update expects
      const result = await contentService.update({
        ...validatedData,
        id,
        userId,
      })
      return result
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Delete content
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }
      const { id } = contentIdSchema.parse(request.params)
      const result = await contentService.delete(id, userId)
      return result
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })

  // Sync multiple content items
  const syncContentItemSchema = createContentSchema.extend({ id: z.string().optional() })
  const syncContentRequestSchema = z.array(syncContentItemSchema)

  fastify.post('/sync', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        return reply.status(401).send({ error: 'User ID is required' })
      }

      const validationResult = syncContentRequestSchema.safeParse(request.body)
      if (!validationResult.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid sync data', details: validationResult.error.format() })
      }

      const itemsToSync = validationResult.data
      const itemsWithUserId = itemsToSync.map((item) => ({
        ...item,
        userId,
        mentions: [],
        title: !item.title ? null : item.title,
        tags: item.tags || [],
        taskMetadata: !item.taskMetadata ? null : item.taskMetadata,
        analysis: !item.analysis ? null : item.analysis,
      }))

      const result = await contentService.sync(itemsWithUserId, userId)
      return result
    } catch (error) {
      return handleError(error as Error, reply)
    }
  })
}
