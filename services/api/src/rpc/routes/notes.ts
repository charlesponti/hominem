import { randomUUID } from 'crypto';

import { db } from '@hominem/db';
import { NotFoundError } from '@hominem/db';
import type { Database } from '@hominem/db';
import type {
  Note,
  PublishingMetadata,
  ContentTag,
  NoteMention,
  NoteAnalysis,
} from '@hominem/notes-services';
import {
  AllContentTypeSchema,
  type AllContentType,
  CreateNoteInputSchema,
  NotesListQuerySchema,
  NotesSyncSchema,
  PublishNoteSchema,
  UpdateNoteInputSchema,
} from '@hominem/rpc/schemas/notes.schema';
import { appendNoteAttachments } from '@hominem/utils/upload';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { Selectable } from 'kysely';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { resolveUploadedFiles } from '../utils/uploaded-files';

type NoteRow = Selectable<Database['app.notes']>;

function toIsoString(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : value;
}

// Helper to convert database row to Note type
function dbToNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.owner_user_id,
    type: 'note' as Note['type'],
    status: 'draft' as Note['status'],
    title: null,
    content: '',
    excerpt: null,
    tags: [],
    mentions: null,
    analysis: null,
    publishingMetadata: null,
    parentNoteId: row.parent_note_id,
    versionNumber: 1,
    isLatestVersion: true,
    publishedAt: null,
    scheduledFor: null,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

// Helper to get note with ownership check
async function getNoteWithOwnershipCheck(noteId: string, userId: string): Promise<Note> {
  const note = await db
    .selectFrom('app.notes')
    .selectAll()
    .where((eb) => eb.and([eb('id', '=', noteId), eb('owner_user_id', '=', userId)]))
    .executeTakeFirst();

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  return dbToNote(note);
}

// Helper to get and hydrate note tags
async function hydrateNoteTags(notes: Note[]): Promise<void> {
  if (notes.length === 0) return;

  const noteIds = notes.map((n) => n.id);
  const rows = await db
    .selectFrom('app.tag_assignments')
    .innerJoin('app.tags', 'app.tags.id', 'app.tag_assignments.tag_id')
    .select(['app.tag_assignments.entity_id', 'app.tags.name'])
    .where('app.tag_assignments.entity_table', '=', 'notes')
    .where('app.tag_assignments.entity_id', 'in', noteIds)
    .execute();

  const tagsByNoteId = new Map<string, ContentTag[]>();
  for (const row of rows) {
    const noteId = row.entity_id;
    if (!tagsByNoteId.has(noteId)) {
      tagsByNoteId.set(noteId, []);
    }
    tagsByNoteId.get(noteId)!.push({ value: row.name });
  }

  for (const note of notes) {
    note.tags = tagsByNoteId.get(note.id) || [];
  }
}

// Helper to sync note tags
async function syncNoteTags(
  noteId: string,
  userId: string,
  tags: ContentTag[] | null,
): Promise<void> {
  // Delete existing tags
  await db
    .deleteFrom('app.tag_assignments')
    .where('entity_table', '=', 'notes')
    .where('entity_id', '=', noteId)
    .execute();

  if (!tags || tags.length === 0) {
    return;
  }

  // Normalize tag names
  const normalizedNames = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.value.trim();
    if (normalized.length > 0) {
      normalizedNames.add(normalized);
    }
  }

  if (normalizedNames.size === 0) {
    return;
  }

  // Insert or get tags (upsert pattern)
  const tagNames = Array.from(normalizedNames);
  for (const name of tagNames) {
    // Check if tag exists
    const existing = await db
      .selectFrom('app.tags')
      .select('id')
      .where((eb) => eb.and([eb('owner_user_id', '=', userId), eb('name', '=', name)]))
      .executeTakeFirst();

    if (!existing) {
      // Create new tag
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      await db
        .insertInto('app.tags')
        .values({
          id: randomUUID(),
          owner_user_id: userId,
          name,
          path: `/${name}`,
          slug,
        })
        .execute();
    }
  }

  // Link tags to note
  const tagsToLink = await db
    .selectFrom('app.tags')
    .select('id')
    .where((eb) => eb.and([eb('owner_user_id', '=', userId), eb('name', 'in', tagNames)]))
    .execute();

  if (tagsToLink.length > 0) {
    const linkValues = tagsToLink.map((tag) => ({
      tag_id: tag.id,
      entity_id: noteId,
      entity_table: 'notes',
    }));
    await db
      .insertInto('app.tag_assignments')
      .values(linkValues)
      .onConflict((oc) => oc.doNothing())
      .execute();
  }
}

