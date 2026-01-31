/**
 * Computed Trip Items Types
 *
 * This file contains all derived types computed from Trip Items schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from trip_items.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { tripItems } from './trip_items.schema'

// Inferred types from Drizzle schema
export type TripItem = InferSelectModel<typeof tripItems>
export type TripItemInsert = InferInsertModel<typeof tripItems>

// Legacy aliases for backward compatibility
export type TripItemOutput = TripItem
export type TripItemInput = TripItemInsert

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  tripItems,
  tripItemsRelations,
} from './trip_items.schema'
