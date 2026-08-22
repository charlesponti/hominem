import { buildContentPreview } from '@hominem/utils/text';
import type { Selectable, UpdateObject } from 'kysely';

import type { Database } from '../../db';
import { NotFoundError, ValidationError } from '../../errors';
import type { DbHandle } from '../../transaction';
import type { AppFiles, AppNotes } from '../../types/database';

type NoteRow = Selectable<AppNotes>;

type NoteFileSource = Pick<
  Selectable<AppFiles>,
  | 'id'
  | 'originalName'
  | 'mimetype'
  | 'size'
  | 'url'
  | 'content'
  | 'textContent'
  | 'metadata'
  | 'createdat'
>;

type AttachedFileRow = NoteFileSource & { noteId: string };

export interface NoteFileRecord {
  id: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: string;
  content?: string;
  textContent?: string;
  metadata?: Record<string, unknown>;
}

export interface NoteRecord {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  excerpt: string | null;
  parentNoteId: string | null;
  files: NoteFileRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  userId: string;
  title: string | null;
  content: string;
  excerpt: string | null;
  parentNoteId?: string | null;
  source?: string | null;
}

export interface UpdateNoteInput {
  title?: string | null;
  content?: string;
  excerpt?: string | null;
}

export interface NoteMutationCommand {
  noteId: string;
  userId: string;
}

export interface UpdateNoteCommand extends NoteMutationCommand {
  input: UpdateNoteInput;
}

export interface SyncNoteFilesCommand extends NoteMutationCommand {
  fileIds: string[];
}

export interface ListNotesInput {
  userId: string;
  limit?: number;
  offset?: number;
  since?: string;
  query?: string;
  source?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface ListNoteFeedInput {
  userId: string;
  limit?: number;
  cursor?: string;
}

export interface SearchNotesInput {
  userId: string;
  query: string;
  limit?: number;
  cursor?: string;
}

export interface NoteFeedRecord {
  id: string;
  title: string | null;
  contentPreview: string;
  createdAt: string;
  authorId: string;
  metadata: {
    hasAttachments: boolean;
  };
}

export interface NoteFeedPageRecord {
  notes: NoteFeedRecord[];
  nextCursor: string | null;
}

export interface SearchNoteResult {
  id: string;
  title: string | null;
  excerpt: string | null;
}

export interface SearchNotesPageRecord {
  notes: SearchNoteResult[];
  nextCursor: string | null;
}

type NoteFeedRow = Pick<
  NoteRow,
  'id' | 'title' | 'excerpt' | 'content' | 'createdat' | 'ownerUserid'
>;

type NoteFeedAttachmentRow = {
  noteId: string;
};

function toNoteFile(row: NoteFileSource): NoteFileRecord {
  return {
    id: row.id,
    originalName: row.originalName,
    mimetype: row.mimetype,
    size: row.size,
    url: row.url,
    uploadedAt: new Date(row.createdat).toISOString(),
    ...(row.content ? { content: row.content } : {}),
    ...(row.textContent ? { textContent: row.textContent } : {}),
    ...(row.metadata && typeof row.metadata === 'object'
      ? { metadata: row.metadata as Record<string, unknown> }
      : {}),
  };
}

function toNoteRecord(row: NoteRow, files: NoteFileRecord[]): NoteRecord {
  return {
    id: row.id,
    userId: row.ownerUserid,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    parentNoteId: row.parentNoteId,
    files,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
}

function encodeNoteFeedCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt, id }), 'utf8').toString('base64url');
}

function decodeNoteFeedCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt?: unknown;
      id?: unknown;
    };

    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

function encodeNoteSearchCursor(updatedAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ updatedAt, id }), 'utf8').toString('base64url');
}