export const notesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // List notes - returns only latest versions by default
  .get('/', zValidator('query', NotesListQuerySchema), async (c) => {
    const userId = c.get('userId')!;
    const queryParams = c.req.valid('query');

    const types = queryParams.types
      ?.split(',')
      .filter((t): t is AllContentType => AllContentTypeSchema.safeParse(t).success);
    const status = queryParams.status
      ?.split(',')
      .filter((s) => ['draft', 'published', 'archived'].includes(s)) as
      | ('draft' | 'published' | 'archived')[]
      | undefined;
    const tags = queryParams.tags?.split(',');
    const sortBy = queryParams.sortBy || 'createdAt';
    const sortOrder = queryParams.sortOrder || 'desc';
    const limit = queryParams.limit ? Number.parseInt(queryParams.limit) : undefined;
    const offset = queryParams.offset ? Number.parseInt(queryParams.offset) : 0;
    const includeAllVersions = queryParams.includeAllVersions === 'true';

    // Build query
    let query = db.selectFrom('app.notes').selectAll().where('owner_user_id', '=', userId);

    // Filter by created_at if since is provided
    if (queryParams.since) {
      query = query.where('created_at', '>=', new Date(queryParams.since));
    }

    const allNotes = await query.execute();
    let results = allNotes.map(dbToNote);

    // Filter by tags if provided
    if (tags && tags.length > 0) {
      const notesWithTags = new Set<string>();
      for (const tag of tags) {
        const tagged = await db
          .selectFrom('app.tag_assignments')
          .innerJoin('app.tags', 'app.tags.id', 'app.tag_assignments.tag_id')
          .select('app.tag_assignments.entity_id')
          .where('app.tag_assignments.entity_table', '=', 'notes')
          .where((eb) =>
            eb.and([
              eb(
                'app.tag_assignments.entity_id',
                'in',
                results.map((n) => n.id),
              ),
              eb('app.tags.name', '=', tag),
            ]),
          )
          .execute();

        tagged.forEach((t) => notesWithTags.add(t.entity_id));
      }
      results = results.filter((n) => notesWithTags.has(n.id));
    }

    // Apply sorting
    if (sortBy === 'createdAt') {
      results.sort((a, b) => {
        const aDate = new Date(a.createdAt).getTime();
        const bDate = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });
    } else if (sortBy === 'updatedAt') {
      results.sort((a, b) => {
        const aDate = new Date(a.updatedAt).getTime();
        const bDate = new Date(b.updatedAt).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      });
    } else if (sortBy === 'title') {
      results.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const comparison = aTitle.localeCompare(bTitle);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Apply pagination
    const paginatedNotes = limit ? results.slice(offset, offset + limit) : results.slice(offset);

    // Hydrate tags
    await hydrateNoteTags(paginatedNotes);

    return c.json({ notes: paginatedNotes });
  })

  // Get note by ID
  .get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const note = await getNoteWithOwnershipCheck(id, userId);
    await hydrateNoteTags([note]);
    return c.json(note);
  })

  // Get all versions of a note
  .get('/:id/versions', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    // Verify ownership of at least one version
    const hasAccess = await db
      .selectFrom('app.notes')
      .select('id')
      .where((eb) => eb.and([eb('id', '=', id), eb('owner_user_id', '=', userId)]))
      .executeTakeFirst();

    if (!hasAccess) {
      throw new NotFoundError('Note not found');
    }

    // Get the root parent to find all versions
    let rootId = id;
    const directParent = await db
      .selectFrom('app.notes')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (directParent && directParent.parent_note_id) {
      rootId = directParent.parent_note_id;
    }

    const versions = await db
      .selectFrom('app.notes')
      .selectAll()
      .where((eb) => eb.or([eb('id', '=', rootId), eb('parent_note_id', '=', rootId)]))
      .orderBy('created_at', 'desc')
      .execute();

    const results = versions.map(dbToNote);

    // Hydrate tags
    await hydrateNoteTags(results);

    return c.json({ versions: results });
  })

  // Create note
  .post('/', zValidator('json', CreateNoteInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const { fileIds = [], ...data } = c.req.valid('json');

    const noteId = randomUUID();
    const now = new Date().toISOString();
    const uploadedFiles = await resolveUploadedFiles(userId, fileIds);
    const content = appendNoteAttachments(data.content, uploadedFiles);

    await db
      .insertInto('app.notes')
      .values({
        id: noteId,
        owner_user_id: userId,
        created_at: now,
        updated_at: now,
      })
      .execute();

    // Sync tags
    if (data.tags && data.tags.length > 0) {
      await syncNoteTags(noteId, userId, data.tags);
    }

    const note = await getNoteWithOwnershipCheck(noteId, userId);
    return c.json(note, 201);
  })

  // Update note
  .patch('/:id', zValidator('json', UpdateNoteInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const { fileIds = [], ...data } = c.req.valid('json');

    const now = new Date().toISOString();

    // Check ownership
    const existingNote = await getNoteWithOwnershipCheck(id, userId);
    const uploadedFiles = await resolveUploadedFiles(userId, fileIds);

    // Build update object
    interface UpdateValues {
      updated_at: string;
      type?: string;
      status?: string;
      title?: string | null;
      content?: string;
      excerpt?: string | null;
      scheduled_for?: string | null;
      analysis?: NoteAnalysis | null;
      publishing_metadata?: PublishingMetadata | null;
    }

    const updateValues: UpdateValues = { updated_at: now };

    if (data.type !== undefined) updateValues.type = data.type;
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.title !== undefined) updateValues.title = data.title;
    if (data.content !== undefined || uploadedFiles.length > 0) {
      updateValues.content = appendNoteAttachments(
        data.content ?? existingNote.content,
        uploadedFiles,
      );
    }
    if (data.excerpt !== undefined) updateValues.excerpt = data.excerpt;
    if (data.scheduledFor !== undefined) updateValues.scheduled_for = data.scheduledFor;
    if (data.analysis !== undefined) updateValues.analysis = data.analysis;
    if (data.publishingMetadata !== undefined)
      updateValues.publishing_metadata = data.publishingMetadata;

    await db.updateTable('app.notes').set(updateValues).where('id', '=', id).execute();

    // Sync tags if provided
    if (data.tags !== undefined) {
      await syncNoteTags(id, userId, data.tags);
    }

    const note = await getNoteWithOwnershipCheck(id, userId);
    return c.json(note);
  })

  // Delete note
  .delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const note = await getNoteWithOwnershipCheck(id, userId);

    // Delete associated records
    await db
      .deleteFrom('app.tag_assignments')
      .where('entity_table', '=', 'notes')
      .where('entity_id', '=', id)
      .execute();

    // Delete child versions
    await db.deleteFrom('app.notes').where('parent_note_id', '=', id).execute();

    // Delete the note itself
    await db.deleteFrom('app.notes').where('id', '=', id).execute();

    return c.json(note);
  })

  // Publish note
  .post('/:id/publish', zValidator('json', PublishNoteSchema), async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const now = new Date().toISOString();
    const note = await getNoteWithOwnershipCheck(id, userId);

    // Build updated publishing metadata
    const currentMetadata: PublishingMetadata = note.publishingMetadata || {};
    const newMetadata: PublishingMetadata = {
      ...currentMetadata,
      ...(data.platform && { platform: data.platform }),
      ...(data.url && { url: data.url }),
      ...(data.externalId && { externalId: data.externalId }),
      ...(data.seo && { seo: data.seo }),
    };

    await db
      .updateTable('app.notes')
      .set({
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    const updatedNote = await getNoteWithOwnershipCheck(id, userId);
    return c.json(updatedNote);
  })

  // Archive note
  .post('/:id/archive', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const now = new Date().toISOString();
    await getNoteWithOwnershipCheck(id, userId);

    await db
      .updateTable('app.notes')
      .set({
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    const note = await getNoteWithOwnershipCheck(id, userId);
    return c.json(note);
  })

  // Unpublish note
  .post('/:id/unpublish', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const now = new Date().toISOString();
    await getNoteWithOwnershipCheck(id, userId);

    await db
      .updateTable('app.notes')
      .set({
        updated_at: now,
      })
      .where('id', '=', id)
      .execute();

    const note = await getNoteWithOwnershipCheck(id, userId);
    return c.json(note);
  })

  // Expand note with AI
  .post('/:id/expand', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    // For now, just return the note as-is
    // AI development endpoints typically call external services
    // and would be handled by a separate service layer
    const note = await getNoteWithOwnershipCheck(id, userId);
    return c.json(note);
  })

  // Outline note with AI
  .post('/:id/outline', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const note = await getNoteWithOwnershipCheck(id, userId);
    return c.json(note);
  })

  // Rewrite note with AI
  .post('/:id/rewrite', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const note = await getNoteWithOwnershipCheck(id, userId);
    return c.json(note);
  })

  // Sync notes
  .post('/sync', zValidator('json', NotesSyncSchema), async (c) => {
    const userId = c.get('userId')!;
    const { items } = c.req.valid('json');

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const now = new Date().toISOString();
        const noteId = item.id || randomUUID();

        // Check if note exists
        const existing = await db
          .selectFrom('app.notes')
          .select('id')
          .where((eb) => eb.and([eb('id', '=', noteId), eb('owner_user_id', '=', userId)]))
          .executeTakeFirst();

        if (existing) {
          // Update
          interface BatchUpdateValues {
            updated_at: string;
            type?: string;
            status?: string;
            title?: string | null;
            content?: string;
            excerpt?: string | null;
            analysis?: NoteAnalysis | null;
            publishing_metadata?: PublishingMetadata | null;
          }

          const updateValues: BatchUpdateValues = { updated_at: now };

          if (item.type !== undefined) updateValues.type = item.type;
          if (item.status !== undefined) updateValues.status = item.status;
          if (item.title !== undefined) updateValues.title = item.title;
          if (item.content !== undefined) updateValues.content = item.content;
          if (item.excerpt !== undefined) updateValues.excerpt = item.excerpt;
          if (item.analysis !== undefined) updateValues.analysis = item.analysis;
          if (item.publishingMetadata !== undefined)
            updateValues.publishing_metadata = item.publishingMetadata;

          await db.updateTable('app.notes').set(updateValues).where('id', '=', noteId).execute();

          if (item.tags !== undefined) {
            await syncNoteTags(noteId, userId, item.tags);
          }

          updated++;
        } else {
          // Create
          await db
            .insertInto('app.notes')
            .values({
              id: noteId,
              owner_user_id: userId,
              created_at: item.createdAt || now,
              updated_at: item.updatedAt || now,
            })
            .execute();

          if (item.tags !== undefined) {
            await syncNoteTags(noteId, userId, item.tags);
          }

          created++;
        }
      } catch {
        failed++;
      }
    }

    return c.json({ created, updated, failed });
  });
