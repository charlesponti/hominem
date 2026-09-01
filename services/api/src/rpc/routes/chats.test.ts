import type { ChatGenerationEventRecord } from '@hominem/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { publishGenerationEvent } from '../../application/generation-live-bus';
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
  createGenerationRun: vi.fn(),
  appendGenerationEvent: vi.fn(),
  getToolEffect: vi.fn(),
  saveToolEffect: vi.fn(),
  listGenerationEvents: vi.fn(),
  getGenerationRun: vi.fn(),
  getGenerationRunById: vi.fn(),
  getAwaitingGenerationRunForAssistantMessage: vi.fn(),
  updateGenerationRun: vi.fn(),
  cancelGenerationRun: vi.fn(),
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
  streamMessageSpeech: vi.fn(),
  synthesizeReplyAudioFile: vi.fn(),
  persistSpeechRun: vi.fn(),
  synthesizeSpeech: vi.fn(),
  storeFile: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  AUDIO_TTS_MODEL: 'test-tts-model',
  CHAT_MODEL: 'test-chat-model',
  getSpeechUsageEstimate: mocks.getSpeechUsageEstimate,
  synthesizeSpeech: mocks.synthesizeSpeech,
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
      createGenerationRun: mocks.createGenerationRun,
      getGenerationRun: mocks.getGenerationRun,
      getGenerationRunById: mocks.getGenerationRunById,
      getAwaitingGenerationRunForAssistantMessage:
        mocks.getAwaitingGenerationRunForAssistantMessage,
      updateGenerationRun: mocks.updateGenerationRun,
      cancelGenerationRun: mocks.cancelGenerationRun,
      getChatSourceContext: mocks.getChatSourceContext,
      resolveChatFiles: mocks.resolveChatFiles,
    },
    ChatGenerationRepository: {
      appendEvent: mocks.appendGenerationEvent,
      getToolEffect: mocks.getToolEffect,
      saveToolEffect: mocks.saveToolEffect,
      listEvents: mocks.listGenerationEvents,
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

vi.mock('../../application/chat-speech.service', () => ({
  ChatSpeechUnavailableError: class ChatSpeechUnavailableError extends Error {},
  chatSpeechService: {
    streamMessageSpeech: mocks.streamMessageSpeech,
    synthesizeReplyAudioFile: mocks.synthesizeReplyAudioFile,
    persistSpeechRun: mocks.persistSpeechRun,
  },
}));

vi.mock('../../mcp/chat-tool-adapter', () => ({
  planChatTools: vi.fn().mockResolvedValue({ capabilities: [], requiresLookup: false, tools: [] }),
}));

// The `/:id/stream` route sits behind rateLimitMiddleware, which lazily
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

const testChat = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: testUser.id,
  title: 'Test chat',
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const testAssistantMessage = {
  id: '00000000-0000-4000-8000-000000000002',
  chatId: '00000000-0000-4000-8000-000000000001',
  userId: testUser.id,
  role: 'assistant' as const,
  content: 'Hi there',
  files: null,
  toolCalls: null,
  reasoning: null,
  parentMessageId: null,
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

function phaseEvent(sequence: number): ChatGenerationEventRecord {
  return {
    id: `event-${sequence}`,
    generationId: '00000000-0000-4000-8000-000000000003',
    sequence,
    type: 'generation.phase_changed',
    payload: { type: 'generation.phase_changed', phase: 'running' },
    idempotencyKey: `phase-${sequence}`,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function cancelledEvent(sequence: number): ChatGenerationEventRecord {
  return {
    id: `event-${sequence}`,
    generationId: '00000000-0000-4000-8000-000000000003',
    sequence,
    type: 'generation.cancelled',
    payload: { type: 'generation.cancelled' },
    idempotencyKey: 'cancelled',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('chat stream accounting', () => {
  beforeEach(() => {
    mocks.streamChatCompletion.mockClear();
    mocks.createChat.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' });
    mocks.getMessages.mockResolvedValue([]);
    mocks.insertMessage.mockResolvedValue({ id: 'message-id' });
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.appendGenerationEvent.mockImplementation(
      async (
        _trx: unknown,
        input: {
          generationId: string;
          event: { type: string };
          idempotencyKey?: string;
        },
      ) => ({
        id: `event-${input.event.type}`,
        generationId: input.generationId,
        sequence: mocks.appendGenerationEvent.mock.calls.length,
        type: input.event.type,
        payload: input.event,
        idempotencyKey: input.idempotencyKey ?? null,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    mocks.getToolEffect.mockResolvedValue(null);
    mocks.listGenerationEvents.mockResolvedValue([]);
    mocks.saveToolEffect.mockImplementation(async (input: { result: unknown }) => ({
      id: 'effect-1',
      generationId: '00000000-0000-4000-8000-000000000003',
      idempotencyKey: 'effect-1',
      toolName: 'tool',
      result: input.result,
      createdAt: '2026-01-01T00:00:00.000Z',
    }));
    mocks.getGenerationRun.mockResolvedValue(null);
    mocks.getGenerationRunById.mockResolvedValue(null);
    mocks.updateGenerationRun.mockResolvedValue(undefined);
    mocks.getMessageById.mockResolvedValue({ ...testAssistantMessage, id: 'message-id' });
    mocks.touchLastMessage.mockResolvedValue(undefined);
    mocks.getChatSourceContext.mockResolvedValue([]);
    mocks.resolveChatFiles.mockResolvedValue([]);
    mocks.runInTransaction.mockImplementation(
      async (callback: (trx: unknown) => Promise<unknown>) => callback({}),
    );
    mocks.recordAIUsageEvent.mockResolvedValue(undefined);
    mocks.assertUnderMonthlyUsageLimit.mockResolvedValue(undefined);
    mocks.enqueueEmbedding.mockResolvedValue(undefined);
    mocks.enqueueSpeechUsageReconciliation.mockResolvedValue(undefined);
    mocks.createSpeechRun.mockResolvedValue({ id: 'speech-run-id' });
    mocks.setSpeechGenerationId.mockResolvedValue({ id: 'speech-run-id' });
    mocks.markSpeechComplete.mockResolvedValue({ id: 'speech-run-id' });
    mocks.markSpeechReconciliation.mockResolvedValue({ id: 'speech-run-id' });
    mocks.getOwnedOrThrow.mockResolvedValue(testChat);
    mocks.streamChatCompletion.mockReturnValue(
      (async function* () {
        yield {
          usage: {
            provider: 'openrouter',
            model: 'chat-model',
            promptTokens: 10,
            completionTokens: 5,
            totalTokens: 15,
            reportedTotalTokens: null,
            costUsd: 0.12,
            cachedPromptTokens: null,
            reasoningTokens: null,
          },
          choices: [{ delta: { content: 'hello' } }],
        };
        throw new Error('stream broke');
      })(),
    );
  });

  it('records a failed usage event when the stream errors mid-response', async () => {
    const response = await createApp().request('/api/chats/start-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111112',
        title: 'Test',
        message: 'Hello',
      }),
    });

    expect(response.status).toBe(200);
    await response.text();

    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'chat_stream',
        status: 'failed',
        model: 'test-chat-model',
      }),
    );
  });

  it('applies response length settings to the first message of a new chat', async () => {
    const response = await createApp().request('/api/chats/start-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111113',
        title: 'Test',
        message: 'Hello',
        responseLength: 'long',
      }),
    });

    expect(response.status).toBe(200);
    await response.text();

    const completionOptions = mocks.streamChatCompletion.mock.calls[0]?.[0];
    expect(completionOptions.maxTokens).toBe(6000);
    expect(completionOptions.reasoning).toEqual({ effort: 'none' });
    expect(completionOptions.messages[0]?.role).toBe('system');
    expect(completionOptions.messages[0]?.content).toContain('silently plan a short outline');
    expect(completionOptions.messages[1]).toEqual({ role: 'user', content: 'Hello' });
  });

  it('persists reasoning and toolCalls on the committed assistant message', async () => {
    mocks.streamChatCompletion.mockReturnValue(
      (async function* () {
        yield { choices: [{ delta: { content: 'Hi there' } }] };
      })(),
    );

    const response = await createApp().request('/api/chats/start-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111118',
        title: 'Test',
        message: 'Hello',
      }),
    });

    expect(response.status).toBe(200);
    await response.text();

    expect(mocks.insertMessage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ role: 'assistant', reasoning: null, toolCalls: null }),
    );
  });

  it('replays an existing run instead of creating a second chat when generationId repeats', async () => {
    mocks.createChat.mockClear();
    mocks.createGenerationRun.mockClear();
    mocks.getGenerationRunById.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111119',
      chatId: 'existing-00000000-0000-4000-8000-000000000001',
      ownerUserId: '11111111-1111-4111-8111-111111111111',
      kind: 'start',
      status: 'committed',
      userMessageId: 'user-message-id',
      targetAssistantMessageId: null,
      assistantMessageId: 'assistant-message-id',
      errorMessage: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:01.000Z',
    });
    mocks.getMessageById.mockResolvedValue({
      id: 'assistant-message-id',
      chatId: 'existing-00000000-0000-4000-8000-000000000001',
      role: 'assistant',
      content: 'Already generated reply',
      createdAt: '2026-01-01T00:00:01.000Z',
      files: null,
    });
    mocks.listGenerationEvents.mockResolvedValue([
      {
        id: 'event-1',
        generationId: '11111111-1111-4111-8111-111111111119',
        sequence: 1,
        type: 'generation.committed',
        payload: {
          type: 'generation.committed',
          message: {
            id: 'assistant-message-id',
            chatId: 'existing-00000000-0000-4000-8000-000000000001',
            userId: testUser.id,
            role: 'assistant',
            content: 'Already generated reply',
            files: null,
            toolCalls: null,
            reasoning: null,
            parentMessageId: null,
            createdAt: '2026-01-01T00:00:01.000Z',
            updatedAt: '2026-01-01T00:00:01.000Z',
          },
        },
      },
    ]);

    const response = await createApp().request('/api/chats/start-stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111119',
        title: 'Test',
        message: 'Hello',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Already generated reply');
    expect(mocks.createChat).not.toHaveBeenCalled();
    expect(mocks.createGenerationRun).not.toHaveBeenCalled();
  });

  it('replays durable generation events from Last-Event-ID', async () => {
    mocks.getGenerationRun.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000003',
      status: 'committed',
    });
    mocks.listGenerationEvents.mockResolvedValue([
      {
        id: 'event-2',
        generationId: '00000000-0000-4000-8000-000000000003',
        sequence: 2,
        type: 'generation.phase_changed',
        payload: { type: 'generation.phase_changed', phase: 'running' },
        idempotencyKey: 'phase-2',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/generations/00000000-0000-4000-8000-000000000003/stream',
      {
        headers: { 'Last-Event-ID': '1' },
      },
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(mocks.listGenerationEvents).toHaveBeenCalledWith(
      {},
      '00000000-0000-4000-8000-000000000003',
      testUser.id,
      1,
    );
    expect(body).toContain('id: 2');
    expect(body).toContain('generation.phase_changed');
    expect(body).toContain('[DONE]');
  });

  it('does not lose events published while replay is loading', async () => {
    mocks.getGenerationRun.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000003',
      status: 'running',
    });
    mocks.listGenerationEvents.mockImplementation(async () => {
      publishGenerationEvent(phaseEvent(2));
      publishGenerationEvent(cancelledEvent(3));
      return [phaseEvent(1)];
    });

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/generations/00000000-0000-4000-8000-000000000003/stream?afterSequence=0',
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body.match(/id: [123]/g)).toHaveLength(3);
    expect(body).toContain('id: 1');
    expect(body).toContain('id: 2');
    expect(body).toContain('id: 3');
    expect(body).toContain('[DONE]');
  });

  it('rejects malformed replay cursors before reading events', async () => {
    mocks.listGenerationEvents.mockClear();
    mocks.getGenerationRun.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000003',
      status: 'committed',
    });

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/generations/00000000-0000-4000-8000-000000000003/stream?afterSequence=1.5',
    );

    expect(response.status).toBe(400);
    expect(mocks.listGenerationEvents).not.toHaveBeenCalled();
  });
});

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
    mocks.getOwnedOrThrow.mockResolvedValue(testChat);
    mocks.searchMessages.mockClear();
    mocks.searchMessages.mockResolvedValue([]);
  });

  it('searches all messages for an owned chat', async () => {
    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/search?query=important&limit=25',
    );

    expect(response.status).toBe(200);
    expect(mocks.searchMessages).toHaveBeenCalledWith(
      {},
      '00000000-0000-4000-8000-000000000001',
      'important',
      25,
    );
  });

  it('rejects a search without a query', async () => {
    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/search',
    );

    expect(response.status).toBe(400);
    expect(mocks.searchMessages).not.toHaveBeenCalled();
  });
});

