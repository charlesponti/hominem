import { FastifyInstance } from 'fastify'
import { db } from '@ponti/utils/db'
import { NLPProcessor } from '@ponti/utils/nlp'
import { notes } from '@ponti/utils/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { verifyAuth } from '../middleware/auth'
import { handleError, NotFoundError } from '../utils/errors'

const createNoteSchema = z.object({ 
  content: z.string() 
})

const updateNoteSchema = z.object({
  content: z.string(),
  title: z.string(),
  tags: z.array(z.record(z.string(), z.string())).optional(),
})

const noteIdSchema = z.object({ 
  id: z.string() 
})

export async function notesRoutes(fastify: FastifyInstance) {
  // Create a new note
  fastify.post('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const validated = createNoteSchema.parse(request.body)
      
      const nlpProcessor = new NLPProcessor()
      const analysis = await nlpProcessor.analyzeText(validated.content)

      const result = await db.insert(notes).values({
        analysis,
        content: validated.content,
        userId: request.userId!,
      })
      
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // List all notes for authenticated user
  fastify.get('/', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const result = await db.select().from(notes).where(eq(notes.userId, request.userId!))
      return result
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Update a note
  fastify.put('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const validated = updateNoteSchema.parse(request.body)
      
      const nlpProcessor = new NLPProcessor()
      const analysis = await nlpProcessor.analyzeText(validated.content)

      const result = await db
        .update(notes)
        .set({
          analysis,
          content: validated.content,
          title: validated.title,
          tags: validated.tags,
        })
        .where(and(eq(notes.id, id), eq(notes.userId, request.userId!)))
        .returning()
      
      if (!result.length) {
        throw NotFoundError('Note not found')
      }
      
      return result[0]
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Delete a note
  fastify.delete('/:id', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      const result = await db
        .delete(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, request.userId!)))
        .returning()
      
      if (!result.length) {
        throw NotFoundError('Note not found')
      }
      
      return { success: true }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })

  // Analyze a note
  fastify.post('/:id/analyze', { preHandler: verifyAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      // Get the note
      const noteResult = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, request.userId!)))
        .limit(1)

      if (!noteResult.length) {
        throw NotFoundError('Note not found')
      }

      const note = noteResult[0]

      // Analyze the content
      const nlpProcessor = new NLPProcessor()
      const analysis = await nlpProcessor.analyzeText(note.content)

      // Update the note with the analysis
      await db
        .update(notes)
        .set({ analysis })
        .where(and(eq(notes.id, id), eq(notes.userId, request.userId!)))

      return { analysis }
    } catch (error) {
      handleError(error as Error, reply)
    }
  })
}