/**
 * Computed Bookmark Types
 *
 * This file contains all derived types computed from Bookmark schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from bookmarks.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { bookmark, bookmarkRelations } from './bookmarks.schema'

// Inferred types from Drizzle schema
export type Bookmark = InferSelectModel<typeof bookmark>
export type BookmarkInsert = InferInsertModel<typeof bookmark>

// Legacy aliases for backward compatibility
export type BookmarkSelect = Bookmark

export type BookmarkOutput = Bookmark
export type BookmarkInput = BookmarkInsert

// Re-export tables and relations
export {
  bookmark,
  bookmarkRelations,
} from './bookmarks.schema'
