export type NoteAnalysis = {
  category?: string | null;
  sentiment?: string | null;
  keyPhrases?: string[];
  summary?: string | null;
};

export type AllContentType = NoteContentType;

export type ContentTag = {
  id: string;
  name: string;
};

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

export const NoteContentTypeSchema = {} as const;
export const NoteStatusSchema = {} as const;
export const TaskPrioritySchema = {} as const;
export const TaskStatusSchema = {} as const;

export type NoteContentType =
  | 'note'
  | 'document'
  | 'task'
  | 'timer'
  | 'journal'
  | 'tweet'
  | 'essay'
  | 'blog_post'
  | 'social_post';

export type NoteStatus = 'draft' | 'published' | 'archived';

export type NoteMention = {
  id: string;
  name: string;
};

export type PublishingMetadata = {
  platform?: string | undefined;
  url?: string | undefined;
  externalId?: string | undefined;
  seo?:
    | {
        metaTitle?: string | undefined;
        metaDescription?: string | undefined;
        keywords?: string[] | undefined;
        canonicalUrl?: string | undefined;
        featuredImage?: string | undefined;
      }
    | undefined;
  metrics?:
    | {
        views?: number | undefined;
        likes?: number | undefined;
        reposts?: number | undefined;
        replies?: number | undefined;
        clicks?: number | undefined;
      }
    | undefined;
  threadPosition?: number | undefined;
  threadId?: string | undefined;
  inReplyTo?: string | undefined;
  scheduledFor?: string | undefined;
  importedAt?: string | undefined;
  importedFrom?: string | undefined;
};

export type NoteFile = {
  id: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: string;
  content?: string | undefined;
  textContent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
};

export type Note = {
  id: string;
  userId: string;
  type: NoteContentType;
  status: NoteStatus;
  title: string | null;
  content: string;
  excerpt: string | null;
  tags: ContentTag[];
  mentions: NoteMention[] | null;
  analysis: NoteAnalysis | null;
  publishingMetadata: PublishingMetadata | null;
  parentNoteId: string | null;
  versionNumber: number;
  isLatestVersion: boolean;
  files: NoteFile[];
  publishedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteInsert = {
  id?: string;
  userId: string;
  type?: NoteContentType;
  status?: NoteStatus;
  title?: string | null;
  content: string;
  excerpt?: string | null;
  tags?: ContentTag[];
  mentions?: NoteMention[] | null;
  analysis?: NoteAnalysis | null;
  publishingMetadata?: PublishingMetadata | null;
  parentNoteId?: string | null;
  versionNumber?: number;
  isLatestVersion?: boolean;
  files?: NoteFile[];
  publishedAt?: string | null;
  scheduledFor?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

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
  fileIds?: string[];
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
  fileIds?: string[];
  excerpt?: string | null;
  scheduledFor?: string | null;
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