describe('chat message deletion', () => {
  beforeEach(() => {
    mocks.getOwnedOrThrow.mockResolvedValue(testChat);
    mocks.deleteUserMessageAndFollowing.mockReset();
    mocks.deleteUserMessageAndFollowing.mockResolvedValue({
      deletedMessageIds: ['00000000-0000-4000-8000-000000000003', 'message-2'],
      cleanupFileIds: [],
    });
  });

  it('deletes the selected user message and later messages', async () => {
    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000003',
      {
        method: 'DELETE',
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      deletedMessageIds: ['00000000-0000-4000-8000-000000000003', 'message-2'],
    });
    expect(mocks.deleteUserMessageAndFollowing).toHaveBeenCalledWith(
      {},
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000003',
      testUser.id,
    );
  });

  it('does not delete when the chat is not owned', async () => {
    mocks.getOwnedOrThrow.mockRejectedValue(new Error('Chat not found'));

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000003',
      {
        method: 'DELETE',
      },
    );

    expect(response.status).not.toBe(200);
    expect(mocks.deleteUserMessageAndFollowing).not.toHaveBeenCalled();
  });
});

describe('chat message regenerate', () => {
  const userMessage = {
    id: '00000000-0000-4000-8000-000000000004',
    chatId: '00000000-0000-4000-8000-000000000001',
    userId: testUser.id,
    role: 'user',
    content: 'Hello',
    createdAt: '2026-01-01T00:00:00.000Z',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const assistantMessage = {
    id: '00000000-0000-4000-8000-000000000002',
    chatId: '00000000-0000-4000-8000-000000000001',
    userId: testUser.id,
    role: 'assistant',
    content: 'Hi',
    createdAt: '2026-01-01T00:00:01.000Z',
    files: null,
    toolCalls: null,
    reasoning: null,
    parentMessageId: '00000000-0000-4000-8000-000000000004',
    updatedAt: '2026-01-01T00:00:01.000Z',
  };

  beforeEach(() => {
    mocks.streamChatCompletion.mockClear();
    mocks.getOwnedOrThrow.mockResolvedValue(testChat);
    mocks.getChatSourceContext.mockResolvedValue([]);
    mocks.replaceAssistantMessageContent.mockReset();
    mocks.replaceAssistantMessageContent.mockResolvedValue({
      ...assistantMessage,
      content: 'Regenerated reply',
    });
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.getGenerationRun.mockResolvedValue(null);
    mocks.getGenerationRunById.mockResolvedValue(null);
    mocks.updateGenerationRun.mockResolvedValue(undefined);
    mocks.touchLastMessage.mockResolvedValue(undefined);
    mocks.recordAIUsageEvent.mockResolvedValue(undefined);
    mocks.assertUnderMonthlyUsageLimit.mockResolvedValue(undefined);
    mocks.enqueueEmbedding.mockResolvedValue(undefined);
    mocks.runInTransaction.mockImplementation(
      async (callback: (trx: unknown) => Promise<unknown>) => callback({}),
    );
    mocks.getMessageById.mockReset();
    mocks.getMessagesBefore.mockReset();
    mocks.getMessageById.mockResolvedValue(assistantMessage);
    mocks.getMessagesBefore.mockResolvedValue([userMessage]);
    mocks.streamChatCompletion.mockReturnValue(
      (async function* () {
        yield { choices: [{ delta: { content: 'Regenerated reply' } }] };
      })(),
    );
  });

  it('regenerates an assistant message using the prior user turn', async () => {
    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000002/regenerate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111114' }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Regenerated reply');

    expect(mocks.getMessagesBefore).toHaveBeenCalledWith(
      {},
      '00000000-0000-4000-8000-000000000001',
      '2026-01-01T00:00:01.000Z',
    );

    const completionOptions = mocks.streamChatCompletion.mock.calls[0]?.[0];
    expect(completionOptions.messages[1]).toEqual({ role: 'user', content: 'Hello' });

    expect(mocks.replaceAssistantMessageContent).toHaveBeenCalledWith(
      {},
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
      'Regenerated reply',
      { reasoning: null, toolCalls: null },
    );
    expect(mocks.touchLastMessage).toHaveBeenCalledWith({}, '00000000-0000-4000-8000-000000000001');
  });

  it('finds the parent user turn even when it is not the most recent prior message', async () => {
    mocks.getMessagesBefore.mockResolvedValue([
      { ...userMessage, id: 'earlier-user', content: 'Earlier question' },
      { ...assistantMessage, id: 'earlier-assistant', createdAt: '2026-01-01T00:00:00.500Z' },
      { ...userMessage, content: 'Latest question', createdAt: '2026-01-01T00:00:00.800Z' },
    ]);

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000002/regenerate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111115' }),
      },
    );

    expect(response.status).toBe(200);
    await response.text();
    const completionOptions = mocks.streamChatCompletion.mock.calls[0]?.[0];
    expect(completionOptions.messages[1]).toEqual({ role: 'user', content: 'Earlier question' });
    expect(completionOptions.messages[2]).toEqual({ role: 'assistant', content: 'Hi' });
    expect(completionOptions.messages[3]).toEqual({ role: 'user', content: 'Latest question' });
  });

  it('rejects regenerating a user message', async () => {
    mocks.getMessageById.mockResolvedValue(userMessage);

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000004/regenerate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111116' }),
      },
    );

    expect(response.status).toBe(400);
    expect(mocks.streamChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects regenerating a message that does not exist', async () => {
    mocks.getMessageById.mockResolvedValue(undefined);

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/missing/regenerate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111117' }),
      },
    );

    expect(response.status).toBe(400);
    expect(mocks.streamChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects regenerating an assistant message with no prior user turn', async () => {
    mocks.getMessagesBefore.mockResolvedValue([]);

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000002/regenerate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111118' }),
      },
    );

    expect(response.status).toBe(400);
    expect(mocks.streamChatCompletion).not.toHaveBeenCalled();
  });
});

