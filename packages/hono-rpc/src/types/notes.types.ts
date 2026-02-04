import type {
  AllContentType,
  ContentTag,
  JsonValue,
  NoteContentType,
  NoteMention,
  NoteStatus,
  PublishingMetadata,
  TaskPriority,
  TaskStatus,
} from '../schemas/notes.schema'

export {
  NoteContentTypeSchema,
  NoteStatusSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
} from '../schemas/notes.schema'

export type NoteOutput = {
  id: string
  userId: string
  type: NoteContentType
  status: NoteStatus
  title?: string | null
  content: string
  excerpt?: string | null
  tags: ContentTag[]
  mentions: NoteMention[]
  publishingMetadata?: PublishingMetadata
  analysis?: JsonValue
  isLatestVersion: boolean
  parentNoteId?: string | null
  versionNumber: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  scheduledFor: string | null
}

export type Note = NoteOutput

export type {
  AllContentType,
  ContentTag,
  NoteContentType,
  NoteMention,
  NoteStatus,
  PublishingMetadata,
  TaskStatus,
  TaskPriority as Priority,
}

// Backward compatibility alias
export type TaskMetadata = {
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
}

// ============================================================================
// LIST NOTES
// ============================================================================

export type NotesListInput = {
  types?: AllContentType[]
  tags?: string[]
  query?: string
  since?: string
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export type NotesListOutput = { notes: Note[] }

// ============================================================================
// GET NOTE
// ============================================================================

export type NotesGetOutput = Note

// ============================================================================
// CREATE NOTE
// ============================================================================

export type NotesCreateInput = {
  type?: NoteContentType
  status?: NoteStatus
  title?: string
  content: string
  excerpt?: string
  tags?: ContentTag[]
  mentions?: NoteMention[]
  publishingMetadata?: PublishingMetadata
  analysis?: JsonValue
}

export type NotesCreateOutput = Note

// ============================================================================
// UPDATE NOTE
// ============================================================================

export type NotesUpdateInput = {
  type?: NoteContentType
  status?: NoteStatus
  title?: string | null
  content?: string
  excerpt?: string | null
  tags?: ContentTag[] | null
  publishingMetadata?: PublishingMetadata | null
  analysis?: JsonValue | null
}

export type NotesUpdateOutput = Note

// ============================================================================
// DELETE NOTE
// ============================================================================

export type NotesDeleteOutput = Note

// ============================================================================
// PUBLISH NOTE
// ============================================================================

export type NotesPublishOutput = Note

// ============================================================================
// ARCHIVE NOTE
// ============================================================================

export type NotesArchiveOutput = Note

// ============================================================================
// SYNC NOTES
// ============================================================================

export type NotesSyncItem = {
  id?: string
  type: NoteContentType
  status?: NoteStatus
  title?: string | null
  content: string
  excerpt?: string | null
  tags?: ContentTag[]
  mentions?: NoteMention[]
  publishingMetadata?: PublishingMetadata | null
  analysis?: JsonValue | null
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
  scheduledFor?: string
}

export type NotesSyncInput = {
  items: NotesSyncItem[]
}

export type NotesSyncOutput = {
  created: number
  updated: number
  failed: number
}

// ============================================================================
// NOTE VERSIONS
// ============================================================================

export type NotesVersionsOutput = {
  versions: Note[]
}
