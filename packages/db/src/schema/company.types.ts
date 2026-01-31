/**
 * Computed Company Types
 *
 * This file contains all derived types computed from Company schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from company.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { companies } from './company.schema'

// Inferred types from Drizzle schema
export type Company = InferSelectModel<typeof companies>
export type CompanyInsert = InferInsertModel<typeof companies>

// Legacy aliases for backward compatibility
export type CompanyOutput = Company
export type CompanyInput = CompanyInsert

// Re-export tables for convenience
export {
  companies,
} from './company.schema'
