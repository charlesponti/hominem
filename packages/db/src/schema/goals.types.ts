/**
 * Computed Goal Types
 *
 * This file contains all derived types computed from Goal schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from goals.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { goals } from './goals.schema'
import type { GoalMilestone, GoalStatus } from './goals.schema'

// Inferred types from Drizzle schema
export type Goal = InferSelectModel<typeof goals>
export type GoalInsert = InferInsertModel<typeof goals>

// Legacy aliases for backward compatibility
export type GoalOutput = Goal
export type GoalInput = GoalInsert
export type GoalSelect = Goal

// ============================================
// RE-EXPORT SUPPORTING TYPES
// ============================================

export type { GoalMilestone, GoalStatus }


