/**
 * Computed Tag Types
 *
 * This file contains all derived types computed from Tag schema.
 * These types are computed ONCE and reused everywhere.
 *
 * Rule: Import from this file, not from tags.schema.ts
 */

import type { Tag, TagInsert } from './tags.schema';

export type TagOutput = Tag;
export type TagInput = TagInsert;

// Legacy aliases
export type TagSelect = Tag;

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export { tags } from './tags.schema';
