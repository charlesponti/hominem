import { isObject } from '@hominem/utils';
import type { Selectable } from 'kysely';

import { NotFoundError } from '../../errors';
import type { DbHandle } from '../../transaction';
import type { AppFiles, JsonValue } from '../../types/database';

type FileRow = Selectable<AppFiles>;

export interface FileRecord {
  id: string;
  userId: string;
  originalName: string;
  type: 'image' | 'audio' | 'video' | 'document' | 'unknown';
  mimetype: string;
  size: number;
  url: string;
  content?: string;
  textContent?: string;
  metadata?: Record<string, unknown>;
  uploadedAt: string;
}

export interface UpsertFileInput {
  id: string;
  userId: string;
  storageKey: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  content?: string | null;
  textContent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DeleteFileCommand {
  fileId: string;
  userId: string;
}

function deriveFileType(mimetype: string): FileRecord['type'] {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('video/')) return 'video';
  if (
    mimetype === 'application/pdf' ||
    mimetype.startsWith('text/') ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    return 'document';
  }
  return 'unknown';
}

function toFileRecord(row: FileRow): FileRecord {
  return {
    id: row.id,
    userId: row.ownerUserid,
    originalName: row.originalName,
    type: deriveFileType(row.mimetype),
    mimetype: row.mimetype,
    size: row.size,
    url: row.url,
    ...(row.content ? { content: row.content } : {}),
    ...(row.textContent ? { textContent: row.textContent } : {}),
    ...(isObject(row.metadata) ? { metadata: row.metadata } : {}),
    uploadedAt: new Date(row.createdat).toISOString(),
  };
}

export const FileRepository = {
  async listForUser(handle: DbHandle, userId: string): Promise<FileRecord[]> {
    const files = await handle
      .selectFrom('app.files')
      .selectAll()
      .where('ownerUserid', '=', userId)
      .orderBy('createdat', 'desc')
      .execute();

    return files.map(toFileRecord);
  },

  async getOwned(handle: DbHandle, fileId: string, userId: string): Promise<FileRecord | null> {
    const file = await handle
      .selectFrom('app.files')
      .selectAll()
      .where('id', '=', fileId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    return file ? toFileRecord(file) : null;
  },

  async getOwnedOrThrow(handle: DbHandle, fileId: string, userId: string): Promise<FileRecord> {
    const file = await FileRepository.getOwned(handle, fileId, userId);
    if (!file) {
      throw new NotFoundError('File', { fileId });
    }
    return file;
  },

  async getUrl(handle: DbHandle, fileId: string, userId: string): Promise<string> {
    const file = await handle
      .selectFrom('app.files')
      .select(['url'])
      .where('id', '=', fileId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    if (!file) {
      throw new NotFoundError('File', { fileId });
    }

    return file.url;
  },

  async existsForUser(handle: DbHandle, fileId: string, userId: string): Promise<boolean> {
    const file = await handle
      .selectFrom('app.files')
      .select(['id'])
      .where('id', '=', fileId)
      .where('ownerUserid', '=', userId)
      .executeTakeFirst();

    return Boolean(file);
  },

  // Called after an upload finishes
  async upsert(handle: DbHandle, input: UpsertFileInput): Promise<FileRecord> {
    const now = new Date().toISOString();

    await handle
      .insertInto('app.files')
      .values({
        id: input.id,
        ownerUserid: input.userId,
        storageKey: input.storageKey,
        originalName: input.originalName,
        mimetype: input.mimetype,
        size: input.size,
        url: input.url,
        content: input.content ?? null,
        textContent: input.textContent ?? null,
        metadata: (input.metadata ?? null) as JsonValue | null,
        createdat: now,
        updatedat: now,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          storageKey: input.storageKey,
          originalName: input.originalName,
          mimetype: input.mimetype,
          size: input.size,
          url: input.url,
          content: input.content ?? null,
          textContent: input.textContent ?? null,
          metadata: (input.metadata ?? null) as JsonValue | null,
          updatedat: now,
        }),
      )
      .execute();

    return FileRepository.getOwnedOrThrow(handle, input.id, input.userId);
  },

  async delete(handle: DbHandle, command: DeleteFileCommand): Promise<void> {
    const deleted = await handle
      .deleteFrom('app.files')
      .where('id', '=', command.fileId)
      .where('ownerUserid', '=', command.userId)
      .returning('id')
      .executeTakeFirst();

    if (!deleted) throw new NotFoundError('File', { fileId: command.fileId });
  },
};
