import type { User } from '@hominem/auth/server';
import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createPreparedUpload: vi.fn(),
  deleteExecute: vi.fn(),
  deleteFileByKey: vi.fn(),
  fileExists: vi.fn(),
  getFileByPath: vi.fn(),
  getPublicUrlForPath: vi.fn(),
  getSignedUrl: vi.fn(),
  insertTakeFirstOrThrow: vi.fn(),
  isOwnedFilePath: vi.fn(),
  loggerError: vi.fn(),
  queueAdd: vi.fn(),
  selectExecute: vi.fn(),
  selectTakeFirst: vi.fn(),
  updateExecute: vi.fn(),
}));

function createSelectBuilder() {
  const builder = {
    orderBy: () => builder,
    selectAll: () => ({
      execute: mocks.selectExecute,
      executeTakeFirst: mocks.selectTakeFirst,
    }),
    where: () => builder,
  };

  return builder;
}

function createInsertBuilder() {
  const builder = {
    returningAll: () => ({
      executeTakeFirstOrThrow: mocks.insertTakeFirstOrThrow,
    }),
    values: () => builder,
  };

  return builder;
}

function createUpdateBuilder() {
  const builder = {
    execute: mocks.updateExecute,
    set: () => builder,
    where: () => builder,
  };

  return builder;
}

function createDeleteBuilder() {
  const builder = {
    execute: mocks.deleteExecute,
    where: () => builder,
  };

  return builder;
}

vi.mock('@hominem/db', () => ({
  db: {
    deleteFrom: vi.fn(() => createDeleteBuilder()),
    insertInto: vi.fn(() => createInsertBuilder()),
    selectFrom: vi.fn(() => createSelectBuilder()),
    updateTable: vi.fn(() => createUpdateBuilder()),
  },
}));

vi.mock('@hominem/queues', () => ({
  fileProcessingQueue: {
    add: mocks.queueAdd,
  },
}));

vi.mock('@hominem/utils/storage', () => ({
  fileStorageService: {
    createPreparedUpload: mocks.createPreparedUpload,
    deleteFileByKey: mocks.deleteFileByKey,
    fileExists: mocks.fileExists,
    getFileByPath: mocks.getFileByPath,
    getPublicUrlForPath: mocks.getPublicUrlForPath,
    getSignedUrl: mocks.getSignedUrl,
    isOwnedFilePath: mocks.isOwnedFilePath,
  },
}));

vi.mock('@hominem/utils/logger', () => ({
  logger: {
    error: mocks.loggerError,
  },
}));

import type { AppContext } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { filesRoutes } from './files';
import { FilesService } from './files/service';

const testUserId = '00000000-0000-4000-8000-000000000001';
const testFileId = '11111111-1111-4111-8111-111111111111';
const testKey = `users/${testUserId}/chats/${testFileId}.pdf`;
const nowIso = '2025-03-01T12:00:00.000Z';

function createUser(): User {
  return {
    createdAt: nowIso,
    email: 'upload-test@hominem.test',
    id: testUserId,
    isAdmin: false,
    updatedAt: nowIso,
  };
}

function createFileRow(
  overrides: Partial<{
    content: string | null;
    created_at: Date;
    error: string | null;
    failed_at: Date | null;
    key: string;
    metadata: Record<string, unknown> | null;
    mimetype: string;
    original_name: string;
    processed_at: Date | null;
    size: number | bigint | string;
    status: string;
    summary: string | null;
    text_content: string | null;
    thumbnail: string | null;
    type: string;
    updated_at: Date;
    uploaded_at: Date;
    url: string | null;
    user_id: string;
    vector_ids: string[] | null;
  }> = {},
) {
  return {
    content: null,
    created_at: new Date(nowIso),
    error: null,
    failed_at: null,
    id: testFileId,
    key: testKey,
    metadata: null,
    mimetype: 'application/pdf',
    original_name: 'report.pdf',
    processed_at: null,
    size: 512,
    status: 'pending',
    summary: null,
    text_content: null,
    thumbnail: null,
    type: 'document',
    updated_at: new Date(nowIso),
    uploaded_at: new Date(nowIso),
    url: 'https://cdn.example.com/uploads/report.pdf',
    user_id: testUserId,
    vector_ids: null,
    ...overrides,
  };
}

