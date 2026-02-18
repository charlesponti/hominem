// Force rebuild after schema changes
import { GoalStatusSchema, GoalMilestoneSchema } from '@hominem/db/schema/goals';
import * as z from 'zod';

// ============================================================================
// Database Types - Re-exported from @hominem/db
// ============================================================================

/**
 * Core types imported directly from the database schema.
 * No manual duplication - these are the source of truth.
 */
export type { GoalInsert, GoalSelect, GoalStatus, GoalMilestone } from '@hominem/db/schema/goals';

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
  milestones?: { description: string; isCompleted: boolean }[] | null;
};

// Import EventWithTagsAndPeople for output types (this comes from events service)
import type { EventWithTagsAndPeople } from '@hominem/events-services';

export type GoalListOutput = EventWithTagsAndPeople[];
export type GoalGetOutput = EventWithTagsAndPeople;
export type GoalCreateOutput = EventWithTagsAndPeople;
export type GoalUpdateOutput = EventWithTagsAndPeople;
export type GoalDeleteOutput = { success: true; id: string };
export type GoalArchiveOutput = EventWithTagsAndPeople;
export type GoalOutput = EventWithTagsAndPeople;

/**
 * Alias for GoalOutput - used by frontend components
 */
export type Goal = GoalOutput;
