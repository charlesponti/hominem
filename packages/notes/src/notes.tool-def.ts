import { tool } from 'ai';
import * as z from 'zod';

import {
  CreateNoteInputSchema,
  ListNotesInputSchema,
  ListNotesOutputSchema,
  notesService,
  type CreateNoteInput,
} from './notes.service';
import { NoteContentTypeSchema } from './types';

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

export const createNoteServerForUser =
  (userId: string) =>
  async (input: CreateNoteInput): Promise<z.infer<typeof NoteOutputSchema>> => {
    const result = await notesService.create({
      userId,
      title: input.title,
      content: input.content,
      ...(input.type ? { type: input.type } : {}),
      ...(input.tags ? { tags: input.tags } : {}),
    });
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

export const createNoteTool = (userId: string) =>
  tool({
    description: 'Create a new note with a title and content',
    parameters: CreateNoteInputSchema,
    execute: createNoteServerForUser(userId),
  });

export const listNotesTool = (userId: string) =>
  tool({
    description: 'List all notes for the authenticated user',
    parameters: ListNotesInputSchema,
    execute: listNotesServerForUser(userId),
  });
