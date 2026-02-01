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
  completed: z.boolean().default(false),
});
export type GoalMilestone = z.infer<typeof GoalMilestoneSchema>;

/**
 * Goal represents a goal from the database
 * Dates and timestamps are represented as ISO strings
 */
export type Goal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  goalCategory: string | null;
  status: GoalStatus;
  priority: number | null;
  milestones: GoalMilestone[] | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Input Schemas
// ============================================================================

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
// Input Types
// ============================================================================

export type GoalCreateInput = z.infer<typeof GoalCreateInputSchema>;
export type GoalUpdateInput = z.infer<typeof GoalUpdateInputSchema>;
export type GoalListQuery = z.infer<typeof GoalListQuerySchema>;

// ============================================================================
// Output Types
// ============================================================================

export type GoalListOutput = Goal[];
export type GoalGetOutput = Goal;
export type GoalCreateOutput = Goal;
export type GoalUpdateOutput = Goal;
export type GoalDeleteOutput = Goal;
export type GoalArchiveOutput = Goal;
export type GoalOutput = Goal;
