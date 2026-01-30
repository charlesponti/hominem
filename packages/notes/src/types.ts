import type { NoteInput, NoteSyncItem } from '@hominem/db/schema';

import { NoteContentTypeSchema, TaskMetadataSchema } from '@hominem/db/schema';
import { z } from 'zod';

const noteTagSchema = z.object({ value: z.string() });
const noteTagsSchema = z.array(noteTagSchema);

export const UpdateNoteZodSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NoteContentTypeSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  tags: noteTagsSchema.nullish(),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.any().optional().nullish(),
});

export type UpdateNoteInput = z.infer<typeof UpdateNoteZodSchema>;

export const CreateNoteInputSchema = z.object({
  title: z.string().describe('The title of the note'),
  content: z.string().describe('The content/body of the note'),
  tags: noteTagsSchema.optional().describe('Tags to categorize the note'),
  type: NoteContentTypeSchema.optional().describe('Type of note'),
});

export const ListNotesInputSchema = z.object({
  limit: z.number().optional().describe('Maximum number of notes to return'),
  offset: z.number().optional().describe('Pagination offset'),
  query: z.string().optional().describe('Full-text search query'),
  types: z.array(NoteContentTypeSchema).optional().describe('Filter by note types'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  since: z.string().optional().describe('Filter notes updated after this date (ISO 8601)'),
});

export const ListNotesOutputSchema = z.object({
  notes: z.array(
    z.object({
      id: z.string(),
      title: z.string().nullable(),
      content: z.string(),
      type: NoteContentTypeSchema,
      tags: noteTagsSchema.nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  total: z.number(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>;
export type ListNotesInput = z.infer<typeof ListNotesInputSchema>;
export type ListNotesOutput = z.infer<typeof ListNotesOutputSchema>;

export type CreateNotePayload = NoteInput;

// Export `NoteSyncItem` from the DB schema for package consumers who need the
// sync item shape. This is intentional and canonical for `@hominem/notes`.
export type { NoteSyncItem } from '@hominem/db/schema';
