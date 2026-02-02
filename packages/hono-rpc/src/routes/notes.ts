import { NoteContentTypeSchema, NoteStatusSchema } from '@hominem/db/schema/notes'
import { AllContentTypeSchema, type AllContentType } from '@hominem/db/schema/shared'
import type { NoteInput, PublishingMetadata } from '@hominem/db/types/notes'
import { NotesService } from '@hominem/notes-services'
import { NotFoundError, ValidationError, InternalError } from '@hominem/services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

import type {
  NotesListOutput,
  NotesGetOutput,
  NotesCreateOutput,
  NotesUpdateOutput,
  NotesDeleteOutput,
  NotesSyncOutput,
  NoteOutput,
  NotesPublishOutput,
  NotesArchiveOutput,
  NotesVersionsOutput,
} from '../types/notes.types'

import { authMiddleware, type AppContext } from '../middleware/auth'

const notesService = new NotesService()

/**
 * Serialization Helpers
 */
function serializeNote(n: any): NoteOutput {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    status: n.status || 'draft',
    title: n.title,
    content: n.content,
    excerpt: n.excerpt,
    tags: n.tags || [],
    mentions: n.mentions || [],
    publishingMetadata: n.publishingMetadata,
    analysis: n.analysis,
    isLatestVersion: n.isLatestVersion ?? true,
    parentNoteId: n.parentNoteId,
    versionNumber: n.versionNumber ?? 1,
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : n.createdAt.toISOString(),
    updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : n.updatedAt.toISOString(),
    publishedAt: n.publishedAt
      ? typeof n.publishedAt === 'string'
        ? n.publishedAt
        : n.publishedAt.toISOString()
      : null,
    scheduledFor: n.scheduledFor
      ? typeof n.scheduledFor === 'string'
        ? n.scheduledFor
        : n.scheduledFor.toISOString()
      : null,
  }
}

const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
})

const CreateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.default('note'),
  status: NoteStatusSchema.default('draft').optional(),
  title: z.string().optional(),
  content: z.string(),
  excerpt: z.string().optional(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  publishingMetadata: z.any().optional(),
  analysis: z.unknown().optional(),
})

const UpdateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.optional(),
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  excerpt: z.string().nullish(),
  tags: z.array(z.object({ value: z.string() })).nullish(),
  publishingMetadata: z.any().optional().nullish(),
  analysis: z.unknown().optional().nullish(),
})

const SyncNoteItemSchema = z.object({
  id: z.uuid().optional(),
  type: NoteContentTypeSchema,
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string(),
  excerpt: z.string().nullish(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  publishingMetadata: z.any().optional().nullish(),
  analysis: z.unknown().optional().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  scheduledFor: z.string().optional(),
})

const notesListQuerySchema = z.object({
  types: z.string().optional(),
  status: z.string().optional(),
  tags: z.string().optional(),
  query: z.string().optional(),
  since: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  includeAllVersions: z.string().optional(),
})

const publishNoteSchema = z.object({
  platform: z.string().optional(),
  url: z.string().optional(),
  externalId: z.string().optional(),
  scheduledFor: z.string().optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      canonicalUrl: z.string().optional(),
      featuredImage: z.string().optional(),
    })
    .optional(),
})

