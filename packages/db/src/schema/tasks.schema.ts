import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import * as z from 'zod'

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
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    index('tasks_user_idx').on(table.userId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_date_idx').on(table.dueDate),
  ],
)

export type Task = InferSelectModel<typeof tasks>
export type TaskInsert = InferInsertModel<typeof tasks>
export type TaskSelect = Task
