import { ForbiddenError, NotesService } from '@hominem/utils/notes'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { handleError } from '../lib/errors'
import { verifyAuth } from '../middleware/auth'

const createNoteSchema = z.object({
  content: z.string(),
  title: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).optional(),
})

const updateNoteSchema = z.object({
  content: z.string().optional(),
  title: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).optional(),
})

const noteIdSchema = z.object({
  id: z.string(),
})

const querySchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function notesRoutes(fastify: FastifyInstance) {
  const notesService = new NotesService()

  // Create a new note
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) {
        fastify.log.error('Create note failed: Missing user ID')
        reply.code(401)
        return { error: 'User ID is required' }
      }

      fastify.log.info(`Creating note for user ${userId}`)

      // Validate request body and log any parsing errors
      const validationResult = createNoteSchema.safeParse(request.body)
      if (!validationResult.success) {
        const validationErrors = validationResult.error.format()
        fastify.log.error({
          msg: 'Create note validation failed',
          userId,
          errors: validationErrors,
        })
        reply.code(400)
        return {
          error: 'Invalid note data',
          details: validationErrors,
        }
      }

      const validated = validationResult.data

      // Log the note creation attempt with sanitized content length
      fastify.log.info({
        msg: 'Attempting to create note',
        userId,
        contentLength: validated.content.length,
        hasTitle: !!validated.title,
        tagsCount: validated.tags?.length || 0,
      })

      const result = await notesService.create({ ...validated, userId })

      fastify.log.info({
        msg: 'Note created successfully',
        userId,
        noteId: result.id,
      })

      return result
    } catch (error) {
      // Log detailed error information
      fastify.log.error({
        msg: 'Create note error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown',
        userId: request.userId,
      })

      // Handle specific error types with appropriate status codes
      if (error instanceof ForbiddenError) {
        reply.code(403)
        return { error: error.message }
      }

      if (error instanceof z.ZodError) {
        reply.code(400)
        return {
          error: 'Validation failed',
          details: error.format(),
        }
      }

      handleError(error as Error, reply)
    }
  })

  // List all notes for authenticated user
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) throw new Error('User ID is required')

      const { query, tags } = querySchema.parse(request.query)
      const result = await notesService.list(userId, query, tags)
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update a note
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) throw new Error('User ID is required')

      const { id } = noteIdSchema.parse(request.params)
      const validated = updateNoteSchema.parse(request.body)
      const result = await notesService.update({ ...validated, noteId: id, userId })
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete a note
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) throw new Error('User ID is required')

      const { id } = noteIdSchema.parse(request.params)
      const result = await notesService.delete(id, userId)
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Analyze a note
  fastify.post('/:id/analyze', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const userId = request.userId
      if (!userId) throw new Error('User ID is required')

      const { id } = noteIdSchema.parse(request.params)
      const result = await notesService.analyze(id, userId)
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}
