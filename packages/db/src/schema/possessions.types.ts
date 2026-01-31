/**
 * Computed Possession Types
 *
 * This file contains all derived types computed from the Possession schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from possessions.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { possessions } from './possessions.schema'

// Inferred types from Drizzle schema
export type Possession = InferSelectModel<typeof possessions>
export type PossessionInsert = InferInsertModel<typeof possessions>

// Legacy aliases for backward compatibility
export type PossessionOutput = Possession
export type PossessionInput = PossessionInsert
export type PossessionSelect = Possession


