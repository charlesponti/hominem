import { z } from 'zod';
import type { Goal } from '@hominem/services/types';
import type { JsonSerialized } from './utils';

// ============================================================================
// Data Types
// ============================================================================

export type GoalJson = JsonSerialized<Goal>;

// ============================================================================
// Schemas
// ============================================================================

export const GoalMilestoneSchema = z.object({
  description: z.string(),
  completed: z.boolean().default(false),
});

export const GoalCreateInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).default('todo'),
  priority: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
});

export const GoalUpdateInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
});

export const GoalListQuerySchema = z.object({
  showArchived: z.string().optional(), // boolean string "true" | "false"
  sortBy: z.enum(['priority', 'dueDate', 'createdAt']).optional(),
  category: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

export type GoalCreateInput = z.infer<typeof GoalCreateInputSchema>;
export type GoalUpdateInput = z.infer<typeof GoalUpdateInputSchema>;
export type GoalListQuery = z.infer<typeof GoalListQuerySchema>;

export type GoalListOutput = GoalJson[];
export type GoalGetOutput = GoalJson;
export type GoalCreateOutput = GoalJson;
export type GoalUpdateOutput = GoalJson;
export type GoalDeleteOutput = GoalJson;
export type GoalArchiveOutput = GoalJson;
