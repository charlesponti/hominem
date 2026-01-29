import { NoteContentTypeSchema } from '@hominem/db/schema';
import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  notesService,
} from './notes.service';

// Define output schema for a single note
const NoteOutputSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  content: z.string(),
  type: NoteContentTypeSchema,
  tags: z.array(z.object({ value: z.string() })).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createNoteDef = toolDefinition({
  name: 'create_note',
  description: 'Create a new note with a title and content',
  inputSchema: CreateNoteInputSchema,
  outputSchema: NoteOutputSchema,
});

export const createNoteServerForUser =
  (userId: string) =>
  async (
    input: z.infer<typeof CreateNoteInputSchema>,
  ): Promise<z.infer<typeof NoteOutputSchema>> => {
    const result = await notesService.create({ ...input, userId });
    return {
      id: result.id,
      title: result.title,
      content: result.content,
      type: result.type,
      tags: result.tags,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  };

export const listNotesDef = toolDefinition({
  name: 'list_notes',
  description: 'List all notes for the authenticated user',
  inputSchema: ListNotesInputSchema,
  outputSchema: ListNotesOutputSchema,
});

export const listNotesServerForUser =
  (userId: string) =>
  async (
    input: z.infer<typeof ListNotesInputSchema>,
  ): Promise<z.infer<typeof ListNotesOutputSchema>> => {
    const result = await notesService.query(userId, input);
    return {
      notes: result.notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        tags: note.tags,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      })),
      total: result.total,
    };
  };
