import { z } from 'zod';
import { GoalStatusSchema, GoalMilestoneSchema } from '@hominem/db/schema/goals';

// ============================================================================
// Database Types - Re-exported from @hominem/db
// ============================================================================

/**
 * Core types imported directly from the database schema.
 * No manual duplication - these are the source of truth.
 */
export type {
  Goal,
  GoalInsert,
  GoalSelect,
  GoalStatus,
  GoalMilestone,
} from '@hominem/db/types/goals';

// Import Goal for use in output types
import type { Goal } from '@hominem/db/types/goals';

/**
 * Zod schemas for validation - re-export imported schemas
 */
export { GoalStatusSchema, GoalMilestoneSchema };

// ============================================================================
// Input Schemas
// ============================================================================

export const GoalCreateInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: GoalStatusSchema.default('todo'),
  priority: z.number().int().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
  tags: z.array(z.string()).optional(),
});

export const GoalUpdateInputSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: GoalStatusSchema.optional(),
  priority: z.number().int().optional(),
  dateStart: z.string().optional(),
  dateEnd: z.string().optional(),
  targetValue: z.number().optional(),
  currentValue: z.number().optional(),
  unit: z.string().optional(),
  milestones: z.array(GoalMilestoneSchema).optional(),
});

export const GoalListQuerySchema = z.object({
  status: GoalStatusSchema.optional(),
  category: z.string().optional(),
  sortBy: z.enum(['priority', 'createdAt', 'status']).optional(),
  showArchived: z.string().optional(),
});

// ============================================================================
// Input Types
// ============================================================================

export type GoalCreateInput = z.infer<typeof GoalCreateInputSchema>;
export type GoalUpdateInput = z.infer<typeof GoalUpdateInputSchema>;
export type GoalListQuery = z.infer<typeof GoalListQuerySchema>;

// ============================================================================
// Output Types
// ============================================================================

/**
 * Goal statistics output - matches ConsolidatedGoalStats from service layer
 */
export type GoalStatsOutput = {
  status: string;
  progress: number;
  currentValue: number;
  targetValue: number;
  remaining: number;
  milestones?: unknown;
};

export type GoalListOutput = Goal[];
export type GoalGetOutput = Goal;
export type GoalCreateOutput = Goal;
export type GoalUpdateOutput = Goal;
export type GoalDeleteOutput = { success: true; id: string };
export type GoalArchiveOutput = Goal;
export type GoalOutput = Goal;
