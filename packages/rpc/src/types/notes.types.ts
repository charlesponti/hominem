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
  files: NoteFile[];
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Output Types (Inferred from returns - these are optional aliases)
// ============================================================================

export type NotesCreateOutput = Note;

export type NoteSearchResult = {
  id: string;
  title: string | null;
  excerpt: string | null;
};

export type NotesSearchOutput = { notes: NoteSearchResult[]; nextCursor: string | null };

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
