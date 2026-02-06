/**
 * Computed Tag Types
 *
 * This file contains all derived types computed from the Tag schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from tags.schema.ts
 */

import type { Tag, TagInsert, TagSelect } from './tags.schema';

export type { Tag, TagInsert, TagSelect };

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Tag} instead. This alias will be removed in a future version.
 */
export type TagOutput = Tag;

/**
 * @deprecated Use {@link TagInsert} instead. This alias will be removed in a future version.
 */
export type TagInput = TagInsert;
