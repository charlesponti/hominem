/**
 * Computed Place Types
 *
 * This file contains all derived types computed from the Place schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from places.schema.ts
 */

import type { Place, PlaceInsert, PlaceSelect, WifiInfo } from './places.schema';

export type { Place, PlaceInsert, PlaceSelect, WifiInfo };

// Legacy aliases for backward compatibility
export type PlaceOutput = Place;
export type PlaceInput = PlaceInsert;
