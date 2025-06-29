import { db } from '@hominem/utils/db'
import { notes } from '@hominem/utils/schema'
import { TRPCError } from '@trpc/server'
import { and, asc, desc, eq, gte, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, router } from '../index'

// Input schemas
const createNoteSchema = z.object({
  type: z.enum(['note', 'task', 'timer', 'journal', 'document']).default('note'),
  title: z.string().optional(),
  content: z.string(),
  tags: z.array(z.object({ value: z.string() })).optional().default([]),
  mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional().default([]),
  taskMetadata: z.object({
    status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
    dueDate: z.string().nullable().optional(),
    startTime: z.string().optional(),
    firstStartTime: z.string().optional(),
    endTime: z.string().optional(),
    duration: z.number().optional(),
  }).optional(),
})

const updateNoteSchema = z.object({
  type: z.enum(['note', 'task', 'timer', 'journal', 'document']).optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).optional(),
  mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  taskMetadata: z.object({
    status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
    dueDate: z.string().nullable().optional(),
    startTime: z.string().optional(),
    firstStartTime: z.string().optional(),
    endTime: z.string().optional(),
    duration: z.number().optional(),
  }).optional(),
})

const listNotesSchema = z.object({
  types: z.array(z.enum(['note', 'task', 'timer', 'journal', 'document'])).optional(),
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  since: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
})

export const notesRouter = router({
  list: protectedProcedure
    .input(listNotesSchema)
    .query(async ({ ctx, input }) => {
      const { types, query, tags, since, sortBy, sortOrder, limit, offset } = input
      const whereClauses = [eq(notes.userId, ctx.userId)]

      // Filter by types
      if (types && types.length > 0) {
        whereClauses.push(inArray(notes.type, types))
      }

      // Filter by query (search in title and content)
      if (query) {
        const searchCondition = or(
          ilike(notes.title, `%${query}%`),
          ilike(notes.content, `%${query}%`)
        )
        if (searchCondition) {
          whereClauses.push(searchCondition)
        }
      }

      // Filter by tags - simplified for now
      // TODO: Implement proper JSON tag searching
      if (tags && tags.length > 0) {
        // For now, we'll skip tag filtering as it requires more complex JSON operations
        // This can be improved later with proper JSON path queries
      }

      // Filter by date
      if (since) {
        whereClauses.push(gte(notes.createdAt, since))
      }

      // Build order by clause
      const orderBy = sortOrder === 'asc' 
        ? [asc(notes[sortBy])]
        : [desc(notes[sortBy])]

      const userNotes = await db
        .select()
        .from(notes)
        .where(and(...whereClauses))
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset)

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notes)
        .where(and(...whereClauses))

      return {
        notes: userNotes,
        total: count,
        hasMore: count > offset + limit,
      }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [note] = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)))
      
      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        })
      }
      
      return note
    }),

  create: protectedProcedure
    .input(createNoteSchema)
    .mutation(async ({ input, ctx }) => {
      const [note] = await db
        .insert(notes)
        .values({
          ...input,
          userId: ctx.userId,
          synced: true,
        })
        .returning()
      
      return note
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: updateNoteSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input
      
      const [note] = await db
        .update(notes)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(notes.id, id), eq(notes.userId, ctx.userId)))
        .returning()
      
      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        })
      }
      
      return note
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const [note] = await db
        .delete(notes)
        .where(and(eq(notes.id, input.id), eq(notes.userId, ctx.userId)))
        .returning()
      
      if (!note) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Note not found',
        })
      }
      
      return { success: true, message: 'Note deleted successfully' }
    }),

  sync: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        id: z.string().uuid().optional(),
        type: z.enum(['note', 'task', 'timer', 'journal', 'document']),
        title: z.string().optional(),
        content: z.string(),
        tags: z.array(z.object({ value: z.string() })).optional(),
        mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
        taskMetadata: z.object({
          status: z.enum(['todo', 'in-progress', 'done', 'archived']).default('todo'),
          priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium').optional(),
          dueDate: z.string().nullable().optional(),
          startTime: z.string().optional(),
          firstStartTime: z.string().optional(),
          endTime: z.string().optional(),
          duration: z.number().optional(),
        }).optional(),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const { items } = input
      const results: Array<{
        id: string
        action: string
        success: boolean
        error?: string
      }> = []

      for (const item of items) {
        try {
          if (item.id) {
            // Update existing note
            const [note] = await db
              .update(notes)
              .set({
                ...item,
                updatedAt: new Date().toISOString(),
              })
              .where(and(eq(notes.id, item.id), eq(notes.userId, ctx.userId)))
              .returning()
            
            if (note) {
              results.push({ id: note.id, action: 'updated', success: true })
            } else {
              results.push({ id: item.id, action: 'updated', success: false, error: 'Note not found' })
            }
          } else {
            // Create new note
            const [note] = await db
              .insert(notes)
              .values({
                ...item,
                userId: ctx.userId,
                synced: true,
              })
              .returning()
            
            results.push({ id: note.id, action: 'created', success: true })
          }
        } catch (error) {
          results.push({ 
            id: item.id || 'unknown', 
            action: item.id ? 'updated' : 'created', 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      return {
        results,
        summary: {
          total: items.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
        },
      }
    }),
}) 
