/**
 * Computed Goal Types
 *
 * This file contains all derived types computed from Goal schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from goals.schema.ts
 */

import type { Goal, GoalInsert, GoalMilestone, GoalStatus } from './goals.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Goal as retrieved from database */
export type GoalOutput = Goal;

/** Goal insert input (for creating goals) */
export type GoalInput = GoalInsert;

// Legacy aliases
export type GoalSelect = Goal;

// Re-export original interfaces to avoid duplication errors
export type { Goal, GoalInsert };

// ============================================
// RE-EXPORT SUPPORTING TYPES
// ============================================

export type { GoalMilestone, GoalStatus };

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export { goals } from './goals.schema';
