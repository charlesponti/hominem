import { db } from '@hominem/data/db'
import {
  type Note,
  NoteContentTypeSchema,
  type NoteInsert,
  notes,
  TaskMetadataSchema,
} from '@hominem/data/schema'
import { and, desc, eq, or, type SQLWrapper, sql } from 'drizzle-orm'
import { z } from 'zod'

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

const UpdateNoteZodSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  type: NoteContentTypeSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).nullish(),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.any().optional().nullish(),
})
export type UpdateNoteInput = z.infer<typeof UpdateNoteZodSchema>

/**
 * - `createdAt` and `updatedAt` they are not included for new items.
 * - `id` is optional as it might be a new item.
 * - `synced` is omitted as server handles it.
 */
type SyncClientItem = Omit<Note, 'id' | 'synced' | 'createdAt' | 'updatedAt' | 'timeTracking'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

export class NotesService {
  async create(input: NoteInsert): Promise<Note> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create note')
    }
    const now = new Date().toISOString()
    const noteData: NoteInsert = {
      ...input,
      tags: input.tags === null ? [] : input.tags || [],
      mentions: input.mentions === null ? [] : input.mentions || [],
      taskMetadata: input.taskMetadata === null ? undefined : input.taskMetadata,
      analysis: input.analysis === null ? undefined : input.analysis,
      synced: true,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    }

    const [item] = await db.insert(notes).values(noteData).returning()
    if (!item) {
      throw new Error('Failed to create note: No note returned from database')
    }
    return item as Note
  }

  async list(
    userId: string,
    filters?: {
      types?: Note['type'][]
      query?: string
      tags?: string[]
      since?: string
    }
  ): Promise<Note[]> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to list notes')
    }
    const conditions: SQLWrapper[] = [eq(notes.userId, userId)]

    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = []
      for (const type of filters.types) {
        typeFilters.push(sql`${notes.type} = ${type}`)
      }
      conditions.push(or(...typeFilters) as SQLWrapper)
    }

    // Full-Text Search logic
    let ftsQuery = ''
    if (filters?.query && filters.query.trim() !== '') {
      ftsQuery = filters.query.trim() // Use websearch_to_tsquery which handles operators like ' & ', ' | '
    }

    // Define the tsvector construction SQL
    // Coalesce is used for title and the tags subquery to handle NULLs gracefully.
    const tsvector_sql = sql`(
      setweight(to_tsvector('english', coalesce(${notes.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${notes.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(tag_item->>'value', ' ') FROM json_array_elements(${notes.tags}) AS tag_item), '')), 'C')
    )`

    if (ftsQuery) {
      conditions.push(sql`${tsvector_sql} @@ websearch_to_tsquery('english', ${ftsQuery})`)
    }
    // End of Full-Text Search logic

    if (filters?.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        conditions.push(sql`${notes.tags}::jsonb @> ${JSON.stringify([{ value: tag }])}::jsonb`)
      }
    }
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since).toISOString()
        conditions.push(sql`${notes.updatedAt} > ${sinceDate}`)
      } catch (_e) {
        console.warn(`Invalid 'since' date format: ${filters.since}`)
      }
    }

    const baseQuery = db
      .select()
      .from(notes)
      .where(and(...conditions.filter((c) => !!c)))

    // biome-ignore lint/suspicious/noImplicitAnyLet: Query type is complex and inferred correctly
    let orderedQuery
    if (ftsQuery) {
      orderedQuery = baseQuery.orderBy(
        sql`ts_rank_cd(${tsvector_sql}, websearch_to_tsquery('english', ${ftsQuery})) DESC`,
        desc(notes.updatedAt)
      )
    } else {
      orderedQuery = baseQuery.orderBy(desc(notes.updatedAt))
    }

    const result = await orderedQuery
    return result as Note[]
  }

  async getById(id: string, userId: string): Promise<Note> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve note')
    }
    const [item] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1)
    if (!item) {
      throw new NotFoundError('Note not found')
    }
    return item as Note
  }

  async update(input: UpdateNoteInput): Promise<Note> {
    const validatedInput = UpdateNoteZodSchema.parse(input)

    const updateData: Partial<typeof notes.$inferInsert> = {}
    if (validatedInput.type !== undefined) {
      updateData.type = validatedInput.type
    }
    if (validatedInput.title !== undefined) {
      updateData.title = validatedInput.title
    }
    if (validatedInput.content !== undefined) {
      updateData.content = validatedInput.content
    }
    if (validatedInput.tags !== undefined) {
      updateData.tags = validatedInput.tags === null ? [] : validatedInput.tags
    }
    if (validatedInput.taskMetadata !== undefined) {
      updateData.taskMetadata =
        validatedInput.taskMetadata === null ? undefined : validatedInput.taskMetadata
    }
    if (validatedInput.analysis !== undefined) {
      updateData.analysis = validatedInput.analysis === null ? undefined : validatedInput.analysis
    }

    if (Object.keys(updateData).length === 0) {
      return this.getById(validatedInput.id, validatedInput.userId)
    }
    updateData.updatedAt = new Date().toISOString()
    updateData.synced = true

    const [item] = await db
      .update(notes)
      .set(updateData)
      .where(and(eq(notes.id, validatedInput.id), eq(notes.userId, validatedInput.userId)))
      .returning()
    if (!item) {
      throw new NotFoundError('Note not found or not authorized to update')
    }
    return item as Note
  }

  async delete(id: string, userId: string): Promise<Note> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete note')
    }
    const [item] = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning()
    if (!item) {
      throw new NotFoundError('Note not found or not authorized to delete')
    }
    return item as Note
  }

  async sync(itemsToSync: SyncClientItem[], userId: string) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to sync notes')
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      items: [] as { id: string; updatedAt: string; type: Note['type'] }[],
    }

    for (const item of itemsToSync) {
      try {
        if (item.id) {
          // Try to update existing item
          try {
            const updatedItem = await this.update({
              id: item.id,
              ...item,
              userId,
            })
            results.updated++
            results.items.push({
              id: updatedItem.id,
              updatedAt: updatedItem.updatedAt,
              type: updatedItem.type,
            })
          } catch (error) {
            if (error instanceof NotFoundError) {
              // Item doesn't exist, create it
              const createdItem = await this.create({
                ...item,
                userId,
                id: item.id,
              })
              results.created++
              results.items.push({
                id: createdItem.id,
                updatedAt: createdItem.updatedAt,
                type: createdItem.type,
              })
            } else {
              throw error
            }
          }
        } else {
          // Create new item
          const createdItem = await this.create({
            ...item,
            userId,
          })
          results.created++
          results.items.push({
            id: createdItem.id,
            updatedAt: createdItem.updatedAt,
            type: createdItem.type,
          })
        }
      } catch (error) {
        console.error('Sync error for item:', item, error)
        results.failed++
      }
    }

    return results
  }
}
