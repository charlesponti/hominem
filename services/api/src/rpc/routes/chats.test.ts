import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';
import { validationErrorMiddleware } from '../middleware/validation';

const mocks = vi.hoisted(() => ({
  listForUser: vi.fn(),
  createChat: vi.fn(),
  getOwnedOrThrow: vi.fn(),
  getMessages: vi.fn(),
  getMessageById: vi.fn(),
  getMessagesBefore: vi.fn(),
  searchMessages: vi.fn(),
  deleteUserMessageAndFollowing: vi.fn(),
  insertMessage: vi.fn(),
  touchLastMessage: vi.fn(),
  replaceAssistantMessageContent: vi.fn(),
  createSpeechRun: vi.fn(),
  getSpeechRun: vi.fn(),
  setSpeechGenerationId: vi.fn(),
  markSpeechComplete: vi.fn(),
  markSpeechReconciliation: vi.fn(),
  getChatSourceContext: vi.fn(),
  resolveChatFiles: vi.fn(),
  runInTransaction: vi.fn(),
  streamChatCompletion: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  assertUnderMonthlyUsageLimit: vi.fn(),
  getSpeechUsageEstimate: vi.fn().mockResolvedValue({
    provider: 'openrouter',
    model: 'test-tts-model',
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    reportedTotalTokens: null,
    costUsd: 0.001,
    cachedPromptTokens: null,
    reasoningTokens: null,
    characterCount: 8,
    costPerCharacterUsd: 0.000125,
    costSource: 'openrouter_model_catalog',
  }),
  enqueueEmbedding: vi.fn(),
  enqueueSpeechUsageReconciliation: vi.fn(),
  streamChatReplySpeech: vi.fn(),
  synthesizeChatReplySpeech: vi.fn(),
  storeFile: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  AUDIO_TTS_MODEL: 'test-tts-model',
  CHAT_MODEL: 'test-chat-model',
  getSpeechUsageEstimate: mocks.getSpeechUsageEstimate,
  getChatCompletionUsage: vi.fn((chunk: { usage?: unknown }) => chunk.usage ?? null),
  streamChatCompletion: mocks.streamChatCompletion,
}));

vi.mock('@hominem/db', async () => {
  const actual = await vi.importActual<typeof import('@hominem/db')>('@hominem/db');
  return {
    ...actual,
    db: {},
    ChatRepository: {
      listForUser: mocks.listForUser,
      create: mocks.createChat,
      getOwnedOrThrow: mocks.getOwnedOrThrow,
      getMessages: mocks.getMessages,
      getMessageById: mocks.getMessageById,
      getMessagesBefore: mocks.getMessagesBefore,
      searchMessages: mocks.searchMessages,
      deleteUserMessageAndFollowing: mocks.deleteUserMessageAndFollowing,
      insertMessage: mocks.insertMessage,
      touchLastMessage: mocks.touchLastMessage,
      replaceAssistantMessageContent: mocks.replaceAssistantMessageContent,
      getChatSourceContext: mocks.getChatSourceContext,
      resolveChatFiles: mocks.resolveChatFiles,
    },
    ChatSpeechRunRepository: {
      create: mocks.createSpeechRun,
      getById: mocks.getSpeechRun,
      setProviderGenerationId: mocks.setSpeechGenerationId,
      markComplete: mocks.markSpeechComplete,
      markReconciliation: mocks.markSpeechReconciliation,
    },
    runInTransaction: mocks.runInTransaction,
  };
});

vi.mock('@hominem/queues', () => ({
  embeddingQueue: {
    add: mocks.enqueueEmbedding,
  },
  chatFileCleanupQueue: {
    add: vi.fn(),
  },
}));

vi.mock('@hominem/storage', () => ({
  fileStorageService: {
    storeFile: mocks.storeFile,
  },
}));

vi.mock('@hominem/telemetry', () => ({
  getTelemetryTracer: () => ({
    startSpan: () => ({
      end: vi.fn(),
      recordException: vi.fn(),
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      setStatus: vi.fn(),
    }),
  }),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../application/ai-usage.service', () => ({
  recordAIUsageEvent: mocks.recordAIUsageEvent,
  assertUnderMonthlyUsageLimit: mocks.assertUnderMonthlyUsageLimit,
  startAIUsageTimer: () => () => 0,
}));

vi.mock('./chat-speech.service', () => ({
  streamChatReplySpeech: mocks.streamChatReplySpeech,
  synthesizeChatReplySpeech: mocks.synthesizeChatReplySpeech,
}));

