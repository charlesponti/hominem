/**
 * Computed Bookmark Types
 *
 * This file contains all derived types computed from the Bookmark schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from bookmarks.schema.ts
 */

import type { Bookmark, BookmarkInsert } from './bookmarks.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Bookmark as retrieved from database */
export type BookmarkOutput = Bookmark;

/** Bookmark insert input (for creating bookmarks) */
export type BookmarkInput = BookmarkInsert;

// Legacy aliases
export type BookmarkSelect = Bookmark;

// ============================================
// RE-EXPORT DRIZZLE TABLES / RELATIONS
// ============================================

export {
  bookmark,
  bookmarkRelations,
} from './bookmarks.schema';
