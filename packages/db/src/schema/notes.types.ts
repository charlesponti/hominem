/**
 * Computed Note Types
 *
 * This file contains all derived types computed from the Note schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from notes.schema.ts
 */

import type { Note, NoteInsert } from './notes.schema';
import {
  NoteContentTypeSchema,
  TaskMetadataSchema,
  TweetMetadataSchema,
  TaskStatusSchema,
  PrioritySchema,
  type NoteMention,
  type TaskMetadata,
  type TweetMetadata,
  type NoteContentType,
  type TaskStatus,
  type Priority,
} from './notes.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Note as retrieved from database */
export type NoteOutput = Note;

/** Note insert input (for creating notes) */
export type NoteInput = NoteInsert;

/** Note sync type for client sync operations */
export type NoteSyncItem = Omit<Note, 'id' | 'synced' | 'createdAt' | 'updatedAt' | 'tweetMetadata'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ============================================
// REPOSITORY / DOMAIN TYPES
// ============================================

export type NoteCreatePayload = NoteInsert;

export type NoteUpdatePayload = Omit<NoteInput, 'userId' | 'id'>;

// ============================================
// RE-EXPORT STABLE ZOD SCHEMAS
// ============================================

// Content schemas
export { NoteContentTypeSchema, TweetMetadataSchema, TaskMetadataSchema, TaskStatusSchema, PrioritySchema };

// Re-export supporting types
export type { NoteMention, TaskMetadata, TweetMetadata, NoteContentType, TaskStatus, Priority };
