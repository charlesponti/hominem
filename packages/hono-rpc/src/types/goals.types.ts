import { z } from 'zod';

// ============================================================================
// Data Types - Schemas and Types
// ============================================================================

/**
 * Goal status
 */
export const GoalStatusSchema = z.enum(['todo', 'in_progress', 'completed', 'archived']);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

/**
 * Goal milestone
 */
export const GoalMilestoneSchema = z.object({
  description: z.string(),
  isCompleted: z.boolean().default(false),
});
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>;

/**
 * Goal represents a goal from the database via EventWithTagsAndPeople
 * Matches the actual database schema and service return types:
 * - createdAt/updatedAt are strings (timestamp with mode: 'string')
 * - date/dateStart/dateEnd are Date objects (regular timestamps)
 * - status is text, not an enum
 * - milestones is JSON (any type)
 */
export type Goal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  goalCategory: string | null;
  status: string | null;
  priority: number | null;
  milestones: any | null;
  date: Date;
  dateStart: Date | null;
  dateEnd: Date | null;
  targetValue: number | null;
  currentValue: number | null;
  unit: string | null;
  type: string;
  tags?: Array<{ id: string; name: string; color: string | null; description: string | null }> | undefined;
  people?: Array<{ id: string; firstName: string; lastName: string | null }> | undefined;
  createdAt: string; // timestamp with mode: 'string' in DB schema
  updatedAt: string; // timestamp with mode: 'string' in DB schema
};

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
