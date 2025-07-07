import { relations, sql } from 'drizzle-orm'
import { boolean, index, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { users } from './users.schema'
import { type BaseContentType, BaseContentTypeSchema, type ContentTag } from './shared.schema'

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull().$type<BaseContentType>().default('note'),
    title: text('title'),
    content: text('content').notNull(),
    tags: json('tags').$type<Array<ContentTag>>().default([]),
    mentions: json('mentions').$type<Array<NoteMention> | undefined>().default([]),
    analysis: json('analysis'),
    taskMetadata: json('task_metadata').$type<TaskMetadata>(),
    tweetMetadata: json('tweet_metadata').$type<TweetMetadata>(),
    userId: uuid('userId')
      .notNull()
      .references(() => users.id),
    synced: boolean('synced').default(false),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('notes_search_idx').using(
      'gin',
      sql`(
        setweight(to_tsvector('english', coalesce(${table.title}, '')), 'A') ||
        setweight(to_tsvector('english', ${table.content}), 'B') ||
        setweight(to_tsvector('english', coalesce(${sql`${table.tags}::text`}, '')), 'C')
      )`
    ),
  ]
)

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, {
    fields: [notes.userId],
    references: [users.id],
  }),
}))

export type NoteMention = {
  id: string
  name: string
}

/**
 * ContentType defines the type of personal notes for specialized behavior
 * These are private user notes, not publishable content
 */
export const NoteContentTypeSchema = BaseContentTypeSchema

export type NoteContentType = BaseContentType

/**
 * Task status schema for task-type content
 */
export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done', 'archived'])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

/**
 * Priority levels for tasks
 */
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export type Priority = z.infer<typeof PrioritySchema>

/**
 * Task metadata for task-type content (now includes time tracking fields)
 */
export const TaskMetadataSchema = z.object({
  status: TaskStatusSchema.default('todo'),
  priority: PrioritySchema.default('medium').optional(),
  dueDate: z.string().nullable().optional(),
  startTime: z.string().optional(), // ISO string of when timer was last started
  firstStartTime: z.string().optional(), // ISO string of when timer was first started
  endTime: z.string().optional(), // ISO string of when timer was last stopped
  duration: z.number().optional(),
})

export type TaskMetadata = z.infer<typeof TaskMetadataSchema>

/**
 * Tweet metadata for tweet-type content
 */
export const TweetMetadataSchema = z.object({
  tweetId: z.string().optional(), // Twitter/X tweet ID when posted/imported
  url: z.string().optional(), // Direct URL to the tweet
  status: z.enum(['draft', 'posted', 'failed']).default('draft'),
  postedAt: z.string().optional(), // ISO string of when tweet was posted
  importedAt: z.string().optional(), // ISO string of when tweet was imported
  metrics: z
    .object({
      retweets: z.number().optional(),
      likes: z.number().optional(),
      replies: z.number().optional(),
      views: z.number().optional(),
    })
    .optional(),
  threadPosition: z.number().optional(), // Position in a thread (1-based)
  threadId: z.string().optional(), // ID of the first tweet in a thread
  inReplyTo: z.string().optional(), // Tweet ID this is replying to
})

export type TweetMetadata = z.infer<typeof TweetMetadataSchema>

export type Note = typeof notes.$inferSelect
export type NoteInsert = typeof notes.$inferInsert
