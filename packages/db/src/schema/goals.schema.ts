import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { integer, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import * as z from 'zod';

import { createdAtColumn, updatedAtColumn } from './shared.schema';
import { users } from './users.schema';

/**
 * Goal status values
 */
export const GoalStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'archived']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

/**
 * Goal milestone type with completion tracking
 */
export const GoalMilestoneSchema = z.object({
  description: z.string(),
  isCompleted: z.boolean().default(false),
});
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>;

/**
 * Goal table definition
 */
export const goals = pgTable('goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  goalCategory: text('goal_category'),
  status: text('status').notNull().$type<GoalStatus>().default('todo'),
  priority: integer('priority'),
  milestones: json('milestones').$type<GoalMilestone[]>(),
  startDate: timestamp('start_date', { precision: 3, mode: 'string' }),
  dueDate: timestamp('due_date', { precision: 3, mode: 'string' }),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

/**
 * Inferred types from table definition
 */
export type Goal = InferSelectModel<typeof goals>;
export type GoalInsert = InferInsertModel<typeof goals>;
export type GoalSelect = Goal;

/**
 * Zod validation schemas
 */
export const GoalInsertSchema = createInsertSchema(goals, {
  status: z.nativeEnum({ 'todo': 'todo', 'in_progress': 'in_progress', 'completed': 'completed', 'archived': 'archived' }),
});

export const GoalSelectSchema = createSelectSchema(goals, {
  status: z.nativeEnum({ 'todo': 'todo', 'in_progress': 'in_progress', 'completed': 'completed', 'archived': 'archived' }),
});

export type GoalInsertSchemaType = z.infer<typeof GoalInsertSchema>;
export type GoalSelectSchemaType = z.infer<typeof GoalSelectSchema>;
