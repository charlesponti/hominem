import { and, desc, eq, or, sql, type SQLWrapper } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import {
  content,
  ContentTypeSchema,
  TaskMetadataSchema,
  type ContentInsert,
  type Content as ContentSchemaType,
} from '../db/schema/notes.schema'

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

const UpdateContentZodSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: ContentTypeSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).nullish(),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.any().optional().nullish(),
})
export type UpdateContentInput = z.infer<typeof UpdateContentZodSchema>

/**
 * - `createdAt` and `updatedAt` they are not included for new items.
 * - `id` is optional as it might be a new item.
 * - `synced` is omitted as server handles it.
 */
type SyncClientItem = Omit<
  ContentSchemaType,
  'id' | 'synced' | 'createdAt' | 'updatedAt' | 'timeTracking'
> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

export { TaskMetadataSchema, TweetMetadataSchema } from './../db/schema/notes.schema'

export class ContentService {
  async create(input: ContentInsert): Promise<ContentSchemaType> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create content')
    }
    const now = new Date().toISOString()
    const contentData: ContentInsert = {
      ...input,
      tags: input.tags === null ? [] : input.tags || [],
      mentions: input.mentions === null ? [] : input.mentions || [],
      taskMetadata: input.taskMetadata === null ? undefined : input.taskMetadata,
      analysis: input.analysis === null ? undefined : input.analysis,
      synced: true,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    }

    const [item] = await db.insert(content).values(contentData).returning()
    if (!item) {
      throw new Error('Failed to create content: No content returned from database')
    }
    return item as ContentSchemaType
  }

  async list(
    userId: string,
    filters?: {
      types?: ContentSchemaType['type'][]
      query?: string
      tags?: string[]
      since?: string
    }
  ): Promise<ContentSchemaType[]> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to list content')
    }
    const conditions: SQLWrapper[] = [eq(content.userId, userId)]

    if (filters?.types && filters.types.length > 0) {
      const typeFilters: SQLWrapper[] = []
      for (const type of filters.types) {
        typeFilters.push(sql`${content.type} = ${type}`)
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
      setweight(to_tsvector('english', coalesce(${content.title}, '')), 'A') ||
      setweight(to_tsvector('english', ${content.content}), 'B') ||
      setweight(to_tsvector('english', coalesce((SELECT string_agg(tag_item->>'value', ' ') FROM json_array_elements(${content.tags}) AS tag_item), '')), 'C')
    )`

    if (ftsQuery) {
      conditions.push(sql`${tsvector_sql} @@ websearch_to_tsquery('english', ${ftsQuery})`)
    }
    // End of Full-Text Search logic

    if (filters?.tags && filters.tags.length > 0) {
      for (const tag of filters.tags) {
        conditions.push(sql`${content.tags}::jsonb @> ${JSON.stringify([{ value: tag }])}::jsonb`)
      }
    }
    if (filters?.since) {
      try {
        const sinceDate = new Date(filters.since).toISOString()
        conditions.push(sql`${content.updatedAt} > ${sinceDate}`)
      } catch (e) {
        console.warn(`Invalid 'since' date format: ${filters.since}`)
      }
    }

    const baseQuery = db
      .select()
      .from(content)
      .where(and(...conditions.filter((c) => !!c)))

    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let orderedQuery
    if (ftsQuery) {
      orderedQuery = baseQuery.orderBy(
        sql`ts_rank_cd(${tsvector_sql}, websearch_to_tsquery('english', ${ftsQuery})) DESC`,
        desc(content.updatedAt)
      )
    } else {
      orderedQuery = baseQuery.orderBy(desc(content.updatedAt))
    }

    const result = await orderedQuery
    return result as ContentSchemaType[]
  }

  async getById(id: string, userId: string): Promise<ContentSchemaType> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to retrieve content')
    }
    const [item] = await db
      .select()
      .from(content)
      .where(and(eq(content.id, id), eq(content.userId, userId)))
      .limit(1)
    if (!item) {
      throw new NotFoundError('Content not found')
    }
    return item as ContentSchemaType
  }

  async update(input: UpdateContentInput): Promise<ContentSchemaType> {
    const validatedInput = UpdateContentZodSchema.parse(input)

    const updateData: Partial<typeof content.$inferInsert> = {}
    if (validatedInput.type !== undefined) updateData.type = validatedInput.type
    if (validatedInput.title !== undefined) updateData.title = validatedInput.title
    if (validatedInput.content !== undefined) updateData.content = validatedInput.content
    if (validatedInput.tags !== undefined)
      updateData.tags = validatedInput.tags === null ? [] : validatedInput.tags
    if (validatedInput.taskMetadata !== undefined)
      updateData.taskMetadata =
        validatedInput.taskMetadata === null ? undefined : validatedInput.taskMetadata
    if (validatedInput.analysis !== undefined)
      updateData.analysis = validatedInput.analysis === null ? undefined : validatedInput.analysis

    if (Object.keys(updateData).length === 0) {
      return this.getById(validatedInput.id, validatedInput.userId)
    }
    updateData.updatedAt = new Date().toISOString()
    updateData.synced = true

    const [item] = await db
      .update(content)
      .set(updateData)
      .where(and(eq(content.id, validatedInput.id), eq(content.userId, validatedInput.userId)))
      .returning()
    if (!item) {
      throw new NotFoundError('Content not found or not authorized to update')
    }
    return item as ContentSchemaType
  }

  async delete(id: string, userId: string): Promise<ContentSchemaType> {
    if (!userId) {
      throw new ForbiddenError('Not authorized to delete content')
    }
    const [item] = await db
      .delete(content)
      .where(and(eq(content.id, id), eq(content.userId, userId)))
      .returning()
    if (!item) {
      throw new NotFoundError('Content not found or not authorized to delete')
    }
    return item as ContentSchemaType
  }

  async sync(itemsToSync: SyncClientItem[], userId: string) {
    if (!userId) {
      throw new ForbiddenError('Not authorized to sync content')
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      items: [] as { id: string; updatedAt: string; type: ContentSchemaType['type'] }[],
    }

    for (const incomingItem of itemsToSync) {
      if (incomingItem.userId !== userId) {
        console.warn(
          `Sync item user ID mismatch or missing. Item ID: ${incomingItem.id || 'new'}, Item UserID: ${incomingItem.userId}, Expected UserID: ${userId}`
        )
        results.failed++
        continue
      }

      try {
        const { id } = incomingItem

        const baseInputData = {
          type: incomingItem.type,
          content: incomingItem.content,
          title: incomingItem.title,
          tags: incomingItem.tags,
          mentions: incomingItem.mentions,
          taskMetadata: incomingItem.taskMetadata,
          analysis: incomingItem.analysis,
          userId, // Use `userId` from the authenticated session.
          createdAt: incomingItem.createdAt,
          updatedAt: incomingItem.updatedAt,
        }

        if (id) {
          const existing = await db.query.content.findFirst({
            where: and(eq(content.id, id), eq(content.userId, userId)),
          })

          if (existing) {
            const clientTimestamp = new Date(
              incomingItem.updatedAt || incomingItem.createdAt || 0
            ).getTime()
            const serverTimestamp = new Date(existing.updatedAt).getTime()

            if (clientTimestamp > serverTimestamp) {
              const updatePayload: UpdateContentInput = {
                id: id,
                userId: userId,
                type: incomingItem.type,
                title: incomingItem.title,
                content: incomingItem.content,
                tags: incomingItem.tags,
                taskMetadata: incomingItem.taskMetadata,
                analysis: incomingItem.analysis,
              }
              const updated = await this.update(updatePayload)
              if (updated?.id && updated?.updatedAt && updated?.type) {
                results.updated++
                results.items.push({
                  id: updated.id,
                  updatedAt: updated.updatedAt,
                  type: updated.type,
                })
              }
            } else {
              if (existing?.id && existing?.updatedAt && existing?.type) {
                results.items.push({
                  id: existing.id,
                  updatedAt: existing.updatedAt,
                  type: existing.type as ContentSchemaType['type'],
                })
              }
            }
          } else {
            const created = await this.create(baseInputData as ContentInsert)
            if (created?.id && created?.updatedAt && created?.type) {
              results.created++
              results.items.push({
                id: created.id,
                updatedAt: created.updatedAt,
                type: created.type,
              })
            }
          }
        } else {
          const created = await this.create(baseInputData as ContentInsert)
          if (created?.id && created?.updatedAt && created?.type) {
            results.created++
            results.items.push({ id: created.id, updatedAt: created.updatedAt, type: created.type })
          }
        }
      } catch (error) {
        console.error(`Error syncing item (Client ID: ${incomingItem.id || 'new'}):`, error)
        results.failed++
      }
    }
    return results
  }
}
