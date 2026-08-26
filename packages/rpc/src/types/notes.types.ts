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
  title: string | null;
  content: string;
  excerpt: string | null;
  parentNoteId: string | null;
  files: NoteFile[];
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Output Types (Inferred from returns - these are optional aliases)
// ============================================================================

export type NotesListOutput = { notes: Note[] };
export type NotesGetOutput = Note;
export type NotesCreateOutput = Note;
export type NotesUpdateOutput = Note;
export type NotesDeleteOutput = Note;

export type NoteSearchResult = {
  id: string;
  title: string | null;
  excerpt: string | null;
};

export type NoteFeedItem = {
  id: string;
  title: string | null;
  contentPreview: string;
  createdAt: string;
  authorId: string;
  metadata: {
    hasAttachments: boolean;
  };
};

export type NotesFeedOutput = { notes: NoteFeedItem[]; nextCursor: string | null };
export type NotesFeedInput = { limit?: number; cursor?: string };
export type NotesSearchOutput = { notes: NoteSearchResult[]; nextCursor: string | null };

export type NotesListInput = {
  query?: string;
  since?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
};

// ============================================================================
// CREATE NOTE
// ============================================================================

export type NotesCreateInput = {
  title?: string;
  content: string;
  fileIds?: string[];
};

// ============================================================================
// UPDATE NOTE
// ============================================================================

export type NotesUpdateInput = {
  title?: string | null;
  content?: string;
  fileIds?: string[];
};
