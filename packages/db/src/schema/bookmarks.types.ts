/**
 * Computed Bookmark Types
 *
 * This file contains all derived types computed from the Bookmark schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from bookmarks.schema.ts
 */

import type { Bookmark, BookmarkInsert, BookmarkSelect } from './bookmarks.schema';

export type { Bookmark, BookmarkInsert, BookmarkSelect };

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Bookmark} instead. This alias will be removed in a future version.
 */
export type BookmarkOutput = Bookmark;

/**
 * @deprecated Use {@link BookmarkInsert} instead. This alias will be removed in a future version.
 */
export type BookmarkInput = BookmarkInsert;
