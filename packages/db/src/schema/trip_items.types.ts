/**
 * Computed Trip Item Types
 *
 * This file contains all derived types computed from the Trip Item schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from trip_items.schema.ts
 */

import type { TripItem, TripItemInsert, TripItemSelect } from './trip_items.schema';

export type { TripItem, TripItemInsert, TripItemSelect };

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link TripItem} instead. This alias will be removed in a future version.
 */
export type TripItemOutput = TripItem;

/**
 * @deprecated Use {@link TripItemInsert} instead. This alias will be removed in a future version.
 */
export type TripItemInput = TripItemInsert;
