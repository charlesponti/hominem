/**
 * Computed Tag Types
 *
 * This file contains all derived types computed from Tag schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from tags.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { tags } from './tags.schema'

// Inferred types from Drizzle schema
export type Tag = InferSelectModel<typeof tags>
export type TagInsert = InferInsertModel<typeof tags>

// Legacy aliases for backward compatibility
export type TagSelect = Tag

export type TagOutput = Tag
export type TagInput = TagInsert

// Re-export tables for convenience
export { tags } from './tags.schema'
