import { NoteContentTypeSchema, type NoteInsert, TaskMetadataSchema } from '@hominem/data/schema'
import { NotesService } from '@hominem/utils/services'
import type { AnyRouter } from '@trpc/server'
import { z } from 'zod'

const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const CreateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.default('note'),
  title: z.string().optional(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  taskMetadata: TaskMetadataSchema.optional(),
  analysis: z.unknown().optional(),
})

const UpdateNoteInputSchema = z.object({
  id: z.string().uuid(),
  type: NoteContentTypeSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).nullish(),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.unknown().optional().nullish(),
})

const SyncNoteItemSchema = z.object({
  id: z.string().uuid().optional(),
  type: NoteContentTypeSchema,
  title: z.string().nullish(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.unknown().optional().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

type ListInput = {
  types?: z.infer<typeof NoteContentTypeSchema>[]
  query?: string
  tags?: string[]
  since?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Use tRPC's router type - a function that takes a record of routers and returns them
type RouterBuilder = <TProcRouterRecord extends Record<string, AnyRouter>>(
  procRouterRecord: TProcRouterRecord
) => TProcRouterRecord

// Use a generic type for the procedure that matches tRPC's procedure structure
// This allows any procedure builder that has .input(), .query(), and .mutation() methods
type ProtectedProcedure = {
  input: <TInput extends z.ZodType>(
    schema: TInput
  ) => {
    query: <TOutput>(
      fn: (opts: {
        input: z.infer<TInput>
        ctx: { userId?: string; user?: unknown; supabaseId?: string }
      }) => Promise<TOutput> | TOutput
    ) => AnyRouter
    mutation: <TOutput>(
      fn: (opts: {
        input: z.infer<TInput>
        ctx: { userId?: string; user?: unknown; supabaseId?: string }
      }) => Promise<TOutput> | TOutput
    ) => AnyRouter
  }
}

export function createNotesRouter(
  router: RouterBuilder,
  protectedProcedure: ProtectedProcedure
) {
  return router({
    list: protectedProcedure
      .input(
        z.object({
          types: z.array(NoteContentTypeSchema).optional(),
          query: z.string().optional(),
          tags: z.array(z.string()).optional(),
          since: z.string().optional(),
          sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional().default('createdAt'),
          sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
          limit: z.number().int().positive().optional(),
          offset: z.number().int().nonnegative().optional().default(0),
        })
      )
      .query(async (opts: { input: ListInput; ctx: { userId?: string } }) => {
        const { input, ctx } = opts
        const userId = ctx.userId
        if (!userId) {
          throw new Error('User ID is required')
        }

        const notesService = new NotesService()

        try {
          // Get all notes matching filters
          const allNotes = await notesService.list(userId, {
            types: input.types,
            query: input.query,
            tags: input.tags,
            since: input.since,
          })

          // Apply sorting
          const sortedNotes = [...allNotes]
          if (input.sortBy === 'createdAt') {
            sortedNotes.sort((a, b) => {
              const aDate = new Date(a.createdAt).getTime()
              const bDate = new Date(b.createdAt).getTime()
              return input.sortOrder === 'asc' ? aDate - bDate : bDate - aDate
            })
          } else if (input.sortBy === 'updatedAt') {
            sortedNotes.sort((a, b) => {
              const aDate = new Date(a.updatedAt).getTime()
              const bDate = new Date(b.updatedAt).getTime()
              return input.sortOrder === 'asc' ? aDate - bDate : bDate - aDate
            })
          } else if (input.sortBy === 'title') {
            sortedNotes.sort((a, b) => {
              const aTitle = (a.title || '').toLowerCase()
              const bTitle = (b.title || '').toLowerCase()
              const comparison = aTitle.localeCompare(bTitle)
              return input.sortOrder === 'asc' ? comparison : -comparison
            })
          }

          // Apply pagination
          const offset = input.offset || 0
          const limit = input.limit
          const paginatedNotes = limit
            ? sortedNotes.slice(offset, offset + limit)
            : sortedNotes.slice(offset)

          return { notes: paginatedNotes }
        } catch (error) {
          console.error('Error fetching notes:', error)
          throw new Error(
            `Failed to fetch notes: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async (opts: { input: { id: string }; ctx: { userId?: string } }) => {
        const { input, ctx } = opts
        const userId = ctx.userId
        if (!userId) {
          throw new Error('User ID is required')
        }

        const notesService = new NotesService()

        try {
          const note = await notesService.getById(input.id, userId)
          return note
        } catch (error) {
          if (error instanceof Error && error.message === 'Note not found') {
            throw new Error('Note not found')
          }
          console.error('Error fetching note:', error)
          throw new Error(
            `Failed to fetch note: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }),

    create: protectedProcedure.input(CreateNoteInputSchema).mutation(
      async (opts: {
        input: z.infer<typeof CreateNoteInputSchema> & {
          type: z.infer<typeof NoteContentTypeSchema>
        }
        ctx: { userId?: string }
      }) => {
        const { input, ctx } = opts
        const userId = ctx.userId
        if (!userId) {
          throw new Error('User ID is required')
        }

        const notesService = new NotesService()

        try {
          const noteData: NoteInsert = {
            ...input,
            userId,
            tags: input.tags || [],
            mentions: input.mentions || [],
          }
          const newNote = await notesService.create(noteData)
          return newNote
        } catch (error) {
          console.error('Error creating note:', error)
          throw new Error(
            `Failed to create note: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }
    ),

    update: protectedProcedure
      .input(UpdateNoteInputSchema)
      .mutation(
        async (opts: {
          input: z.infer<typeof UpdateNoteInputSchema>
          ctx: { userId?: string }
        }) => {
          const { input, ctx } = opts
          const userId = ctx.userId
          if (!userId) {
            throw new Error('User ID is required')
          }

          const notesService = new NotesService()

          try {
            const updatedNote = await notesService.update({
              ...input,
              userId,
            })
            return updatedNote
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === 'Note not found or not authorized to update'
            ) {
              throw new Error('Note not found or not authorized to update')
            }
            console.error('Error updating note:', error)
            throw new Error(
              `Failed to update note: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }
      ),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async (opts: { input: { id: string }; ctx: { userId?: string } }) => {
        const { input, ctx } = opts
        const userId = ctx.userId
        if (!userId) {
          throw new Error('User ID is required')
        }

        const notesService = new NotesService()

        try {
          const deletedNote = await notesService.delete(input.id, userId)
          return deletedNote
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'Note not found or not authorized to delete'
          ) {
            throw new Error('Note not found or not authorized to delete')
          }
          console.error('Error deleting note:', error)
          throw new Error(
            `Failed to delete note: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      }),

    sync: protectedProcedure
      .input(
        z.object({
          items: z.array(SyncNoteItemSchema),
        })
      )
      .mutation(
        async (opts: {
          input: { items: z.infer<typeof SyncNoteItemSchema>[] }
          ctx: { userId?: string }
        }) => {
          const { input, ctx } = opts
          const userId = ctx.userId
          if (!userId) {
            throw new Error('User ID is required')
          }

          const notesService = new NotesService()

          try {
            // Type assertion needed because SyncNoteItemSchema matches SyncClientItem structure
            const result = await notesService.sync(
              input.items as Parameters<typeof notesService.sync>[0],
              userId
            )
            return result
          } catch (error) {
            console.error('Error syncing notes:', error)
            throw new Error(
              `Failed to sync notes: ${error instanceof Error ? error.message : String(error)}`
            )
          }
        }
      ),
  })
}
