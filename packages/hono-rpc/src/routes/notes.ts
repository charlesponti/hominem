import { NoteContentTypeSchema, type NoteInsert, TaskMetadataSchema, AllContentTypeSchema, type AllContentType } from '@hominem/db/schema';
import { NotesService } from '@hominem/notes-services';
import { NotFoundError, ValidationError, InternalError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  NotesListOutput,
  NotesGetOutput,
  NotesCreateOutput,
  NotesUpdateOutput,
  NotesDeleteOutput,
  NotesSyncOutput,
  Note,
} from '../types/notes.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

const notesService = new NotesService();

/**
 * Serialization Helpers
 */
function serializeNote(n: any): Note {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    content: n.content,
    tags: n.tags || [],
    mentions: n.mentions || [],
    taskMetadata: n.taskMetadata,
    analysis: n.analysis,
    tweetMetadata: n.tweetMetadata,
    synced: n.synced,
    createdAt: typeof n.createdAt === 'string' ? n.createdAt : n.createdAt.toISOString(),
    updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : n.updatedAt.toISOString(),
  };
}

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

const notesListQuerySchema = z.object({
  types: z.string().optional(),
  tags: z.string().optional(),
  query: z.string().optional(),
  since: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export const notesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List notes
  .get('/', zValidator('query', notesListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const queryParams = c.req.valid('query');

    const types = queryParams.types
      ?.split(',')
      .filter((t): t is AllContentType => AllContentTypeSchema.safeParse(t).success);
    const tags = queryParams.tags?.split(',');
    const sortBy = queryParams.sortBy || 'createdAt';
    const sortOrder = queryParams.sortOrder || 'desc';
    const limit = queryParams.limit ? parseInt(queryParams.limit) : undefined;
    const offset = queryParams.offset ? parseInt(queryParams.offset) : 0;

    // Get all notes matching filters
    const { notes: allNotes } = await notesService.query(userId, {
      types,
      query: queryParams.query,
      tags,
      since: queryParams.since,
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

    return c.json<NotesListOutput>({ notes: paginatedNotes.map(serializeNote) });
  })

  // Get note by ID
  .get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const note = await notesService.getById(id, userId);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    return c.json<NotesGetOutput>(serializeNote(note));
  })

  // Create note
  .post('/', zValidator('json', CreateNoteInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    const noteData: NoteInsert = {
      ...data,
      userId,
      tags: data.tags || [],
      mentions: data.mentions || [],
    };
    const newNote = await notesService.create(noteData);
    return c.json<NotesCreateOutput>(serializeNote(newNote), 201);
  })

  // Update note
  .patch('/:id', zValidator('json', UpdateNoteInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const updatedNote = await notesService.update({
      id,
      ...data,
      userId,
    });
    return c.json<NotesUpdateOutput>(serializeNote(updatedNote));
  })

  // Delete note
  .delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const deletedNote = await notesService.delete(id, userId);
    return c.json<NotesDeleteOutput>(serializeNote(deletedNote));
  })

  // Sync notes
  .post(
    '/sync',
    zValidator('json', z.object({ items: z.array(SyncNoteItemSchema) })),
    async (c) => {
      const userId = c.get('userId')!;
      const { items } = c.req.valid('json');

      const result = await notesService.sync(
        items as Parameters<typeof notesService.sync>[0],
        userId,
      );
      return c.json<NotesSyncOutput>(result);
    },
  );
