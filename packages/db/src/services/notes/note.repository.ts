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

export type NoteKind = 'note' | 'memory';

export interface NoteRecord {
  id: string;
  userId: string;
  kind: NoteKind;
  title: string | null;
  content: string;
  excerpt: string | null;
  files: NoteFileRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  userId: string;
  kind?: NoteKind;
  title: string | null;
  content: string;
  excerpt: string | null;
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
  kind?: NoteKind;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchNotesInput {
  userId: string;
  query: string;
  limit?: number;
  cursor?: string;
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
    kind: row.kind as NoteKind,
    title: row.title,
    content: row.content,
    excerpt: row.excerpt,
    files,
    createdAt: new Date(row.createdat).toISOString(),
    updatedAt: new Date(row.updatedat).toISOString(),
  };
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
  async getAttachedFiles(
    handle: DbHandle,
    noteIds: string[],
  ): Promise<Map<string, NoteFileRecord[]>> {
    if (noteIds.length === 0) {
      return new Map();
    }

    const rows = await handle
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
      .execute();

    const result = new Map<string, NoteFileRecord[]>();
    for (const row of rows) {
      const current = result.get(row.noteId) ?? [];
      current.push(toNoteFile(row));
      result.set(row.noteId, current);
    }
    return result;
  },

  async getOwned(handle: DbHandle, noteId: string, userId: string): Promise<NoteRow | null> {
    const note = await handle
      .selectFrom('app.notes')
      .selectAll()
      .where('id', '=', noteId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    return note ?? null;
  },

  async getOwnedOrThrow(handle: DbHandle, noteId: string, userId: string): Promise<NoteRow> {
    const note = await NoteRepository.getOwned(handle, noteId, userId);
    if (!note) {
      throw new NotFoundError('Note', { noteId });
    }
    return note;
  },

  async load(handle: DbHandle, noteId: string, userId: string): Promise<NoteRecord> {
    const note = await NoteRepository.getOwnedOrThrow(handle, noteId, userId);
    const attachedFiles = await NoteRepository.getAttachedFiles(handle, [note.id]);
    return toNoteRecord(note, attachedFiles.get(note.id) ?? []);
  },

  async list(handle: DbHandle, input: ListNotesInput): Promise<NoteRecord[]> {
    let query = handle.selectFrom('app.notes').selectAll().where('ownerUserid', '=', input.userId);

    if (input.since) {
      query = query.where('updatedat', '>=', new Date(input.since).toISOString());
    }

    if (input.kind) {
      query = query.where('kind', '=', input.kind);
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

    const rows = await query.limit(limit).offset(offset).execute();
    const attachedFiles = await NoteRepository.getAttachedFiles(
      handle,
      rows.map((r) => r.id),
    );

    return rows.map((row) => toNoteRecord(row, attachedFiles.get(row.id) ?? []));
  },

  async search(handle: DbHandle, input: SearchNotesInput): Promise<SearchNotesPageRecord> {
    const limit = input.limit ? Math.min(input.limit, 20) : 10;
    const pattern = `%${input.query}%`;
    const decoded = input.cursor ? decodeNoteSearchCursor(input.cursor) : null;

    let query = handle
      .selectFrom('app.notes')
      .select(['id', 'title', 'excerpt', 'updatedat'])
      .where('ownerUserid', '=', input.userId)
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

    const rows = await query
      .orderBy('updatedat', 'desc')
      .orderBy('id', 'desc')
      .limit(limit + 1)
      .execute();

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

  async create(handle: DbHandle, input: CreateNoteInput): Promise<NoteRecord> {
    const created = await handle
      .insertInto('app.notes')
      .values({
        ownerUserid: input.userId,
        kind: input.kind ?? 'note',
        title: input.title,
        content: input.content,
        excerpt: input.excerpt,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toNoteRecord(created, []);
  },

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

  async hardDelete(handle: DbHandle, command: NoteMutationCommand): Promise<void> {
    const deleted = await handle
      .deleteFrom('app.notes')
      .where('id', '=', command.noteId)
      .where('ownerUserid', '=', command.userId)
      .returning('id')
      .executeTakeFirst();

    if (!deleted) throw new NotFoundError('Note', { noteId: command.noteId });
  },

  // Needs to run inside a transaction — it validates file ownership then replaces the whole set
  async syncFiles(handle: DbHandle, command: SyncNoteFilesCommand): Promise<void> {
    await NoteRepository.getOwnedOrThrow(handle, command.noteId, command.userId);
    const uniqueFileIds = [...new Set(command.fileIds)];

    if (uniqueFileIds.length === 0) {
      await handle.deleteFrom('app.noteFiles').where('noteId', '=', command.noteId).execute();
      return;
    }

    const ownedFiles = await handle
      .selectFrom('app.files')
      .select('id')
      .where('ownerUserid', '=', command.userId)
      .where('id', 'in', uniqueFileIds)
      .execute();

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
