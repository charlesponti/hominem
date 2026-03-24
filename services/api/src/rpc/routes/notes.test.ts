import type { User } from '@hominem/auth/server';
import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const state = {
    insertedNote: null as null | Record<string, unknown>,
    selectedNote: null as null | Record<string, unknown>,
    updatedValues: null as null | Record<string, unknown>,
  };

  return {
    deleteExecute: vi.fn().mockResolvedValue(undefined),
    executeNoteTags: vi.fn().mockResolvedValue([]),
    getFile: vi.fn(),
    getFileUrl: vi.fn(),
    insertNoteExecute: vi.fn().mockResolvedValue(undefined),
    listUserFiles: vi.fn(),
    processFile: vi.fn(),
    selectNoteExecuteTakeFirst: vi.fn(async () => state.selectedNote),
    state,
    updateNoteExecute: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@hominem/db', () => ({
  NotFoundError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  },
  db: {
    deleteFrom: vi.fn(() => ({
      where: vi.fn(() => ({
        execute: mocks.deleteExecute,
      })),
    })),
    insertInto: vi.fn((table: string) => {
      if (table === 'notes') {
        return {
          values: vi.fn((values: Record<string, unknown>) => {
            mocks.state.insertedNote = {
              analysis: values.analysis ?? null,
              content: values.content,
              created_at: values.created_at,
              excerpt: values.excerpt ?? null,
              id: values.id,
              is_latest_version: true,
              mentions: values.mentions ?? null,
              parent_note_id: null,
              published_at: null,
              publishing_metadata: values.publishing_metadata ?? null,
              scheduled_for: null,
              status: values.status,
              title: values.title,
              type: values.type,
              updated_at: values.updated_at,
              user_id: values.user_id,
              version_number: 1,
            };
            mocks.state.selectedNote = mocks.state.insertedNote;

            return {
              execute: mocks.insertNoteExecute,
            };
          }),
        };
      }

      return {
        values: vi.fn(() => ({
          execute: vi.fn().mockResolvedValue(undefined),
          onConflict: vi.fn(() => ({ execute: vi.fn().mockResolvedValue(undefined) })),
        })),
      };
    }),
    selectFrom: vi.fn((table: string) => {
      if (table === 'notes') {
        return {
          selectAll: vi.fn(() => ({
            where: vi.fn(() => ({
              executeTakeFirst: mocks.selectNoteExecuteTakeFirst,
            })),
          })),
        };
      }

      if (table === 'note_tags') {
        return {
          innerJoin: vi.fn(() => ({
            select: vi.fn(() => ({
              where: vi.fn(() => ({
                execute: mocks.executeNoteTags,
              })),
            })),
          })),
        };
      }

      if (table === 'tags') {
        return {
          select: vi.fn(() => ({
            where: vi.fn(() => ({
              execute: vi.fn().mockResolvedValue([]),
              executeTakeFirst: vi.fn().mockResolvedValue(undefined),
            })),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    updateTable: vi.fn(() => ({
      set: vi.fn((values: Record<string, unknown>) => {
        mocks.state.updatedValues = values;

        if (mocks.state.selectedNote) {
          mocks.state.selectedNote = {
            ...mocks.state.selectedNote,
            ...values,
            content: values.content ?? mocks.state.selectedNote.content,
            updated_at: values.updated_at ?? mocks.state.selectedNote.updated_at,
          };
        }

        return {
          where: vi.fn(() => ({
            execute: mocks.updateNoteExecute,
          })),
        };
      }),
    })),
  },
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

function createUser(): User {
  return {
    id: testUserId,
    email: 'notes-upload-test@hominem.test',
    isAdmin: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function createApp() {
  const app = new Hono<AppContext>().onError(apiErrorHandler);

  app.use('/api/notes/*', async (c, next) => {
    c.set('user', createUser());
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

    mocks.state.insertedNote = null;
    mocks.state.updatedValues = null;
    mocks.state.selectedNote = {
      analysis: null,
      content: 'Draft body',
      created_at: nowIso,
      excerpt: 'Draft body',
      id: 'note-1',
      is_latest_version: true,
      mentions: null,
      parent_note_id: null,
      published_at: null,
      publishing_metadata: null,
      scheduled_for: null,
      status: 'draft',
      title: 'Draft',
      type: 'note',
      updated_at: nowIso,
      user_id: testUserId,
      version_number: 1,
    };

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

  test('appends uploaded attachments when creating a note', async () => {
    const response = await requestJson(createApp(), '/api/notes', 'POST', {
      content: 'Trip notes',
      fileIds: [testFileId],
      type: 'note',
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      content:
        'Trip notes\n\n## Attachments\n- [receipt.png](https://cdn.example.com/uploads/receipt.png) - image, image/png',
    });
  });

  test('appends uploaded attachments when updating a note', async () => {
    const response = await requestJson(createApp(), '/api/notes/note-1', 'PATCH', {
      fileIds: [testFileId],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      content:
        'Draft body\n\n## Attachments\n- [receipt.png](https://cdn.example.com/uploads/receipt.png) - image, image/png',
    });
    expect(mocks.state.updatedValues).toMatchObject({
      content:
        'Draft body\n\n## Attachments\n- [receipt.png](https://cdn.example.com/uploads/receipt.png) - image, image/png',
    });
  });
});
