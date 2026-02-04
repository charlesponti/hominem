// ============================================================================
// Re-exports from @hominem/db/schema (single source of truth)
// ============================================================================

import type {
  NoteContentType,
  NoteMention,
  NoteStatus,
  PublishingMetadata,
} from '@hominem/db/schema/notes';

import type { NoteOutput } from '@hominem/db/types/notes';

import type { ContentTag, AllContentType } from '@hominem/db/schema/shared';

import {
  NoteContentTypeSchema,
  NoteStatusSchema,
} from '@hominem/db/schema/notes';

// Import Task-related types from tasks schema
import type {
  TaskStatus,
  TaskPriority,
} from '@hominem/db/schema/tasks';

import {
  TaskStatusSchema,
  TaskPrioritySchema,
} from '@hominem/db/schema/tasks';

// Alias NoteOutput as Note for API backwards compatibility
export type Note = NoteOutput;
export type { NoteOutput };

// Re-export schemas for validation
export { NoteContentTypeSchema, TaskStatusSchema, TaskPrioritySchema, NoteStatusSchema };

// Re-export types for external consumers
export type { TaskStatus, TaskPriority as Priority, NoteMention, ContentTag, NoteContentType, AllContentType, NoteStatus, PublishingMetadata };

// Backward compatibility alias
export type TaskMetadata = {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
};

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
  analysis?: any | null;
};

export type NotesUpdateOutput = Note;

// ============================================================================
// DELETE NOTE
// ============================================================================

export type NotesDeleteOutput = Note;

// ============================================================================
// PUBLISH NOTE
// ============================================================================

export type NotesPublishOutput = Note;

// ============================================================================
// ARCHIVE NOTE
// ============================================================================

export type NotesArchiveOutput = Note;

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

// ============================================================================
// NOTE VERSIONS
// ============================================================================

export type NotesVersionsOutput = {
  versions: Note[];
};
