import { NoteContentTypeSchema, type NoteInsert, TaskMetadataSchema } from '@hominem/db/schema';
import { NotesService } from '@hominem/notes-services';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const CreateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.default('note'),
  title: z.string().optional(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  taskMetadata: TaskMetadataSchema.optional(),
  analysis: z.unknown().optional(),
});

const UpdateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).nullish(),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.unknown().optional().nullish(),
});

const SyncNoteItemSchema = z.object({
  id: z.uuid().optional(),
  type: NoteContentTypeSchema,
  title: z.string().nullish(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  taskMetadata: TaskMetadataSchema.optional().nullish(),
  analysis: z.unknown().optional().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const notesRoutes = new Hono<AppContext>()
  // List notes
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query();

      const types = query.types?.split(',') as
        | ('note' | 'task' | 'tweet' | 'essay' | 'blog_post' | 'social_post')[]
        | undefined;
      const tags = query.tags?.split(',');
      const sortBy = (query.sortBy as 'createdAt' | 'updatedAt' | 'title') || 'createdAt';
      const sortOrder = (query.sortOrder as 'asc' | 'desc') || 'desc';
      const limit = query.limit ? parseInt(query.limit) : undefined;
      const offset = query.offset ? parseInt(query.offset) : 0;

      const notesService = new NotesService();

      // Get all notes matching filters
      const { notes: allNotes } = await notesService.query(userId, {
        types,
        query: query.query,
        tags,
        since: query.since,
      });

      // Apply sorting
      const sortedNotes = [...allNotes];
      if (sortBy === 'createdAt') {
        sortedNotes.sort((a, b) => {
          const aDate = new Date(a.createdAt).getTime();
          const bDate = new Date(b.createdAt).getTime();
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        });
      } else if (sortBy === 'updatedAt') {
        sortedNotes.sort((a, b) => {
          const aDate = new Date(a.updatedAt).getTime();
          const bDate = new Date(b.updatedAt).getTime();
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        });
      } else if (sortBy === 'title') {
        sortedNotes.sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          const comparison = aTitle.localeCompare(bTitle);
          return sortOrder === 'asc' ? comparison : -comparison;
        });
      }

      // Apply pagination
      const paginatedNotes = limit
        ? sortedNotes.slice(offset, offset + limit)
        : sortedNotes.slice(offset);

      return c.json(success({ notes: paginatedNotes }));
    } catch (err) {
      console.error('[notes.list] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to fetch notes: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Get note by ID
  .get('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const notesService = new NotesService();
      const note = await notesService.getById(id, userId);
      return c.json(success(note));
    } catch (err) {
      if (err instanceof Error && err.message === 'Note not found') {
        return c.json(error('NOT_FOUND', 'Note not found'), 404);
      }
      console.error('[notes.get] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to fetch note: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Create note
  .post('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = CreateNoteInputSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const notesService = new NotesService();
      const noteData: NoteInsert = {
        ...parsed.data,
        userId,
        tags: parsed.data.tags || [],
        mentions: parsed.data.mentions || [],
      };
      const newNote = await notesService.create(noteData);
      return c.json(success(newNote), 201);
    } catch (err) {
      console.error('[notes.create] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to create note: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Update note
  .patch('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = UpdateNoteInputSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const notesService = new NotesService();
      const updatedNote = await notesService.update({
        id,
        ...parsed.data,
        userId,
      });
      return c.json(success(updatedNote));
    } catch (err) {
      if (err instanceof Error && err.message === 'Note not found or not authorized to update') {
        return c.json(error('NOT_FOUND', 'Note not found or not authorized to update'), 404);
      }
      console.error('[notes.update] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to update note: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Delete note
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const notesService = new NotesService();
      const deletedNote = await notesService.delete(id, userId);
      return c.json(success(deletedNote));
    } catch (err) {
      if (err instanceof Error && err.message === 'Note not found or not authorized to delete') {
        return c.json(error('NOT_FOUND', 'Note not found or not authorized to delete'), 404);
      }
      console.error('[notes.delete] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to delete note: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Sync notes
  .post('/sync', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = z.object({ items: z.array(SyncNoteItemSchema) }).safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const notesService = new NotesService();
      const result = await notesService.sync(
        parsed.data.items as Parameters<typeof notesService.sync>[0],
        userId,
      );
      return c.json(success(result));
    } catch (err) {
      console.error('[notes.sync] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to sync notes: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  });