function decodeNoteSearchCursor(cursor: string): { updatedAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      updatedAt?: unknown;
      id?: unknown;
    };

    if (typeof parsed.updatedAt !== 'string' || typeof parsed.id !== 'string') {
      return null;
    }

    return {
      updatedAt: parsed.updatedAt,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

export const NoteRepository = {
  /**
   * Fetch attached files grouped by note ID.
   */
  async getAttachedFiles(
    handle: DbHandle,
    noteIds: string[],
  ): Promise<Map<string, NoteFileRecord[]>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const rows = (await handle
      .selectFrom('app.noteFiles as noteFile')
      .innerJoin('app.files as file', 'file.id', 'noteFile.fileId')
      .select([
        'noteFile.noteId as noteId',
        'file.id',
        'file.originalName',
        'file.mimetype',
        'file.size',
        'file.url',
        'file.content',
        'file.textContent',
        'file.metadata',
        'file.createdat',
      ])
      .where('noteFile.noteId', 'in', noteIds)
      .orderBy('noteFile.attachedAt', 'asc')
      .execute()) as AttachedFileRow[];

    const result = new Map<string, NoteFileRecord[]>();
    for (const row of rows) {
      const current = result.get(row.noteId) ?? [];
      current.push(toNoteFile(row));
      result.set(row.noteId, current);
    }
    return result;
  },

  /**
   * Get a single note by ID, enforcing ownership.
   * Returns null if not found.
   */
  async getOwned(handle: DbHandle, noteId: string, userId: string): Promise<NoteRow | null> {
    const note = await handle
      .selectFrom('app.notes')
      .selectAll()
      .where('id', '=', noteId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    return (note as NoteRow | undefined) ?? null;
  },

  /**
   * Get a note by ID with ownership check. Throws NotFoundError if missing.
   */
  async getOwnedOrThrow(handle: DbHandle, noteId: string, userId: string): Promise<NoteRow> {
    const note = await NoteRepository.getOwned(handle, noteId, userId);
    if (!note) {
      throw new NotFoundError('Note', { noteId });
    }
    return note;
  },

  /**
   * Load a note with its attached files, ready for API response.
   */
  async load(handle: DbHandle, noteId: string, userId: string): Promise<NoteRecord> {
    const note = await NoteRepository.getOwnedOrThrow(handle, noteId, userId);
    const attachedFiles = await NoteRepository.getAttachedFiles(handle, [note.id]);
    return toNoteRecord(note, attachedFiles.get(note.id) ?? []);
  },

  /**
   * List notes for a user with filtering and sorting.
   */
  async list(handle: DbHandle, input: ListNotesInput): Promise<NoteRecord[]> {
    let query = handle
      .selectFrom('app.notes')
      .selectAll()
      .where('ownerUserid', '=', input.userId)
      .where('archivedAt', 'is', null);

    if (input.since) {
      query = query.where('updatedat', '>=', new Date(input.since).toISOString());
    }

    if (input.source) {
      query = query.where('source', '=', input.source);
    }

    if (input.query) {
      const pattern = `%${input.query.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('title', 'ilike', pattern),
          eb('content', 'ilike', pattern),
          eb('excerpt', 'ilike', pattern),
        ]),
      );
    }

    if (input.sortBy === 'title') {
      query = query.orderBy('title', input.sortOrder ?? 'asc');
    } else if (input.sortBy === 'createdAt') {
      query = query.orderBy('createdat', input.sortOrder ?? 'desc');
    } else {
      query = query.orderBy('updatedat', input.sortOrder ?? 'desc');
    }

    const limit = input.limit ? Math.min(input.limit, 100) : 50;
    const offset = input.offset ?? 0;

    const rows = (await query.limit(limit).offset(offset).execute()) as NoteRow[];
    const attachedFiles = await NoteRepository.getAttachedFiles(
      handle,
      rows.map((r) => r.id),
    );

    return rows.map((row) => toNoteRecord(row, attachedFiles.get(row.id) ?? []));
  },

  async listFeed(handle: DbHandle, input: ListNoteFeedInput): Promise<NoteFeedPageRecord> {
    const limit = input.limit ? Math.min(input.limit, 100) : 20;
    let query = handle
      .selectFrom('app.notes')
      .select(['id', 'title', 'excerpt', 'content', 'createdat', 'ownerUserid'])
      .where('ownerUserid', '=', input.userId)
      .where('archivedAt', 'is', null)
      .orderBy('createdat', 'desc')
      .orderBy('id', 'desc');

    if (input.cursor) {
      const decoded = decodeNoteFeedCursor(input.cursor);

      if (!decoded) {
        throw new ValidationError('Invalid note feed cursor');
      }

      const cursorDate = new Date(decoded.createdAt).toISOString();
      query = query.where((eb) =>
        eb.or([
          eb('createdat', '<', cursorDate),
          eb.and([eb('createdat', '=', cursorDate), eb('id', '<', decoded.id)]),
        ]),
      );
    }

    const rows = (await query.limit(limit + 1).execute()) as NoteFeedRow[];
    const pageRows = rows.slice(0, limit);

    const attachmentRows =
      pageRows.length === 0
        ? []
        : ((await handle
            .selectFrom('app.noteFiles')
            .select('noteId as noteId')
            .where(
              'noteId',
              'in',
              pageRows.map((row) => row.id),
            )
            .groupBy('noteId')
            .execute()) as NoteFeedAttachmentRow[]);
    const attachmentIds = new Set(attachmentRows.map((row) => row.noteId));

    const notes = pageRows.map<NoteFeedRecord>((row) => ({
      id: row.id,
      title: row.title,
      contentPreview: buildContentPreview(row.excerpt, row.content),
      createdAt: new Date(row.createdat).toISOString(),
      authorId: row.ownerUserid,
      metadata: {
        hasAttachments: attachmentIds.has(row.id),
      },
    }));
    const lastRow = pageRows.at(-1);

    return {
      notes,
      nextCursor:
        rows.length > limit && lastRow
          ? encodeNoteFeedCursor(new Date(lastRow.createdat).toISOString(), lastRow.id)
          : null,
    };
  },

  /**
   * Search notes by title/content text match.
   */
  async search(handle: DbHandle, input: SearchNotesInput): Promise<SearchNotesPageRecord> {
    const limit = input.limit ? Math.min(input.limit, 20) : 10;
    const pattern = `%${input.query}%`;
    const decoded = input.cursor ? decodeNoteSearchCursor(input.cursor) : null;

    let query = handle
      .selectFrom('app.notes')
      .select(['id', 'title', 'excerpt', 'updatedat'])
      .where('ownerUserid', '=', input.userId)
      .where('archivedAt', 'is', null)
      .where((eb) => eb.or([eb('title', 'ilike', pattern), eb('content', 'ilike', pattern)]));

    if (decoded) {
      query = query.where((eb) =>
        eb.or([
          eb('updatedat', '<', new Date(decoded.updatedAt).toISOString()),
          eb('updatedat', '=', new Date(decoded.updatedAt).toISOString()).and(
            'id',
            '<',
            decoded.id,
          ),
        ]),
      );
    }

    const rows = (await query
      .orderBy('updatedat', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute()) as Array<Pick<NoteRow, 'id' | 'title' | 'excerpt' | 'updatedat'>>;

    const notes = rows.slice(0, limit).map((note) => ({
      id: note.id,
      title: note.title,
      excerpt: note.excerpt,
    }));

    const lastRow = rows.at(limit - 1);

    return {
      notes,
      nextCursor:
        rows.length > limit && lastRow
          ? encodeNoteSearchCursor(new Date(lastRow.updatedat).toISOString(), lastRow.id)
          : null,
    };
  },

  /**
   * Insert a new note.
   */
  async create(handle: DbHandle, input: CreateNoteInput): Promise<NoteRecord> {
    if (input.parentNoteId) {
      await NoteRepository.getOwnedOrThrow(handle, input.parentNoteId, input.userId);
    }

    const created = await handle
      .insertInto('app.notes')
      .values({
        ownerUserid: input.userId,
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
        ...(input.parentNoteId ? { parentNoteId: input.parentNoteId } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toNoteRecord(created as NoteRow, []);
  },

  /**
   * Update an existing note with ownership enforcement.
   */
  async update(handle: DbHandle, command: UpdateNoteCommand): Promise<void> {
    const sets: UpdateObject<Database, 'app.notes'> = {
      updatedat: new Date().toISOString(),
    };
    const input = command.input;
    if (input.title !== undefined) sets.title = input.title;
    if (input.content !== undefined) sets.content = input.content;
    if (input.excerpt !== undefined) sets.excerpt = input.excerpt;

    const updated = await handle
      .updateTable('app.notes')
      .set(sets)
      .where('id', '=', command.noteId)
      .where('ownerUserid', '=', command.userId)
      .returning('id')
      .executeTakeFirst();

    if (!updated) {
      throw new NotFoundError('Note', { noteId: command.noteId });
    }
  },

  /**
   * Delete a note by ID with ownership enforcement.
   */
  /**
   * Soft delete (archive) a note by ID with ownership enforcement.
   * Sets archivedAt timestamp; note remains in database but is filtered from queries.
   */
  async archive(handle: DbHandle, command: NoteMutationCommand): Promise<void> {
    const updated = await handle
      .updateTable('app.notes')
      .set({ archivedAt: new Date() })
      .where('id', '=', command.noteId)
      .where('ownerUserid', '=', command.userId)
      .returning('id')
      .executeTakeFirst();

    if (!updated) throw new NotFoundError('Note', { noteId: command.noteId });
  },

  async unarchive(handle: DbHandle, command: NoteMutationCommand): Promise<void> {
    const updated = await handle
      .updateTable('app.notes')
      .set({ archivedAt: null })
      .where('id', '=', command.noteId)
      .where('ownerUserid', '=', command.userId)
      .returning('id')
      .executeTakeFirst();

    if (!updated) throw new NotFoundError('Note', { noteId: command.noteId });
  },

  /**
   * Hard delete a note by ID with ownership enforcement.
   * Permanently removes note from database. Use sparingly; prefer archive() for soft delete.
   */
  async hardDelete(handle: DbHandle, command: NoteMutationCommand): Promise<void> {
    const deleted = await handle
      .deleteFrom('app.notes')
      .where('id', '=', command.noteId)
      .where('ownerUserid', '=', command.userId)
      .returning('id')
      .executeTakeFirst();

    if (!deleted) throw new NotFoundError('Note', { noteId: command.noteId });
  },

  /**
   * Sync note-file attachments. Validates file ownership, then replaces all.
   * MUST be called inside a transaction for atomicity.
   */
  async syncFiles(handle: DbHandle, command: SyncNoteFilesCommand): Promise<void> {
    await NoteRepository.getOwnedOrThrow(handle, command.noteId, command.userId);
    const uniqueFileIds = [...new Set(command.fileIds)];

    if (uniqueFileIds.length === 0) {
      await handle.deleteFrom('app.noteFiles').where('noteId', '=', command.noteId).execute();
      return;
    }

    const ownedFiles = (await handle
      .selectFrom('app.files')
      .select('id')
      .where('ownerUserid', '=', command.userId)
      .where('id', 'in', uniqueFileIds)
      .execute()) as Array<{ id: string }>;

    if (ownedFiles.length !== uniqueFileIds.length) {
      throw new ValidationError('One or more files are unavailable for this note');
    }

    await handle.deleteFrom('app.noteFiles').where('noteId', '=', command.noteId).execute();
    await handle
      .insertInto('app.noteFiles')
      .values(uniqueFileIds.map((fileId) => ({ noteId: command.noteId, fileId })))
      .execute();
  },
};
