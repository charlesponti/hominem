/**
 * Computed Health Types
 *
 * This file contains all derived types computed from the Health schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from health.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { health } from './health.schema'

// Inferred types from Drizzle schema
export type Health = InferSelectModel<typeof health>
export type HealthInsert = InferInsertModel<typeof health>

// Legacy aliases for backward compatibility
export type HealthOutput = Health
export type HealthInput = HealthInsert
export type HealthSelect = Health

// Re-export tables for convenience
export {
  health,
} from './health.schema'
