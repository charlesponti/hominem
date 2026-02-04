/**
 * Computed Possession Types
 *
 * This file contains all derived types computed from the Possession schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from possessions.schema.ts
 */

import type {
  Possession,
  PossessionInsert,
  PossessionSelect,
  PossessionInsertSchemaType,
  PossessionSelectSchemaType,
} from './possessions.schema';

export type {
  Possession,
  PossessionInsert,
  PossessionSelect,
  PossessionInsertSchemaType,
  PossessionSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type PossessionOutput = Possession;
export type PossessionInput = PossessionInsert;
