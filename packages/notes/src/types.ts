/**
 * Note Types & Validation
 *
 * Canonical type sources:
 * - DB types: @hominem/db/types/notes (exports from schema/*.types.ts)
 * - Validation schemas: defined here
 *
 * Re-export only what consumers need; avoid duplicating DB types.
 */

import type { NoteInput, NoteSyncItem, NoteOutput } from '@hominem/db/types/notes';

import { NoteContentTypeSchema, NoteStatusSchema } from '@hominem/db/schema/notes';
import { z } from 'zod';

const noteTagSchema = z.object({ value: z.string() });
const noteTagsSchema = z.array(noteTagSchema);

export const UpdateNoteZodSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: NoteContentTypeSchema.optional(),
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  excerpt: z.string().nullish(),
  tags: noteTagsSchema.nullish(),
  publishingMetadata: z.any().optional().nullish(),
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
  status: z.array(NoteStatusSchema).optional().describe('Filter by note status'),
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

// Re-export canonical types from DB layer
export type { NoteInput, NoteSyncItem, NoteOutput };
