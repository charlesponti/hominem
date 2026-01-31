/**
 * Computed Item Types
 *
 * This file contains all derived types computed from Item schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from items.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { item } from './items.schema'

// Inferred types from Drizzle schema
export type Item = InferSelectModel<typeof item>
export type ItemInsert = InferInsertModel<typeof item>

// Legacy aliases for backward compatibility
export type ItemOutput = Item
export type ItemInput = ItemInsert
export type ItemSelect = Item

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  item,
  itemRelations,
} from './items.schema'