vi.mock('../../mcp/llm-tools', () => ({
  planChatTools: vi.fn().mockResolvedValue({ capabilities: [], requiresLookup: false, tools: [] }),
}));

// The `/:id/agent` route sits behind rateLimitMiddleware, which lazily
// imports the real Redis client — mock it so tests hitting that route don't
// attempt a real connection (rate-limit fails open on errors, but ioredis's
// default retry behavior can hang well past the test timeout instead of
// rejecting fast).
vi.mock('@hominem/services/redis', () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('./chats.mapper', () => ({
  toChatDto: vi.fn((chat: { id: string }) => ({ id: chat.id })),
  toChatMessageDto: vi.fn((message: unknown) => message),
  toStoredUserMessageContent: vi.fn((message: string) => message),
}));

import { chatsRoutes } from './chats';

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'chat@example.com',
  name: 'Chat Test User',
  emailVerified: true,
  image: null,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createApp() {
  const app = new Hono<AppContext>()
    .onError(apiErrorHandler)
    .use(requestIdMiddleware)
    .use(validationErrorMiddleware);

  app.use('*', async (c, next) => {
    c.set('auth', {
      user: testUser,
      userId: testUser.id,
      credential: 'session',
      scopes: [],
    });
    await next();
  });

  return app.route('/api/chats', chatsRoutes);
}

describe('chat list pagination', () => {
  beforeEach(() => {
    mocks.listForUser.mockClear();
    mocks.listForUser.mockResolvedValue({ chats: [{ id: 'chat-1' }], nextCursor: 'next-page' });
  });

  it('returns a page and forwards the validated cursor options', async () => {
    const response = await createApp().request(
      '/api/chats?cursor=previous-page&includeArchived=true&limit=25',
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ id: 'chat-1' }],
      nextCursor: 'next-page',
    });
    expect(mocks.listForUser).toHaveBeenCalledWith({}, testUser.id, {
      cursor: 'previous-page',
      includeArchived: true,
      limit: 25,
    });
  });

  it('rejects an invalid page size', async () => {
    const response = await createApp().request('/api/chats?limit=101');

    expect(response.status).toBe(400);
    expect(mocks.listForUser).not.toHaveBeenCalled();
  });
});

describe('chat message search', () => {
  beforeEach(() => {
    mocks.getOwnedOrThrow.mockResolvedValue({ id: 'chat-id' });
    mocks.searchMessages.mockClear();
    mocks.searchMessages.mockResolvedValue([]);
  });

  it('searches all messages for an owned chat', async () => {
    const response = await createApp().request(
      '/api/chats/chat-id/messages/search?query=important&limit=25',
    );

    expect(response.status).toBe(200);
    expect(mocks.searchMessages).toHaveBeenCalledWith({}, 'chat-id', 'important', 25);
  });

  it('rejects a search without a query', async () => {
    const response = await createApp().request('/api/chats/chat-id/messages/search');

    expect(response.status).toBe(400);
    expect(mocks.searchMessages).not.toHaveBeenCalled();
  });
});

describe('chat message deletion', () => {
  beforeEach(() => {
    mocks.getOwnedOrThrow.mockResolvedValue({ id: 'chat-id' });
    mocks.runInTransaction.mockImplementation((callback: (trx: object) => unknown) => callback({}));
    mocks.deleteUserMessageAndFollowing.mockReset();
    mocks.deleteUserMessageAndFollowing.mockResolvedValue({
      deletedMessageIds: ['message-1', 'message-2'],
      cleanupFileIds: [],
    });
  });

  it('deletes the selected user message and later messages', async () => {
    const response = await createApp().request('/api/chats/chat-id/messages/message-1', {
      method: 'DELETE',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deletedMessageIds: ['message-1', 'message-2'],
    });
    expect(mocks.deleteUserMessageAndFollowing).toHaveBeenCalledWith(
      {},
      'chat-id',
      'message-1',
      testUser.id,
    );
  });

  it('does not delete when the chat is not owned', async () => {
    mocks.getOwnedOrThrow.mockRejectedValue(new Error('Chat not found'));

    const response = await createApp().request('/api/chats/chat-id/messages/message-1', {
      method: 'DELETE',
    });

    expect(response.status).not.toBe(200);
    expect(mocks.deleteUserMessageAndFollowing).not.toHaveBeenCalled();
  });
});
