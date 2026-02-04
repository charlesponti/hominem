import { type InferInsertModel, type InferSelectModel, sql } from 'drizzle-orm'
import { foreignKey, index, json, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import * as z from 'zod'

import { type AllContentType, AllContentTypeSchema, type ContentTag } from './shared.schema'
import { users } from './users.schema'

/**
 * Publishing status for notes
 */
export const NoteStatusSchema = z.enum([
  'draft', // Default, work in progress
  'published', // Live/published to a platform
  'archived', // No longer active but preserved
])

export type NoteStatus = z.infer<typeof NoteStatusSchema>

/**
 * Publishing metadata consolidates all platform-specific data
 * Replaces tweetMetadata and content table metadata
 */
export const PublishingMetadataSchema = z.object({
  // Platform identification
  platform: z.string().optional(), // twitter, linkedin, medium, etc.
  url: z.string().optional(), // Direct URL to published content
  externalId: z.string().optional(), // Platform-specific ID (tweet ID, post ID, etc.)

  // SEO metadata
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      canonicalUrl: z.string().optional(),
      featuredImage: z.string().optional(),
    })
    .optional(),

  // Engagement metrics
  metrics: z
    .object({
      views: z.number().optional(),
      likes: z.number().optional(),
      reposts: z.number().optional(),
      replies: z.number().optional(),
      clicks: z.number().optional(),
    })
    .optional(),

  // Thread/series information
  threadPosition: z.number().optional(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),

  // Scheduling
  scheduledFor: z.string().optional(), // ISO date string

  // Import tracking
  importedAt: z.string().optional(),
  importedFrom: z.string().optional(),
})

export type PublishingMetadata = z.infer<typeof PublishingMetadataSchema>

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull().$type<AllContentType>().default('note'),
    status: text('status').notNull().$type<NoteStatus>().default('draft'),
    title: text('title'),
    content: text('content').notNull(),
    excerpt: text('excerpt'), // Short preview/SEO excerpt
    tags: json('tags').$type<Array<ContentTag>>().default([]),
    mentions: json('mentions').$type<Array<NoteMention> | undefined>().default([]),
    analysis: json('analysis'),
    publishingMetadata: json('publishing_metadata').$type<PublishingMetadata>(),
    // Version tracking
    parentNoteId: uuid('parent_note_id'),
    versionNumber: integer('version_number').default(1).notNull(),
    isLatestVersion: boolean('is_latest_version').default(true).notNull(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    publishedAt: timestamp('publishedAt', { precision: 3, mode: 'string' }),
    scheduledFor: timestamp('scheduledFor', { precision: 3, mode: 'string' }),
  },
  (table) => [
    index('notes_search_idx').using(
      'gin',
      sql`(
        setweight(to_tsvector('english', coalesce(${table.title}, '')), 'A') ||
        setweight(to_tsvector('english', ${table.content}), 'B') ||
        setweight(to_tsvector('english', coalesce(${sql`${table.tags}::text`}, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(${table.excerpt}, '')), 'D')
      )`,
    ),
    index('notes_status_idx').on(table.status),
    index('notes_type_idx').on(table.type),
    index('notes_user_idx').on(table.userId),
    index('notes_published_at_idx').on(table.publishedAt),
    index('notes_parent_idx').on(table.parentNoteId),
    index('notes_latest_idx').on(table.isLatestVersion),
    index('notes_version_idx').on(table.parentNoteId, table.versionNumber),
    foreignKey({
      columns: [table.parentNoteId],
      foreignColumns: [table.id],
      name: 'notes_parent_fk',
    }).onDelete('cascade'),
  ],
)

export type NoteMention = {
  id: string
  name: string
}

/**
 * ContentType defines the type of personal notes for specialized behavior
 * These can include both base types and publishing types
 */
export const NoteContentTypeSchema = AllContentTypeSchema

export type NoteContentType = AllContentType

export type Note = InferSelectModel<typeof notes>
export type NoteInsert = InferInsertModel<typeof notes>
export type NoteSelect = Note
