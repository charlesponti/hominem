import * as z from 'zod';

export const CreateNoteInputSchema = z.object({
  title: z.string().optional(),
  content: z.string(),
  fileIds: z.array(z.uuid()).max(5).optional(),
});

export const UpdateNoteInputSchema = z.object({
  title: z.string().nullish(),
  content: z.string().optional(),
  fileIds: z.array(z.uuid()).max(5).optional(),
});

export const NotesListQuerySchema = z.object({
  query: z.string().optional(),
  since: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export const NotesFeedQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().optional(),
});

export const NoteParamSchema = z.object({ id: z.uuid() });

export const GenerateNoteFromChatInputSchema = z.object({
  transcript: z.string().min(1).max(20000),
  instruction: z.string().max(500).optional(),
});

export const NoteSearchQuerySchema = z.object({
  query: z.string().trim().min(1),
  limit: z.string().optional(),
  cursor: z.string().optional(),
});
