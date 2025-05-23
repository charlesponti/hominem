import { boolean, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm/relations'
import { z } from 'zod'
import { users } from './users.schema'

/**
 * This schema stores all types of content (notes, tasks, timers, etc.)
 */
export const content = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull().$type<ContentType>().default('note'),
  title: text('title'),
  content: text('content').notNull(),
  tags: json('tags').$type<Array<ContentTag>>().default([]),
  mentions: json('mentions').$type<Array<NoteMention> | undefined>().default([]),
  analysis: json('analysis'),
  taskMetadata: json('task_metadata').$type<TaskMetadata>(),
  userId: uuid('userId')
    .notNull()
    .references(() => users.id),
  synced: boolean('synced').default(false),
  createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
})

export const contentRelations = relations(content, ({ one }) => ({
  user: one(users, {
    fields: [content.userId],
    references: [users.id],
  }),
}))

export type NoteMention = {
  id: string
  name: string
}

/**
 * Define the tag type that's used across the application
 */
export const ContentTagSchema = z.object({
  value: z.string(),
})

export type ContentTag = z.infer<typeof ContentTagSchema>

/**
 * ContentType defines the type of content for specialized behavior
 * This allows us to extend with new content types without creating new data silos
 */
export const ContentTypeSchema = z.enum([
  'note', // Standard note
  'task', // Task with status tracking
  'timer', // Time-trackable task
  'journal', // Journal entry
  'document', // Longer form document
])

export type ContentType = z.infer<typeof ContentTypeSchema>

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

export type Content = typeof content.$inferSelect
export type ContentInsert = typeof content.$inferInsert
