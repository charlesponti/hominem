/**
 * Computed Item Types
 *
 * This file contains all derived types computed from Item schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from items.schema.ts
 */

import type {
  Item,
  ItemInsert,
} from './items.schema';
import {
  item,
  itemRelations,
} from './items.schema';

// ============================================
// ITEM TYPES
// ============================================

export type ItemOutput = Item;
export type ItemInput = ItemInsert;
export type ItemSelect = Item;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  item,
  itemRelations,
} from './items.schema';
