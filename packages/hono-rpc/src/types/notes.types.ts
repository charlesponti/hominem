// ============================================================================
// Re-export Database Types (Single Source of Truth)
// ============================================================================

export type {
  Note,
  NoteInsert,
  NoteMention,
  NoteContentType,
  NoteStatus,
  PublishingMetadata,
} from '@hominem/db/types/notes';

export type { NoteAnalysis } from '../schemas/notes.schema';

export type {
  AllContentType,
  ContentTag,
  TaskPriority,
  TaskStatus,
} from '../schemas/notes.schema';

export {
  NoteContentTypeSchema,
  NoteStatusSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
} from '../schemas/notes.schema';

// ============================================================================
// API-Specific Types
// ============================================================================

import type { Note, NoteContentType, NoteStatus, NoteMention, PublishingMetadata } from '@hominem/db/types/notes';
import type { AllContentType, ContentTag, TaskPriority, TaskStatus, NoteAnalysis } from '../schemas/notes.schema';

// Type alias for JSON values
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Backward compatibility alias
export type NoteOutput = Note;

export type { TaskPriority as Priority };

// Task metadata helper type
export type TaskMetadata = {
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
};

// ============================================================================
// Output Types (Inferred from returns - these are optional aliases)
// ============================================================================

export type NotesListOutput = { notes: Note[] };
export type NotesGetOutput = Note;
export type NotesCreateOutput = Note;
export type NotesUpdateOutput = Note;
export type NotesDeleteOutput = Note;
export type NotesPublishOutput = Note;
export type NotesArchiveOutput = Note;
export type NotesVersionsOutput = { versions: Note[] };

export type NotesListInput = {
  types?: NoteContentType[];
  status?: Array<'draft' | 'published' | 'archived'>;
  tags?: string[];
  query?: string;
  since?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeAllVersions?: boolean;
};

// ============================================================================
// CREATE NOTE
// ============================================================================

export type NotesCreateInput = {
  type?: NoteContentType;
  status?: NoteStatus;
  title?: string;
  content: string;
  excerpt?: string;
  tags?: ContentTag[];
  mentions?: NoteMention[];
  publishingMetadata?: PublishingMetadata;
  analysis?: NoteAnalysis;
};

// ============================================================================
// UPDATE NOTE
// ============================================================================

export type NotesUpdateInput = {
  type?: NoteContentType;
  status?: NoteStatus;
  title?: string | null;
  content?: string;
  excerpt?: string | null;
  tags?: ContentTag[] | null;
  publishingMetadata?: PublishingMetadata | null;
  analysis?: NoteAnalysis | null;
};

// ============================================================================
// SYNC NOTES
// ============================================================================

export type NotesSyncItem = {
  id?: string;
  type: NoteContentType;
  status?: NoteStatus;
  title?: string | null;
  content: string;
  excerpt?: string | null;
  tags?: ContentTag[];
  mentions?: NoteMention[];
  publishingMetadata?: PublishingMetadata | null;
  analysis?: NoteAnalysis | null;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  scheduledFor?: string;
};

export type NotesSyncInput = {
  items: NotesSyncItem[];
};

export type NotesSyncOutput = {
  created: number;
  updated: number;
  failed: number;
};