export const notesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List notes - returns only latest versions by default
  .get('/', zValidator('query', notesListQuerySchema), async (c) => {
    const userId = c.get('userId')!
    const queryParams = c.req.valid('query')

    const types = queryParams.types
      ?.split(',')
      .filter((t): t is AllContentType => AllContentTypeSchema.safeParse(t).success)
    const status = queryParams.status?.split(',').filter((s) => ['draft', 'published', 'archived'].includes(s)) as
      | ('draft' | 'published' | 'archived')[]
      | undefined
    const tags = queryParams.tags?.split(',')
    const sortBy = queryParams.sortBy || 'createdAt'
    const sortOrder = queryParams.sortOrder || 'desc'
    const limit = queryParams.limit ? parseInt(queryParams.limit) : undefined
    const offset = queryParams.offset ? parseInt(queryParams.offset) : 0
    const includeAllVersions = queryParams.includeAllVersions === 'true'

    // Use getLatestNotes by default, or query for all versions if requested
    const { notes: allNotes } = includeAllVersions
      ? await notesService.query(userId, {
          types,
          status,
          query: queryParams.query,
          tags,
          since: queryParams.since,
        })
      : await notesService.getLatestNotes(userId, {
          types,
          status,
          query: queryParams.query,
          tags,
          since: queryParams.since,
        })

    // Apply sorting
    const sortedNotes = [...allNotes]
    if (sortBy === 'createdAt') {
      sortedNotes.sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime()
        const bDate = new Date(b.createdAt).getTime()
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
      })
    } else if (sortBy === 'updatedAt') {
      sortedNotes.sort((a, b) => {
        const aDate = new Date(a.updatedAt).getTime()
        const bDate = new Date(b.updatedAt).getTime()
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
      })
    } else if (sortBy === 'title') {
      sortedNotes.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase()
        const bTitle = (b.title || '').toLowerCase()
        const comparison = aTitle.localeCompare(bTitle)
        return sortOrder === 'asc' ? comparison : -comparison
      })
    }

    // Apply pagination
    const paginatedNotes = limit ? sortedNotes.slice(offset, offset + limit) : sortedNotes.slice(offset)

    return c.json<NotesListOutput>({ notes: paginatedNotes.map(serializeNote) })
  })

  // Get note by ID
  .get('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const note = await notesService.getById(id, userId)
    if (!note) {
      throw new NotFoundError('Note not found')
    }
    return c.json<NotesGetOutput>(serializeNote(note))
  })

  // Get all versions of a note
  .get('/:id/versions', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const versions = await notesService.getNoteVersions(id, userId)
    return c.json<NotesVersionsOutput>({ versions: versions.map(serializeNote) })
  })

  // Create note
  .post('/', zValidator('json', CreateNoteInputSchema), async (c) => {
    const userId = c.get('userId')!
    const data = c.req.valid('json')

    const noteData: NoteInput = {
      ...data,
      userId,
      tags: data.tags || [],
      mentions: data.mentions || [],
    }
    const newNote = await notesService.create(noteData)
    return c.json<NotesCreateOutput>(serializeNote(newNote), 201)
  })

  // Update note
  .patch('/:id', zValidator('json', UpdateNoteInputSchema), async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')
    const data = c.req.valid('json')

    const updatedNote = await notesService.update({
      id,
      ...data,
      userId,
    })
    return c.json<NotesUpdateOutput>(serializeNote(updatedNote))
  })

  // Delete note
  .delete('/:id', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const deletedNote = await notesService.delete(id, userId)
    return c.json<NotesDeleteOutput>(serializeNote(deletedNote))
  })

  // Publish note
  .post('/:id/publish', zValidator('json', publishNoteSchema), async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')
    const data = c.req.valid('json')

    const publishedNote = await notesService.publish(id, userId, {
      ...(data.platform && { platform: data.platform }),
      ...(data.url && { url: data.url }),
      ...(data.externalId && { externalId: data.externalId }),
      ...(data.scheduledFor && { scheduledFor: data.scheduledFor }),
      ...(data.seo && { seo: data.seo }),
    } as Parameters<typeof notesService.publish>[2])
    return c.json<NotesPublishOutput>(serializeNote(publishedNote))
  })

  // Archive note
  .post('/:id/archive', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const archivedNote = await notesService.archive(id, userId)
    return c.json<NotesArchiveOutput>(serializeNote(archivedNote))
  })

  // Unpublish note
  .post('/:id/unpublish', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const unpublishedNote = await notesService.unpublish(id, userId)
    return c.json<NotesUpdateOutput>(serializeNote(unpublishedNote))
  })

  // Expand note with AI
  .post('/:id/expand', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const expandedNote = await notesService.developNote(id, userId, 'expand')
    return c.json<NotesUpdateOutput>(serializeNote(expandedNote))
  })

  // Outline note with AI
  .post('/:id/outline', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const outlinedNote = await notesService.developNote(id, userId, 'outline')
    return c.json<NotesUpdateOutput>(serializeNote(outlinedNote))
  })

  // Rewrite note with AI
  .post('/:id/rewrite', async (c) => {
    const userId = c.get('userId')!
    const id = c.req.param('id')

    const rewrittenNote = await notesService.developNote(id, userId, 'rewrite')
    return c.json<NotesUpdateOutput>(serializeNote(rewrittenNote))
  })

  // Sync notes
  .post(
    '/sync',
    zValidator('json', z.object({ items: z.array(SyncNoteItemSchema) })),
    async (c) => {
      const userId = c.get('userId')!
      const { items } = c.req.valid('json')

      const result = await notesService.sync(
        items as Parameters<typeof notesService.sync>[0],
        userId,
      )
      return c.json<NotesSyncOutput>(result)
    },
  )
