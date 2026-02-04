/**
 * Computed Trip Types
 *
 * This file contains all derived types computed from the Trip schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from trips.schema.ts
 */

import type {
  Trip,
  TripInsert,
  TripSelect,
  TripInsertSchemaType,
  TripSelectSchemaType,
} from './trips.schema';

export type {
  Trip,
  TripInsert,
  TripSelect,
  TripInsertSchemaType,
  TripSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type TripOutput = Trip;
export type TripInput = TripInsert;
