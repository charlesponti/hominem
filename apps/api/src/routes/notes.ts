import { NotesService } from '@ponti/utils/notes'
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
      if (!userId) throw new Error('User ID is required')

      const validated = createNoteSchema.parse(request.body)
      const result = await notesService.create({ ...validated, userId })
      return result
    } catch (error) {
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
