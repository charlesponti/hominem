import { z } from 'zod';
import type { ApiResult, Note as DbNote, TaskMetadata, AllContentType } from '@hominem/services';

// ============================================================================
// Data Types
// ============================================================================

export type Note = DbNote;

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

export type NotesListOutput = ApiResult<{ notes: Note[] }>;

// ============================================================================
// GET NOTE
// ============================================================================

export type NotesGetOutput = ApiResult<Note>;

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

export type NotesCreateOutput = ApiResult<Note>;

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

export type NotesUpdateOutput = ApiResult<Note>;

// ============================================================================
// DELETE NOTE
// ============================================================================

export type NotesDeleteOutput = ApiResult<Note>;

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

export type NotesSyncOutput = ApiResult<{
  created: number;
  updated: number;
  failed: number;
}>;
