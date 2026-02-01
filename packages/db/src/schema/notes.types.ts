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
  TaskStatus,
  Priority,
  TaskMetadata,
  TweetMetadata,
} from './notes.schema';

export type {
  Note,
  NoteInsert,
  NoteSelect,
  NoteMention,
  NoteContentType,
  TaskStatus,
  Priority,
  TaskMetadata,
  TweetMetadata,
};

// Legacy aliases for backward compatibility
export type NoteOutput = Note;
export type NoteInput = NoteInsert;

export type NoteSyncItem = Omit<Note, 'id' | 'synced' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};