function createApp(options: { authenticated?: boolean } = {}) {
  const app = new Hono<AppContext>().onError(apiErrorHandler);

  if (options.authenticated !== false) {
    app.use('/api/files/*', async (c, next) => {
      c.set('user', createUser());
      c.set('userId', testUserId);
      await next();
    });
  }

  app.route('/api/files', filesRoutes);

  return app;
}

async function requestJson(
  app: Hono<AppContext>,
  path: string,
  method: 'DELETE' | 'GET' | 'POST',
  body?: Record<string, number | string>,
) {
  return app.request(`http://localhost${path}`, {
    ...(body
      ? {
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      : {}),
    method,
  });
}

describe('filesRoutes direct upload lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createPreparedUpload.mockResolvedValue({
      expiresAt: new Date('2025-03-01T12:05:00.000Z'),
      headers: {
        'Content-Type': 'application/pdf',
      },
      id: testFileId,
      key: testKey,
      mimetype: 'application/pdf',
      originalName: 'report.pdf',
      size: 512,
      uploadUrl: 'https://uploads.example.com/signed-put',
      uploadedAt: new Date(nowIso),
      url: 'https://cdn.example.com/report.pdf',
    });
    mocks.deleteExecute.mockResolvedValue(undefined);
    mocks.deleteFileByKey.mockResolvedValue(true);
    mocks.fileExists.mockResolvedValue(true);
    mocks.getFileByPath.mockResolvedValue(Buffer.from([1, 2, 3, 4]));
    mocks.getPublicUrlForPath.mockReturnValue('https://cdn.example.com/uploads/report.pdf');
    mocks.getSignedUrl.mockResolvedValue('https://downloads.example.com/report.pdf');
    mocks.insertTakeFirstOrThrow.mockResolvedValue(createFileRow());
    mocks.isOwnedFilePath.mockReturnValue(true);
    mocks.queueAdd.mockResolvedValue(undefined);
    mocks.selectExecute.mockResolvedValue([createFileRow()]);
    mocks.selectTakeFirst.mockResolvedValue(createFileRow());
    mocks.updateExecute.mockResolvedValue(undefined);
  });

  test('returns signed upload metadata for upload_url', async () => {
    const response = await requestJson(createApp(), '/api/files/upload_url', 'POST', {
      mimetype: 'application/pdf',
      originalName: 'report.pdf',
      size: 512,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      expiresAt: '2025-03-01T12:05:00.000Z',
      fileId: testFileId,
      headers: {
        'Content-Type': 'application/pdf',
      },
      key: testKey,
      uploadUrl: 'https://uploads.example.com/signed-put',
    });
    expect(mocks.createPreparedUpload).toHaveBeenCalledWith(
      {
        mimetype: 'application/pdf',
        originalName: 'report.pdf',
        size: 512,
      },
      testUserId,
    );
  });

  test('register persists the file and enqueues background processing', async () => {
    const response = await requestJson(createApp(), '/api/files/register', 'POST', {
      key: testKey,
      mimetype: 'application/pdf',
      originalName: 'report.pdf',
      size: 512,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      file: {
        id: testFileId,
        key: testKey,
        mimetype: 'application/pdf',
        originalName: 'report.pdf',
        status: 'pending',
        type: 'document',
      },
      queued: true,
    });
    expect(mocks.insertTakeFirstOrThrow).toHaveBeenCalledTimes(1);
    expect(mocks.queueAdd).toHaveBeenCalledWith('process', {
      fileId: testFileId,
      userId: testUserId,
    });
  });

  test('reprocess marks the file as processing and re-enqueues the job', async () => {
    const response = await requestJson(createApp(), `/api/files/${testFileId}/reprocess`, 'POST');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      file: {
        id: testFileId,
        status: 'processing',
      },
      queued: true,
    });
    expect(mocks.updateExecute).toHaveBeenCalledTimes(1);
    expect(mocks.queueAdd).toHaveBeenCalledWith('process', {
      fileId: testFileId,
      reprocess: true,
      userId: testUserId,
    });
  });

  test('get returns raw binary bytes with the stored content type', async () => {
    const response = await requestJson(createApp(), `/api/files/${testFileId}`, 'GET');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(mocks.getFileByPath).toHaveBeenCalledWith(testKey);
  });

  test('delete removes the stored object by key', async () => {
    const response = await requestJson(createApp(), `/api/files/${testFileId}`, 'DELETE');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
    });
    expect(mocks.deleteFileByKey).toHaveBeenCalledWith(testKey);
  });
});

