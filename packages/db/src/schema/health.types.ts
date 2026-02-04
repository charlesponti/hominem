/**
 * Computed Health Types
 *
 * This file contains all derived types computed from the Health schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from health.schema.ts
 */

import type {
  HealthInput,
  HealthOutput,
} from './health.schema';

export type {
  HealthInput,
  HealthOutput,
};

// Backward compatibility aliases
export type HealthInsert = HealthInput;
export type HealthSelect = HealthOutput;
