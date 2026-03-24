import type { User } from '@hominem/auth/server';
import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addMessages: vi.fn(),
  archiveChatQuery: vi.fn(),
  convertToCoreMessages: vi.fn(),
  createChatQuery: vi.fn(),
  deleteChatQuery: vi.fn(),
  generateObject: vi.fn(),
  generateText: vi.fn(),
  getAvailableTools: vi.fn(),
  getChatByIdQuery: vi.fn(),
  getChatByNoteIdQuery: vi.fn(),
  getChatMessages: vi.fn(),
  getFile: vi.fn(),
  getFileUrl: vi.fn(),
  getOpenAIAdapter: vi.fn(),
  getUserChatsQuery: vi.fn(),
  listUserFiles: vi.fn(),
  loggerError: vi.fn(),
  loggerInfo: vi.fn(),
  processFile: vi.fn(),
  setReviewItem: vi.fn(),
  streamText: vi.fn(),
  updateChatTitleQuery: vi.fn(),
}));

vi.mock('@hominem/chat-services', () => ({
  MessageService: class {
    addMessages = mocks.addMessages;
    getChatMessages = mocks.getChatMessages;
  },
  archiveChatQuery: mocks.archiveChatQuery,
  createChatQuery: mocks.createChatQuery,
  deleteChatQuery: mocks.deleteChatQuery,
  getChatByIdQuery: mocks.getChatByIdQuery,
  getChatByNoteIdQuery: mocks.getChatByNoteIdQuery,
  getUserChatsQuery: mocks.getUserChatsQuery,
  updateChatTitleQuery: mocks.updateChatTitleQuery,
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

vi.mock('@hominem/utils/logger', () => ({
  logger: {
    error: mocks.loggerError,
    info: mocks.loggerInfo,
  },
}));

vi.mock('ai', () => ({
  convertToCoreMessages: mocks.convertToCoreMessages,
  generateObject: mocks.generateObject,
  generateText: mocks.generateText,
  streamText: mocks.streamText,
}));

vi.mock('../utils/llm', () => ({
  getOpenAIAdapter: mocks.getOpenAIAdapter,
}));

vi.mock('../utils/tools', () => ({
  getAvailableTools: mocks.getAvailableTools,
}));

vi.mock('../services/review-store', () => ({
  setReviewItem: mocks.setReviewItem,
}));

import type { AppContext } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { chatsRoutes } from './chats';

const testUserId = '00000000-0000-4000-8000-000000000001';
const testFileId = '11111111-1111-4111-8111-111111111111';
const nowIso = '2026-03-24T12:00:00.000Z';

function createUser(): User {
  return {
    id: testUserId,
    email: 'chat-upload-test@hominem.test',
    isAdmin: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

function createApp() {
  const app = new Hono<AppContext>().onError(apiErrorHandler);

  app.use('/api/chats/*', async (c, next) => {
    c.set('user', createUser());
    c.set('userId', testUserId);
    await next();
  });

  app.route('/api/chats', chatsRoutes);

  return app;
}

async function postJson(
  app: Hono<AppContext>,
  path: string,
  body: Record<string, string | string[]>,
) {
  return app.request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('chatsRoutes send with attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getOpenAIAdapter.mockReturnValue({ modelId: 'test-model' });
    mocks.getAvailableTools.mockReturnValue({});
    mocks.getChatByIdQuery.mockResolvedValue({
      archivedAt: null,
      createdAt: nowIso,
      id: 'chat-1',
      noteId: null,
      title: 'Test chat',
      updatedAt: nowIso,
      userId: testUserId,
    });
    mocks.getChatMessages.mockResolvedValue([]);
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
    mocks.generateText.mockResolvedValue({
      text: 'Assistant reply',
      toolCalls: [],
    });
    mocks.addMessages.mockImplementation(
      async (
        messages: Array<{
          chatId: string;
          content: string;
          files?: unknown;
          role: string;
          toolCalls?: unknown;
          userId: string;
        }>,
      ) =>
        messages.map((message, index: number) => ({
          chatId: message.chatId,
          content: message.content,
          createdAt: nowIso,
          files: message.files ?? null,
          id: `message-${index + 1}`,
          parentMessageId: null,
          reasoning: null,
          role: message.role,
          toolCalls: message.toolCalls ?? null,
          updatedAt: nowIso,
          userId: message.userId,
        })),
    );
  });

  test('accepts attachment-backed sends and persists user message files', async () => {
    const response = await postJson(createApp(), '/api/chats/chat-1/send', {
      fileIds: [testFileId],
      message: '',
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      messages: {
        user: {
          content: string;
          files: Array<{
            fileId?: string;
            filename?: string;
            metadata?: Record<string, unknown>;
          }> | null;
        };
      };
    };

    expect(body.messages.user.content).toBe('');
    expect(body.messages.user.files).toMatchObject([
      {
        fileId: testFileId,
        filename: 'receipt.png',
        metadata: {
          extractedText: 'Receipt for lunch',
        },
      },
    ]);

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            content: expect.stringContaining('Attached files:'),
            role: 'user',
          },
        ],
      }),
    );
  });

  test('returns validation error when an uploaded file cannot be resolved', async () => {
    mocks.listUserFiles.mockResolvedValue([]);
    mocks.getFile.mockResolvedValue(null);
    mocks.getFileUrl.mockResolvedValue(null);

    const response = await postJson(createApp(), '/api/chats/chat-1/send', {
      fileIds: [testFileId],
      message: '',
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: 'VALIDATION_ERROR',
      error: 'validation_error',
      message: `Uploaded file ${testFileId} is not available`,
    });
  });
});
