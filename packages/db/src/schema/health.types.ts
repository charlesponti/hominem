/**
 * Computed Health Types
 *
 * This file contains all derived types computed from the Health schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from health.schema.ts
 */

import type {
  Health,
  HealthInsert,
  HealthSelect,
  HealthInsertSchemaType,
  HealthSelectSchemaType,
} from './health.schema';

export type {
  Health,
  HealthInsert,
  HealthSelect,
  HealthInsertSchemaType,
  HealthSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type HealthOutput = Health;
export type HealthInput = HealthInsert;
