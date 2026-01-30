/**
 * Computed Trip Items Types
 *
 * This file contains all derived types computed from Trip Items schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from trip_items.schema.ts
 */

import type { TripItem, TripItemInsert } from './trip_items.schema'

// ============================================
// TRIP ITEM TYPES
// ============================================

export type TripItemOutput = TripItem
export type TripItemInput = TripItemInsert

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  tripItems,
  tripItemsRelations,
} from './trip_items.schema'
