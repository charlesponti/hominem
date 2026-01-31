/**
 * Computed Note Types
 *
 * This file contains all derived types computed from the Note schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from notes.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { notes } from './notes.schema'
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
} from './notes.schema'

// Inferred types from Drizzle schema
export type Note = InferSelectModel<typeof notes>
export type NoteInsert = InferInsertModel<typeof notes>

// Legacy aliases for backward compatibility
export type NoteOutput = Note
export type NoteInput = NoteInsert

/** Note sync type for client sync operations */
export type NoteSyncItem = Omit<Note, 'id' | 'synced' | 'createdAt' | 'updatedAt' | 'tweetMetadata'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}

// ============================================
// REPOSITORY / DOMAIN TYPES
// ============================================

export type NoteCreatePayload = NoteInsert

export type NoteUpdatePayload = Omit<NoteInput, 'userId' | 'id'>

// ============================================
// RE-EXPORT STABLE ZOD SCHEMAS
// ============================================

// Content schemas
export { NoteContentTypeSchema, TweetMetadataSchema, TaskMetadataSchema, TaskStatusSchema, PrioritySchema }

// Re-export supporting types
export type { NoteMention, TaskMetadata, TweetMetadata, NoteContentType, TaskStatus, Priority }


