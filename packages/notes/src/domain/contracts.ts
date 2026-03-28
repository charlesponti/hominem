// Core Domain Types
export type NoteId = string;
export type UserId = string;
export type VersionId = string;

export type NoteStatus = 'draft' | 'published' | 'archived';
export type NoteType = 'doc' | 'tweet' | 'thread' | 'post';

export interface NoteContent {
  title: string | null;
  content: string | null;
  excerpt: string | null;
}

export interface PublishingMetadata {
  platform?: string;
  url?: string;
  externalId?: string;
  scheduledFor?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    canonicalUrl?: string;
    featuredImage?: string;
  };
}

export interface NoteAnalysis {
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  keyTopics?: string[];
  readingTime?: number;
}

export interface NoteMention {
  id: string;
  name: string;
  type: 'person' | 'place' | 'tag';
}

export interface NoteTag {
  id: string;
  name: string;
  slug: string;
}

// Domain Note Model (aggregate root)
export interface Note {
  id: NoteId;
  userId: UserId;
  type: NoteType;
  status: NoteStatus;

  // Content (from current version)
  title: string;
  content: string;
  excerpt: string | null;

  // Versioning
  currentVersionId: VersionId | null;
  versionNumber: number;
  isLocked: boolean;

  // Publishing
  publishedAt: string | null;
  scheduledFor: string | null;
  publishingMetadata: PublishingMetadata | null;

  // Analysis
  analysis: NoteAnalysis | null;
  mentions: NoteMention[];
  tags: NoteTag[];

  // Metadata
  source: string | null;
  parentNoteId: NoteId | null;
  createdAt: string;
  updatedAt: string;
}

// Input DTOs
export interface CreateNoteInput {
  userId: UserId;
  type?: NoteType;
  title?: string;
  content?: string;
  excerpt?: string;
  source?: string;
  parentNoteId?: NoteId;
  tags?: Array<{ value: string }>;
  mentions?: NoteMention[];
  status?: NoteStatus;
  publishingMetadata?: PublishingMetadata;
}

export interface UpdateNoteInput {
  id: NoteId;
  userId: UserId;
  type?: NoteType;
  title?: string;
  content?: string;
  excerpt?: string;
  source?: string;
  tags?: Array<{ value: string }>;
  mentions?: NoteMention[];
  status?: NoteStatus;
  publishingMetadata?: PublishingMetadata | null;
  analysis?: NoteAnalysis | null;
}

export interface PublishNoteInput {
  noteId: NoteId;
  userId: UserId;
  platform?: string;
  url?: string;
  externalId?: string;
  scheduledFor?: string;
  seo?: PublishingMetadata['seo'];
}

// Query Filters
export interface NoteQueryFilters {
  query?: string;
  types?: NoteType[];
  status?: NoteStatus[];
  tags?: string[];
  since?: string;
  limit?: number;
  offset?: number;
}

// Sync DTOs
export interface NoteSyncItem {
  id?: NoteId;
  type?: NoteType;
  title?: string;
  content?: string;
  excerpt?: string;
  status?: NoteStatus;
  tags?: Array<{ value: string }>;
  updatedAt?: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  items: Array<{
    id: NoteId;
    updatedAt: string;
    type: NoteType;
  }>;
}

// Domain Errors
export class NoteNotFoundError extends Error {
  constructor(noteId: NoteId) {
    super(`Note not found: ${noteId}`);
    this.name = 'NoteNotFoundError';
  }
}

export class NoteForbiddenError extends Error {
  constructor(message: string = 'Not authorized to access this note') {
    super(message);
    this.name = 'NoteForbiddenError';
  }
}

export class NoteConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoteConflictError';
  }
}

export class InvalidNoteTransitionError extends Error {
  constructor(from: NoteStatus, to: NoteStatus) {
    super(`Invalid note transition from ${from} to ${to}`);
    this.name = 'InvalidNoteTransitionError';
  }
}
