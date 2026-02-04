import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import * as z from 'zod'

import { createdAtColumn, updatedAtColumn } from './shared.schema'
import { users } from './users.schema'

/**
 * Task status values
 */
export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done', 'archived'])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

/**
 * Task priority levels
 */
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export type TaskPriority = z.infer<typeof TaskPrioritySchema>

/**
 * Task table definition
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().$type<TaskStatus>().default('todo'),
    priority: text('priority').notNull().$type<TaskPriority>().default('medium'),
    dueDate: timestamp('due_date', { precision: 3, mode: 'string' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => [
    index('tasks_user_idx').on(table.userId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_date_idx').on(table.dueDate),
  ],
)

/**
 * Inferred types from table definition
 */
export type Task = InferSelectModel<typeof tasks>
export type TaskInsert = InferInsertModel<typeof tasks>
export type TaskSelect = Task

/**
 * Zod validation schemas
 */
export const TaskInsertSchema = createInsertSchema(tasks, {
  status: z.nativeEnum({ 'todo': 'todo', 'in-progress': 'in-progress', 'done': 'done', 'archived': 'archived' }),
  priority: z.nativeEnum({ 'low': 'low', 'medium': 'medium', 'high': 'high', 'urgent': 'urgent' }),
})

export const TaskSelectSchema = createSelectSchema(tasks, {
  status: z.nativeEnum({ 'todo': 'todo', 'in-progress': 'in-progress', 'done': 'done', 'archived': 'archived' }),
  priority: z.nativeEnum({ 'low': 'low', 'medium': 'medium', 'high': 'high', 'urgent': 'urgent' }),
})

export type TaskInsertSchemaType = z.infer<typeof TaskInsertSchema>
export type TaskSelectSchemaType = z.infer<typeof TaskSelectSchema>
