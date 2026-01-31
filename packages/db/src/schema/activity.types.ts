/**
 * Computed Activity Types
 *
 * This file contains all derived types computed from the Activity schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from activity.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { activities } from './activity.schema'

// Inferred types from Drizzle schema
export type Activity = InferSelectModel<typeof activities>
export type ActivityInsert = InferInsertModel<typeof activities>

// Legacy aliases for backward compatibility
export type ActivityOutput = Activity
export type ActivityInput = ActivityInsert
export type ActivitySelect = Activity

// Re-export tables for convenience
export {
  activities,
} from './activity.schema'