describe('FilesService DB-backed registry', () => {
  const service = new FilesService();

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createPreparedUpload.mockResolvedValue({
      expiresAt: new Date('2025-03-01T12:05:00.000Z'),
      headers: {
        'Content-Type': 'application/pdf',
      },
      id: testFileId,
      key: testKey,
      mimetype: 'application/pdf',
      originalName: 'report.pdf',
      size: 512,
      uploadUrl: 'https://uploads.example.com/signed-put',
      uploadedAt: new Date(nowIso),
      url: 'https://cdn.example.com/report.pdf',
    });
    mocks.deleteExecute.mockResolvedValue(undefined);
    mocks.deleteFileByKey.mockResolvedValue(true);
    mocks.fileExists.mockResolvedValue(true);
    mocks.getFileByPath.mockResolvedValue(Buffer.from([1, 2, 3, 4]));
    mocks.getPublicUrlForPath.mockReturnValue('https://cdn.example.com/uploads/report.pdf');
    mocks.getSignedUrl.mockResolvedValue('https://downloads.example.com/report.pdf');
    mocks.insertTakeFirstOrThrow.mockResolvedValue(
      createFileRow({
        content: 'Short summary',
        metadata: {
          pages: 1,
          summary: 'Short summary',
        },
        processed_at: new Date('2025-03-01T12:05:00.000Z'),
        size: '512',
        status: 'ready',
        summary: 'Short summary',
        text_content: 'Extracted text',
        vector_ids: ['vec-1', 'vec-2'],
      }),
    );
    mocks.isOwnedFilePath.mockReturnValue(true);
    mocks.queueAdd.mockResolvedValue(undefined);
    mocks.selectExecute.mockResolvedValue([
      createFileRow({
        content: 'Short summary',
        metadata: {
          pages: 1,
          summary: 'Short summary',
        },
        processed_at: new Date('2025-03-01T12:05:00.000Z'),
        size: '512',
        status: 'ready',
        summary: 'Short summary',
        text_content: 'Extracted text',
        vector_ids: ['vec-1', 'vec-2'],
      }),
    ]);
    mocks.selectTakeFirst.mockResolvedValue(
      createFileRow({
        content: 'Short summary',
        metadata: {
          pages: 1,
          summary: 'Short summary',
        },
        processed_at: new Date('2025-03-01T12:05:00.000Z'),
        size: '512',
        status: 'ready',
        summary: 'Short summary',
        text_content: 'Extracted text',
        vector_ids: ['vec-1', 'vec-2'],
      }),
    );
    mocks.updateExecute.mockResolvedValue(undefined);
  });

  test('maps persisted DB rows to FileAsset values', async () => {
    const result = await service.listFiles(testUserId);

    expect(result.count).toBe(1);
    expect(result.files[0]).toMatchObject({
      id: testFileId,
      metadata: {
        pages: 1,
        summary: 'Short summary',
      },
      originalName: 'report.pdf',
      size: 512,
      status: 'ready',
      type: 'document',
      uploadedAt: nowIso,
      url: 'https://cdn.example.com/uploads/report.pdf',
    });
  });

  test('register returns the mapped persisted asset from app.files', async () => {
    const result = await service.registerFile(
      {
        key: testKey,
        mimetype: 'application/pdf',
        originalName: 'report.pdf',
        size: 512,
      },
      testUserId,
    );

    expect(result).toMatchObject({
      file: {
        content: 'Short summary',
        originalName: 'report.pdf',
        size: 512,
        summary: 'Short summary',
        textContent: 'Extracted text',
        vectorIds: ['vec-1', 'vec-2'],
      },
      queued: true,
    });
  });
});
