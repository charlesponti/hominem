import { integer, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { users } from './users.schema'

export const GoalStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'archived'])
export type GoalStatus = z.infer<typeof GoalStatusSchema>

export const GoalMilestoneSchema = z.object({
  description: z.string(),
  completed: z.boolean().default(false),
})
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>

export const GoalSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: GoalStatusSchema.default('todo'),
  priority: z.number().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  goalCategory: text('goal_category'),
  status: text('status').notNull().default('todo'),
  priority: integer('priority'),
  milestones: json('milestones').$type<GoalMilestone[]>(),
  startDate: timestamp('start_date', { precision: 3, mode: 'string' }),
  dueDate: timestamp('due_date', { precision: 3, mode: 'string' }),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, mode: 'string' }).defaultNow().notNull(),
})
export type Goal = typeof goals.$inferSelect
export type GoalInsert = typeof goals.$inferInsert
