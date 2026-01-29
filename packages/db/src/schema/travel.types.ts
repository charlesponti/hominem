/**
 * Computed Travel Types
 *
 * This file contains all derived types computed from Travel schemas.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from trips.schema.ts or trip_items.schema.ts
 */

import type {
  Trip,
  TripInsert,
} from './trips.schema';
import type {
  TripItem,
  TripItemInsert,
} from './trip_items.schema';
import {
  trips,
  tripsRelations,
} from './trips.schema';
import {
  tripItems,
  tripItemsRelations,
} from './trip_items.schema';

export type TripOutput = Trip;
export type TripInput = TripInsert;
export type TripSelect = Trip;

export type TripItemOutput = TripItem;
export type TripItemInput = TripItemInsert;
export type TripItemSelect = TripItem;

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export { trips, tripsRelations } from './trips.schema';
export { tripItems, tripItemsRelations } from './trip_items.schema';
