/**
 * Computed Place Types
 *
 * This file contains all derived types computed from Place schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from places.schema.ts
 */

import type { Place, PlaceInsert } from './places.schema';
import {
  place,
  placeRelations,
} from './places.schema';

// ============================================
// PLACE TYPES
// ============================================

export type PlaceOutput = Place;
export type PlaceInput = PlaceInsert;
export type PlaceSelect = Place;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export {
  place,
  placeRelations,
} from './places.schema';
