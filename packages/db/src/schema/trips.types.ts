/**
 * Computed Trips Types
 *
 * This file contains all derived types computed from Trips schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from trips.schema.ts
 */

import type { Trip, TripInsert } from './trips.schema'

// ============================================
// TRIP TYPES
// ============================================

export type TripOutput = Trip
export type TripInput = TripInsert

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  trips,
  tripsRelations,
} from './trips.schema'
