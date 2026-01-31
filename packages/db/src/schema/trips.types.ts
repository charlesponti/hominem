/**
 * Computed Trips Types
 *
 * This file contains all derived types computed from Trips schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from trips.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { trips } from './trips.schema'

// Inferred types from Drizzle schema
export type Trip = InferSelectModel<typeof trips>
export type TripInsert = InferInsertModel<typeof trips>

// Legacy aliases for backward compatibility
export type TripOutput = Trip
export type TripInput = TripInsert

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  trips,
  tripsRelations,
} from './trips.schema'
