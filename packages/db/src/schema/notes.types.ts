/**
 * Computed Note Types
 *
 * This file contains all derived types computed from the Note schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from notes.schema.ts
 */

import type {
  Note,
  NoteInsert,
  NoteSelect,
  NoteMention,
  NoteContentType,
  NoteStatus,
  PublishingMetadata,
} from './notes.schema'

export type {
  Note,
  NoteInsert,
  NoteSelect,
  NoteMention,
  NoteContentType,
  NoteStatus,
  PublishingMetadata,
}

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Note} instead. This alias will be removed in a future version.
 */
export type NoteOutput = Note

/**
 * @deprecated Use {@link NoteInsert} instead. This alias will be removed in a future version.
 */
export type NoteInput = NoteInsert

export type NoteSyncItem = Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}
