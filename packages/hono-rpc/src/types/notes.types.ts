import { z } from 'zod';

// ============================================================================
// Data Types - Enums and Schemas
// ============================================================================

/**
 * Base content types
 */
export const BaseContentTypeSchema = z.enum(['note', 'bookmark', 'tweet', 'linkedin']);
export type BaseContentType = z.infer<typeof BaseContentTypeSchema>;

/**
 * Publishing content types
 */
export const PublishingContentTypeSchema = z.enum(['tweet', 'linkedin', 'newsletter']);
export type PublishingContentType = z.infer<typeof PublishingContentTypeSchema>;

/**
 * All possible content types
 */
export const AllContentTypeSchema = z.union([BaseContentTypeSchema, PublishingContentTypeSchema]);
export type AllContentType = z.infer<typeof AllContentTypeSchema>;

/**
 * Task status for task-type notes
 */
export const TaskStatusSchema = z.enum(['todo', 'in-progress', 'done', 'archived']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/**
 * Priority levels for tasks
 */
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Task metadata for task-type content
 */
export const TaskMetadataSchema = z.object({
  status: TaskStatusSchema.default('todo'),
  priority: PrioritySchema.default('medium').optional(),
  dueDate: z.string().nullable().optional(),
  startTime: z.string().optional(),
  firstStartTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().optional(),
});
export type TaskMetadata = z.infer<typeof TaskMetadataSchema>;

/**
 * Note mention (reference to another user/person)
 */
export type NoteMention = {
  id: string;
  name: string;
};

/**
 * Content tag
 */
export type ContentTag = {
  value: string;
};

/**
 * Note represents a note from the database
 */
export type Note = {
  id: string;
  userId: string;
  type: AllContentType;
  title: string | null;
  content: string;
  tags: Array<ContentTag>;
  mentions: Array<NoteMention> | undefined;
  analysis: any;
  taskMetadata: TaskMetadata | undefined;
  tweetMetadata?: Record<string, any>;
  synced: boolean;
  createdAt: string;
  updatedAt: string;
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
  taskMetadata?: TaskMetadata;
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
  taskMetadata?: TaskMetadata | null;
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
