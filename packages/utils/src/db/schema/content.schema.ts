import { relations, sql } from 'drizzle-orm'
import { foreignKey, index, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import type { ContentStrategy } from '../../schemas/content-strategy.schema'
import { users } from './users.schema'

/**
 * Content types for internet-facing content
 */
export const ContentTypeSchema = z.enum([
  'tweet', // Twitter/X posts
  'essay', // Long-form essays
  'blog_post', // Blog posts
  'social_post', // Generic social media post
  'note', // Personal notes
  'task', // Tasks or to-do items
  'timer', // Time tracking entries
  'journal', // Journal entries
  'document', // General documents
])

export type ContentType = z.infer<typeof ContentTypeSchema>

/**
 * Publishing status for content
 */
export const ContentStatusSchema = z.enum([
  'draft', // Not published yet
  'scheduled', // Scheduled for publishing
  'published', // Live/published
  'archived', // No longer active
  'failed', // Publishing failed
])

export type ContentStatus = z.infer<typeof ContentStatusSchema>

/**
 * Social media metadata for tweets and social posts
 */
export const SocialMediaMetadataSchema = z.object({
  platform: z.string().optional(), // twitter, linkedin, etc.
  externalId: z.string().optional(), // tweet ID, post ID, etc.
  url: z.string().optional(), // Link to published content
  scheduledFor: z.string().optional(), // ISO date for scheduled posts
  publishedAt: z.string().optional(), // ISO date when published
  metrics: z
    .object({
      views: z.number().optional(),
      likes: z.number().optional(),
      reposts: z.number().optional(),
      replies: z.number().optional(),
      clicks: z.number().optional(),
    })
    .optional(),
  threadPosition: z.number().optional(), // Position in thread
  threadId: z.string().optional(), // Thread identifier
  inReplyTo: z.string().optional(), // Reply to which post
})

export type SocialMediaMetadata = z.infer<typeof SocialMediaMetadataSchema>

/**
 * SEO metadata for essays and blog posts
 */
export const SEOMetadataSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional(),
  featuredImage: z.string().optional(),
  excerpt: z.string().optional(),
})

export type SEOMetadata = z.infer<typeof SEOMetadataSchema>

/**
 * Content tag for categorization
 */
export const ContentTagSchema = z.object({
  value: z.string(),
})

export type ContentTag = z.infer<typeof ContentTagSchema>

/**
 * Main content table for internet-facing content
 */
export const content = pgTable(
  'content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull().$type<ContentType>().default('tweet'),
    title: text('title'),
    content: text('content').notNull(),
    excerpt: text('excerpt'), // Short description/summary
    status: text('status').notNull().$type<ContentStatus>().default('draft'),
    tags: json('tags').$type<ContentTag[]>().default([]),
    socialMediaMetadata: json('social_media_metadata').$type<SocialMediaMetadata>(),
    seoMetadata: json('seo_metadata').$type<SEOMetadata>(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    contentStrategyId: uuid('content_strategy_id').references(() => contentStrategies.id),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    publishedAt: timestamp('published_at', { precision: 3, mode: 'string' }),
    scheduledFor: timestamp('scheduled_for', { precision: 3, mode: 'string' }),
  },
  (table) => [
    index('content_search_idx').using(
      'gin',
      sql`(
        setweight(to_tsvector('english', coalesce(${table.title}, '')), 'A') ||
        setweight(to_tsvector('english', ${table.content}), 'B') ||
        setweight(to_tsvector('english', coalesce(${table.excerpt}, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(${sql`${table.tags}::text`}, '')), 'D')
      )`
    ),
    index('content_user_idx').on(table.userId),
    index('content_status_idx').on(table.status),
    index('content_type_idx').on(table.type),
  ]
)

export type Content = typeof content.$inferSelect
export type ContentInsert = typeof content.$inferInsert

/**
 * Relations
 */
export const contentRelations = relations(content, ({ one }) => ({
  user: one(users, {
    fields: [content.userId],
    references: [users.id],
  }),
  contentStrategy: one(contentStrategies, {
    fields: [content.contentStrategyId],
    references: [contentStrategies.id],
  }),
}))

// Content strategies table is defined below in this same file

export const contentStrategies = pgTable(
  'content_strategies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    strategy: json('strategy').$type<ContentStrategy>().notNull(),
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'content_strategies_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)

export const contentStrategiesRelations = relations(contentStrategies, ({ one }) => ({
  user: one(users, {
    fields: [contentStrategies.userId],
    references: [users.id],
  }),
}))

export type ContentStrategiesInsert = typeof contentStrategies.$inferInsert
export type ContentStrategiesSelect = typeof contentStrategies.$inferSelect
