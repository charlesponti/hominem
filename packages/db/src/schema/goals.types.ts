/**
 * Computed Goal Types
 *
 * This file contains all derived types computed from Goal schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from goals.schema.ts
 */

import type { Goal, GoalInsert } from './goals.schema';

export type GoalOutput = Goal;
export type GoalInput = GoalInsert;
