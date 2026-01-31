/**
 * Computed Category Types
 *
 * This file contains all derived types computed from Category schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from categories.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { categories, categoryRelations } from './categories.schema'

// Inferred types from Drizzle schema
export type Category = InferSelectModel<typeof categories>
export type CategoryInsert = InferInsertModel<typeof categories>

// Legacy aliases for backward compatibility
export type CategorySelect = Category

export type CategoryOutput = Category
export type CategoryInput = CategoryInsert

// Re-export tables for convenience
export { categories, categoryRelations } from './categories.schema'
