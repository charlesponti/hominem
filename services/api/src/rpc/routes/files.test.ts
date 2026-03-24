import type { User } from '@hominem/auth/server';
import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createPreparedUpload: vi.fn(),
  fileExists: vi.fn(),
  getFileByPath: vi.fn(),
  getPublicUrlForPath: vi.fn(),
  isOwnedFilePath: vi.fn(),
  loggerError: vi.fn(),
  processFile: vi.fn(),
}));

vi.mock('@hominem/utils/storage', () => ({
  fileStorageService: {
    createPreparedUpload: mocks.createPreparedUpload,
    fileExists: mocks.fileExists,
    getFileByPath: mocks.getFileByPath,
    getPublicUrlForPath: mocks.getPublicUrlForPath,
    isOwnedFilePath: mocks.isOwnedFilePath,
  },
}));

vi.mock('@hominem/services/files', () => ({
  FileProcessorService: {
    processFile: mocks.processFile,
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

const testUserId = '00000000-0000-4000-8000-000000000001';
const testFileId = '11111111-1111-4111-8111-111111111111';
const testKey = `${testUserId}/${testFileId}-report.pdf`;
const nowIso = '2025-03-01T12:00:00.000Z';

function createUser(): User {
  return {
    id: testUserId,
    email: 'upload-test@hominem.test',
    isAdmin: false,
    createdAt: nowIso,
    updatedAt: nowIso,
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

async function postJson(
  app: Hono<AppContext>,
  path: string,
  body: Record<string, string | number>,
) {
  return app.request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('filesRoutes direct upload lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createPreparedUpload.mockResolvedValue({
      id: testFileId,
      key: testKey,
      originalName: 'report.pdf',
      mimetype: 'application/pdf',
      size: 512,
      uploadUrl: 'https://uploads.example.com/signed-put',
      headers: {
        'Content-Type': 'application/pdf',
      },
      url: 'https://cdn.example.com/report.pdf',
      uploadedAt: new Date(nowIso),
      expiresAt: new Date('2025-03-01T12:05:00.000Z'),
    });
    mocks.isOwnedFilePath.mockReturnValue(true);
    mocks.fileExists.mockResolvedValue(true);
    mocks.getFileByPath.mockResolvedValue(Buffer.from('file-body'));
    mocks.getPublicUrlForPath.mockReturnValue('https://cdn.example.com/uploads/report.pdf');
    mocks.processFile.mockResolvedValue({
      id: testFileId,
      originalName: 'report.pdf',
      type: 'document',
      mimetype: 'application/pdf',
      size: 9,
      textContent: 'Extracted text',
      metadata: {
        pages: 1,
      },
    });
  });

  test('rejects prepare-upload when unauthenticated', async () => {
    const response = await postJson(
      createApp({ authenticated: false }),
      '/api/files/prepare-upload',
      {
        originalName: 'report.pdf',
        mimetype: 'application/pdf',
        size: 512,
      },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      error: 'unauthorized',
      message: 'Authentication required',
    });
  });

  test('returns signed upload metadata for prepare-upload', async () => {
    const response = await postJson(createApp(), '/api/files/prepare-upload', {
      originalName: 'report.pdf',
      mimetype: 'application/pdf',
      size: 512,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      fileId: testFileId,
      key: testKey,
      originalName: 'report.pdf',
      mimetype: 'application/pdf',
      size: 512,
      uploadUrl: 'https://uploads.example.com/signed-put',
      headers: {
        'Content-Type': 'application/pdf',
      },
      url: 'https://cdn.example.com/report.pdf',
      uploadedAt: nowIso,
      expiresAt: '2025-03-01T12:05:00.000Z',
    });
    expect(mocks.createPreparedUpload).toHaveBeenCalledWith(
      {
        originalName: 'report.pdf',
        mimetype: 'application/pdf',
        size: 512,
      },
      testUserId,
    );
  });

  test('rejects complete-upload for keys outside the current user scope', async () => {
    mocks.isOwnedFilePath.mockReturnValue(false);

    const response = await postJson(createApp(), '/api/files/complete-upload', {
      fileId: testFileId,
      key: `other-user/${testFileId}-report.pdf`,
      originalName: 'report.pdf',
      mimetype: 'application/pdf',
      size: 512,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      error: 'validation_error',
      message: 'Upload key does not belong to the current user',
    });
    expect(mocks.fileExists).not.toHaveBeenCalled();
    expect(mocks.processFile).not.toHaveBeenCalled();
  });

  test('returns not found when the uploaded object is missing during completion', async () => {
    mocks.fileExists.mockResolvedValue(false);

    const response = await postJson(createApp(), '/api/files/complete-upload', {
      fileId: testFileId,
      key: testKey,
      originalName: 'report.pdf',
      mimetype: 'application/pdf',
      size: 512,
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: 'NOT_FOUND',
      error: 'not_found',
      message: 'Uploaded object not found',
    });
    expect(mocks.getFileByPath).not.toHaveBeenCalled();
    expect(mocks.processFile).not.toHaveBeenCalled();
  });

  test('returns the canonical uploaded file payload after completion', async () => {
    const response = await postJson(createApp(), '/api/files/complete-upload', {
      fileId: testFileId,
      key: testKey,
      originalName: 'report.pdf',
      mimetype: 'application/pdf',
      size: 512,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      success: boolean;
      file: {
        id: string;
        originalName: string;
        type: string;
        mimetype: string;
        size: number;
        textContent?: string;
        url: string;
        uploadedAt: string;
        vectorIds: string[];
      };
      message: string;
    };

    expect(body.success).toBe(true);
    expect(body.message).toBe('Upload completed successfully');
    expect(body.file).toMatchObject({
      id: testFileId,
      originalName: 'report.pdf',
      type: 'document',
      mimetype: 'application/pdf',
      size: 9,
      textContent: 'Extracted text',
      url: 'https://cdn.example.com/uploads/report.pdf',
      vectorIds: [],
    });
    expect(Number.isNaN(Date.parse(body.file.uploadedAt))).toBe(false);
    expect(mocks.processFile).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      'report.pdf',
      'application/pdf',
      testFileId,
    );
    expect(mocks.getPublicUrlForPath).toHaveBeenCalledWith(testKey);
  });
});