describe('chat stream walkie-talkie audio leg', () => {
  beforeEach(() => {
    mocks.streamMessageSpeech.mockReset();
    mocks.synthesizeReplyAudioFile.mockReset();
    mocks.persistSpeechRun.mockReset();
    mocks.storeFile.mockReset();
    mocks.insertMessage.mockReset();
    mocks.getOwnedOrThrow.mockResolvedValue(testChat);
    mocks.getMessages.mockResolvedValue([]);
    mocks.insertMessage.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000002' });
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.getGenerationRun.mockResolvedValue(null);
    mocks.getGenerationRunById.mockResolvedValue(null);
    mocks.updateGenerationRun.mockResolvedValue(undefined);
    mocks.getMessageById.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000002',
      chatId: '00000000-0000-4000-8000-000000000001',
      userId: testUser.id,
      role: 'assistant',
      content: 'Hi there',
      files: null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.touchLastMessage.mockResolvedValue(undefined);
    mocks.getChatSourceContext.mockResolvedValue([]);
    mocks.resolveChatFiles.mockResolvedValue([]);
    mocks.runInTransaction.mockImplementation(
      async (callback: (trx: unknown) => Promise<unknown>) => callback({}),
    );
    mocks.recordAIUsageEvent.mockResolvedValue(undefined);
    mocks.assertUnderMonthlyUsageLimit.mockResolvedValue(undefined);
    mocks.enqueueEmbedding.mockResolvedValue(undefined);
    mocks.streamChatCompletion.mockReturnValue(
      (async function* () {
        yield { choices: [{ delta: { content: 'Hi there' } }] };
      })(),
    );
    mocks.synthesizeReplyAudioFile.mockImplementation(async (userId: string, text: string) => {
      try {
        const result = await mocks.synthesizeSpeech({ text });
        const stored = await mocks.storeFile(result.buffer, result.mimeType, userId, {
          originalName: 'reply.mp3',
        });
        return {
          file: {
            type: 'audio',
            fileId: stored.id,
            url: stored.url,
            filename: stored.originalName,
            mimeType: result.mimeType,
            size: result.buffer.byteLength,
          },
          eventId: 'speech-event-id',
          generationId: result.generationId ?? null,
          usageAvailable: true,
          status: 'succeeded',
        };
      } catch {
        return {
          file: null,
          eventId: 'speech-event-id',
          generationId: null,
          usageAvailable: false,
          status: 'failed',
        };
      }
    });
  });

  it('synthesizes and attaches audio before committing the durable reply', async () => {
    mocks.synthesizeSpeech.mockResolvedValue({
      buffer: Buffer.from('fake-mp3-bytes'),
      mimeType: 'audio/mpeg',
      generationId: null,
    });
    mocks.storeFile.mockResolvedValue({
      id: 'file-id',
      originalName: 'reply.mp3',
      filename: 'reply.mp3',
      mimetype: 'audio/mpeg',
      size: 14,
      url: 'https://files.example.com/reply.mp3',
      uploadedAt: new Date(),
    });

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/stream',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          generationId: '11111111-1111-4111-8111-111111111119',
          message: 'Hello',
          responseModality: 'audio',
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('"type":"generation.committed"');
    expect(body).toMatch(/id: \d+\n/);
    expect(body).not.toContain('"type":"audio"');

    expect(mocks.synthesizeSpeech).toHaveBeenCalledWith({ text: 'Hi there' });
    expect(mocks.storeFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'audio/mpeg',
      testUser.id,
      expect.objectContaining({ originalName: 'reply.mp3' }),
    );
    expect(mocks.insertMessage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        role: 'assistant',
        files: [
          expect.objectContaining({
            type: 'audio',
            url: 'https://files.example.com/reply.mp3',
            mimeType: 'audio/mpeg',
          }),
        ],
      }),
    );
    expect(mocks.synthesizeReplyAudioFile).toHaveBeenCalledWith(testUser.id, 'Hi there');
  });

  it('degrades silently to text-only when speech synthesis fails', async () => {
    mocks.synthesizeSpeech.mockRejectedValue(new Error('provider down'));

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/stream',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          generationId: '11111111-1111-4111-8111-111111111120',
          message: 'Hello',
          responseModality: 'audio',
        }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    const frames = body
      .split(/\n\n/)
      .map((frame) => frame.replace(/^data: /, ''))
      .filter(Boolean);

    expect(frames).toContain('[DONE]');
    expect(frames.some((frame) => frame.includes('"type":"audio"'))).toBe(false);
    expect(mocks.storeFile).not.toHaveBeenCalled();
    expect(mocks.insertMessage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ role: 'assistant', files: null }),
    );
  });

  it('does not synthesize audio when responseModality is omitted', async () => {
    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/stream',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          generationId: '11111111-1111-4111-8111-111111111121',
          message: 'Hello',
        }),
      },
    );

    expect(response.status).toBe(200);
    await response.text();

    expect(mocks.streamMessageSpeech).not.toHaveBeenCalled();
    expect(mocks.storeFile).not.toHaveBeenCalled();
  });

  it('streams speech for an owned assistant message', async () => {
    mocks.streamMessageSpeech.mockResolvedValue({
      mimeType: 'audio/mpeg',
      providerReadyDurationMs: 3,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('audio-'));
          controller.enqueue(new TextEncoder().encode('bytes'));
          controller.close();
        },
      }),
    });

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000002/speech',
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('audio/mpeg');
    expect(await response.text()).toBe('audio-bytes');
    expect(mocks.streamMessageSpeech).toHaveBeenCalledWith({
      chatId: '00000000-0000-4000-8000-000000000001',
      messageId: '00000000-0000-4000-8000-000000000002',
      ownerUserId: testUser.id,
    });
  });
});
