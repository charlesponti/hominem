/**
 * Hominem Database Schema Types
 *
 * ARCHITECTURE PRINCIPLE: "Compute Once"
 *
 * This index exports only pre-computed types from .types.ts files.
 * Raw Drizzle table definitions are NOT exported here to prevent
 * expensive re-instantiation of complex generic types.
 *
 * RULE: Import types from this file. If you need raw Drizzle tables,
 * import directly from the .schema.ts file in your repository layer.
 *
 * Example:
 *   // ✅ GOOD: Import stable pre-computed types
 *   import type { NoteOutput, NoteInput } from '@hominem/db/schema';
 *
 *   // ❌ BAD: Imports expensive-to-infer raw Drizzle types
 *   import { notes } from '@hominem/db/schema';
 *   import type { Note, NoteInsert } from '@hominem/db/schema';
 */

// Export computed types from domain .types.ts files
export * from './notes.types';
export * from './content.types';
export * from './finance.types';
export * from './places.types';
export * from './events.types';
export * from './calendar.types';
export * from './lists.types';
export * from './contacts.types';
export * from './users.types';
export * from './tags.types';
export * from './goals.types';
export * from './bookmarks.types';
export * from './possessions.types';
export * from './music.types';
export * from './vector-documents.types';
export * from './career.types';
export * from './company.types';
export * from './chats.types';

// Shared utilities
export type { Json } from './shared.schema';
