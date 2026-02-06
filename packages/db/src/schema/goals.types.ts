/**
 * Computed Goal Types
 *
 * This file contains all derived types computed from the Goal schema.
 * These types are inferred from Drizzle ORM schema definitions and Zod validation schemas.
 *
 * Rule: Import from this file, not from goals.schema.ts
 */

import type { Goal, GoalInsert, GoalSelect, GoalStatus, GoalMilestone, GoalInsertSchemaType, GoalSelectSchemaType } from './goals.schema';

export type { Goal, GoalInsert, GoalSelect, GoalStatus, GoalMilestone, GoalInsertSchemaType, GoalSelectSchemaType };

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Goal} instead. This alias will be removed in a future version.
 */
export type GoalOutput = Goal;

/**
 * @deprecated Use {@link GoalInsert} instead. This alias will be removed in a future version.
 */
export type GoalInput = GoalInsert;
