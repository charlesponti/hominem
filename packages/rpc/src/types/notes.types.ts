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
  kind: 'note' | 'memory';
  title: string | null;
  content: string;
  excerpt: string | null;
  files: NoteFile[];
  createdAt: string;
  updatedAt: string;
};

export type NoteSearchResult = {
  id: string;
  title: string | null;
  excerpt: string | null;
};

export type NotesSearchOutput = { notes: NoteSearchResult[]; nextCursor: string | null };
