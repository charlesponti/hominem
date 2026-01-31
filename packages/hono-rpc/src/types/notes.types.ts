// ============================================================================
// Re-exports from @hominem/db/types (single source of truth)
// ============================================================================

import type {
  NoteOutput,
  TaskMetadata,
  TaskStatus,
  Priority,
  NoteMention,
  NoteContentType,
} from '@hominem/db/types/notes';

import type { ContentTag, AllContentType } from '@hominem/db/schema/shared';

import {
  NoteContentTypeSchema,
  TaskStatusSchema,
  TaskMetadataSchema,
  PrioritySchema,
} from '@hominem/db/types/notes';

// Alias NoteOutput as Note for API backwards compatibility
export type Note = NoteOutput;
export type { NoteOutput };

// Re-export schemas for validation
export { NoteContentTypeSchema, TaskStatusSchema, TaskMetadataSchema, PrioritySchema };

// Re-export types for external consumers
export type { TaskMetadata, TaskStatus, Priority, NoteMention, ContentTag, NoteContentType, AllContentType };

// ============================================================================
// LIST NOTES
// ============================================================================

export type NotesListInput = {
  types?: AllContentType[];
  tags?: string[];
  query?: string;
  since?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

export type NotesListOutput = { notes: Note[] };

// ============================================================================
// GET NOTE
// ============================================================================

export type NotesGetOutput = Note;

// ============================================================================
// CREATE NOTE
// ============================================================================

export type NotesCreateInput = {
  type?: AllContentType;
  title?: string;
  content: string;
  tags?: Array<{ value: string }>;
  mentions?: Array<{ id: string; name: string }>;
  taskMetadata?: TaskMetadata | undefined;
  analysis?: any;
};

export type NotesCreateOutput = Note;

// ============================================================================
// UPDATE NOTE
// ============================================================================

export type NotesUpdateInput = {
  type?: AllContentType;
  title?: string | null;
  content?: string;
  tags?: Array<{ value: string }>;
  taskMetadata?: TaskMetadata | null | undefined;
  analysis?: any | null;
};

export type NotesUpdateOutput = Note;

// ============================================================================
// DELETE NOTE
// ============================================================================

export type NotesDeleteOutput = Note;

// ============================================================================
// SYNC NOTES
// ============================================================================

export type NotesSyncItem = {
  id?: string;
  type: AllContentType;
  title?: string | null;
  content: string;
  tags?: Array<{ value: string }>;
  mentions?: Array<{ id: string; name: string }>;
  taskMetadata?: TaskMetadata | null;
  analysis?: any | null;
  createdAt?: string;
  updatedAt?: string;
};

export type NotesSyncInput = {
  items: NotesSyncItem[];
};

export type NotesSyncOutput = {
  created: number;
  updated: number;
  failed: number;
};
