import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFile: vi.fn(),
  getFileUrl: vi.fn(),
  listUserFiles: vi.fn(),
  processFile: vi.fn(),
}));

vi.mock('@hominem/services/files', () => ({
  FileProcessorService: {
    processFile: mocks.processFile,
  },
}));

vi.mock('@hominem/utils/storage', () => ({
  fileStorageService: {
    getFile: mocks.getFile,
    getFileUrl: mocks.getFileUrl,
    listUserFiles: mocks.listUserFiles,
  },
}));

import type { AppContext } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { notesRoutes } from './notes';

const testUserId = '00000000-0000-4000-8000-000000000001';
const testFileId = '11111111-1111-4111-8111-111111111111';
const nowIso = '2026-03-24T12:00:00.000Z';

function createApp() {
  const app = new Hono<AppContext>().onError(apiErrorHandler);

  app.use('/api/notes/*', async (c, next) => {
    c.set('user', {
      id: testUserId,
      email: 'notes-upload-test@hominem.test',
      isAdmin: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    c.set('userId', testUserId);
    await next();
  });

  app.route('/api/notes', notesRoutes);

  return app;
}

async function requestJson(
  app: Hono<AppContext>,
  path: string,
  method: 'POST' | 'PATCH',
  body: Record<string, string | string[] | null>,
) {
  return app.request(`http://localhost${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('notesRoutes attachment-backed create and update', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.listUserFiles.mockResolvedValue([
      {
        name: `${testFileId}-receipt.png`,
        size: 128,
      },
    ]);
    mocks.getFileUrl.mockResolvedValue('https://cdn.example.com/uploads/receipt.png');
    mocks.getFile.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    mocks.processFile.mockResolvedValue({
      content: undefined,
      id: testFileId,
      metadata: {},
      mimetype: 'image/png',
      originalName: 'receipt.png',
      size: 3,
      textContent: 'Receipt for lunch',
      type: 'image',
    });
  });

  // SKIPPED: These tests require database setup with migrations.
  // TODO: Implement proper E2E test infrastructure with:
  // 1. Test database with schema migrations applied
  // 2. Database cleanup between tests
  // 3. Proper seeding of test data
  // See AGENTS.md for testing strategy discussion.
  test.skip('appends uploaded attachments when creating a note', async () => {
    const response = await requestJson(createApp(), '/api/notes', 'POST', {
      content: 'Trip notes',
      fileIds: [testFileId],
      type: 'note',
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.content).toBe(
      'Trip notes\n\n## Attachments\n- [receipt.png](https://cdn.example.com/uploads/receipt.png) - image, image/png',
    );
  });

  test.skip('appends uploaded attachments when updating a note', async () => {
    const response = await requestJson(createApp(), '/api/notes/note-1', 'PATCH', {
      fileIds: [testFileId],
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.content).toBe(
      'Draft body\n\n## Attachments\n- [receipt.png](https://cdn.example.com/uploads/receipt.png) - image, image/png',
    );
  });
});
