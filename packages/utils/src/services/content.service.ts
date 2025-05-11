import { and, desc, eq, or, sql, type SQLWrapper } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import {
  content,
  type Content as ContentSchemaType,
  ContentTypeSchema,
  TaskMetadataSchema,
  TimeTrackingSchema,
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

export type ContentInput = {
  type: ContentSchemaType['type']
  content: string
  title?: string | null
  tags?: Array<{ value: string }> | null
  taskMetadata?: z.infer<typeof TaskMetadataSchema> | null
  timeTracking?: z.infer<typeof TimeTrackingSchema> | null
  analysis?: ContentSchemaType['analysis']
  userId: string
  createdAt?: string
  updatedAt?: string
}

const UpdateContentZodSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: ContentTypeSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).nullish(),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  timeTracking: TimeTrackingSchema.optional().nullish(),
  analysis: z.any().optional().nullish(),
})
export type UpdateContentInput = z.infer<typeof UpdateContentZodSchema>

// Corrected SyncClientItem type definition
// Making createdAt and updatedAt optional as client might not send them for new items.
// id is optional. synced is omitted as server handles it.
type SyncClientItem = Omit<ContentSchemaType, 'id' | 'synced' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

export class ContentService {
  async create(input: ContentInput): Promise<ContentSchemaType> {
    if (!input.userId) {
      throw new ForbiddenError('Not authorized to create content')
    }
    const now = new Date().toISOString()
    const contentData: typeof content.$inferInsert = {
      type: input.type,
      content: input.content,
      title: input.title,
      tags: input.tags === null ? [] : input.tags || [],
      taskMetadata: input.taskMetadata === null ? undefined : input.taskMetadata,
      timeTracking: input.timeTracking === null ? undefined : input.timeTracking,
      analysis: input.analysis === null ? undefined : input.analysis,
      userId: input.userId,
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
      const typeFilters = []
      for (const type of filters.types) {
        typeFilters.push(sql`${content.type} = ${type}`)
      }
      conditions.push(or(...typeFilters) as SQLWrapper)
    }
    if (filters?.query) {
      const searchQuery = `%${filters.query.toLowerCase()}%`
      conditions.push(
        or(
          sql`lower(coalesce(${content.title}, '')) like ${searchQuery}`,
          sql`lower(${content.content}) like ${searchQuery}`
        ) as SQLWrapper
      )
    }
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
    const result = await db
      .select()
      .from(content)
      .where(and(...conditions.filter((c) => !!c)))
      .orderBy(desc(content.updatedAt))
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
    if (validatedInput.timeTracking !== undefined)
      updateData.timeTracking =
        validatedInput.timeTracking === null ? undefined : validatedInput.timeTracking
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
        // Explicitly cast itemDataWithoutId to ensure all properties of ContentInput are potentially present
        // and then satisfy the ContentInput type for this.create
        const { id } = incomingItem

        // Prepare a base for ContentInput, ensuring all non-optional fields of ContentInput are covered
        // or will be covered by defaults in this.create
        const baseInputData = {
          type: incomingItem.type,
          content: incomingItem.content,
          title: incomingItem.title,
          tags: incomingItem.tags,
          taskMetadata: incomingItem.taskMetadata,
          timeTracking: incomingItem.timeTracking,
          analysis: incomingItem.analysis,
          userId: userId, // ensure userId is from the authenticated session
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
                id: id, // Use the id from the loop
                userId: userId,
                type: incomingItem.type, // incomingItem.type is already ContentSchemaType['type']
                title: incomingItem.title,
                content: incomingItem.content,
                tags: incomingItem.tags,
                taskMetadata: incomingItem.taskMetadata,
                timeTracking: incomingItem.timeTracking,
                analysis: incomingItem.analysis,
              }
              const updated = await this.update(updatePayload)
              results.updated++
              results.items.push({
                id: updated.id,
                updatedAt: updated.updatedAt,
                type: updated.type,
              })
            } else {
              results.items.push({
                id: existing.id,
                updatedAt: existing.updatedAt,
                type: existing.type as ContentSchemaType['type'],
              })
            }
          } else {
            const created = await this.create(baseInputData as ContentInput)
            results.created++
            results.items.push({ id: created.id, updatedAt: created.updatedAt, type: created.type })
          }
        } else {
          const created = await this.create(baseInputData as ContentInput)
          results.created++
          results.items.push({ id: created.id, updatedAt: created.updatedAt, type: created.type })
        }
      } catch (error) {
        console.error(`Error syncing item (Client ID: ${incomingItem.id || 'new'}):`, error)
        results.failed++
      }
    }
    return results
  }
}
