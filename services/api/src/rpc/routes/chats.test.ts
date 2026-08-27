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
  createGenerationRun: vi.fn(),
  getGenerationRun: vi.fn(),
  getGenerationRunById: vi.fn(),
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
      createGenerationRun: mocks.createGenerationRun,
      getGenerationRun: mocks.getGenerationRun,
      getGenerationRunById: mocks.getGenerationRunById,
      updateGenerationRun: mocks.updateGenerationRun,
      cancelGenerationRun: mocks.cancelGenerationRun,
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

describe('chat stream accounting', () => {
  beforeEach(() => {
    mocks.streamChatCompletion.mockClear();
    mocks.createChat.mockResolvedValue({ id: 'chat-id' });
    mocks.getMessages.mockResolvedValue([]);
    mocks.insertMessage.mockResolvedValue({ id: 'message-id' });
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.getGenerationRun.mockResolvedValue(null);
    mocks.getGenerationRunById.mockResolvedValue(null);
    mocks.updateGenerationRun.mockResolvedValue(undefined);
    mocks.getMessageById.mockResolvedValue({ id: 'message-id' });
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
    mocks.getOwnedOrThrow.mockResolvedValue({ id: 'chat-id' });
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
      chatId: 'existing-chat-id',
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
      chatId: 'existing-chat-id',
      role: 'assistant',
      content: 'Already generated reply',
      createdAt: '2026-01-01T00:00:01.000Z',
      files: null,
    });

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

describe('chat message regenerate', () => {
  const userMessage = {
    id: 'user-1',
    role: 'user',
    content: 'Hello',
    createdAt: '2026-01-01T00:00:00.000Z',
    files: null,
  };
  const assistantMessage = {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Hi',
    createdAt: '2026-01-01T00:00:01.000Z',
    files: null,
  };

  beforeEach(() => {
    mocks.streamChatCompletion.mockClear();
    mocks.getOwnedOrThrow.mockResolvedValue({ id: 'chat-id' });
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
      '/api/chats/chat-id/messages/assistant-1/regenerate',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111114' }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('Regenerated reply');

    expect(mocks.getMessagesBefore).toHaveBeenCalledWith({}, 'chat-id', '2026-01-01T00:00:01.000Z');

    const completionOptions = mocks.streamChatCompletion.mock.calls[0]?.[0];
    expect(completionOptions.messages[1]).toEqual({ role: 'user', content: 'Hello' });

    expect(mocks.replaceAssistantMessageContent).toHaveBeenCalledWith(
      {},
      'chat-id',
      'assistant-1',
      'Regenerated reply',
      { reasoning: null, toolCalls: null },
    );
    expect(mocks.touchLastMessage).toHaveBeenCalledWith({}, 'chat-id');
  });

  it('finds the parent user turn even when it is not the most recent prior message', async () => {
    mocks.getMessagesBefore.mockResolvedValue([
      { ...userMessage, id: 'earlier-user', content: 'Earlier question' },
      { ...assistantMessage, id: 'earlier-assistant', createdAt: '2026-01-01T00:00:00.500Z' },
      { ...userMessage, content: 'Latest question', createdAt: '2026-01-01T00:00:00.800Z' },
    ]);

    const response = await createApp().request(
      '/api/chats/chat-id/messages/assistant-1/regenerate',
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

    const response = await createApp().request('/api/chats/chat-id/messages/user-1/regenerate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111116' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.streamChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects regenerating a message that does not exist', async () => {
    mocks.getMessageById.mockResolvedValue(undefined);

    const response = await createApp().request('/api/chats/chat-id/messages/missing/regenerate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ generationId: '11111111-1111-4111-8111-111111111117' }),
    });

    expect(response.status).toBe(400);
    expect(mocks.streamChatCompletion).not.toHaveBeenCalled();
  });

  it('rejects regenerating an assistant message with no prior user turn', async () => {
    mocks.getMessagesBefore.mockResolvedValue([]);

    const response = await createApp().request(
      '/api/chats/chat-id/messages/assistant-1/regenerate',
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
    mocks.synthesizeChatReplySpeech.mockReset();
    mocks.streamChatReplySpeech.mockReset();
    mocks.storeFile.mockReset();
    mocks.insertMessage.mockReset();
    mocks.getOwnedOrThrow.mockResolvedValue({ id: 'chat-id' });
    mocks.getMessages.mockResolvedValue([]);
    mocks.insertMessage.mockResolvedValue({ id: 'assistant-id' });
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.getGenerationRun.mockResolvedValue(null);
    mocks.getGenerationRunById.mockResolvedValue(null);
    mocks.updateGenerationRun.mockResolvedValue(undefined);
    mocks.getMessageById.mockResolvedValue({
      id: 'assistant-id',
      role: 'assistant',
      content: 'Hi there',
      files: null,
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
  });

  it('synthesizes and attaches audio before committing the durable reply', async () => {
    mocks.synthesizeChatReplySpeech.mockResolvedValue({
      kind: 'success',
      buffer: Buffer.from('fake-mp3-bytes'),
      mimeType: 'audio/mpeg',
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

    const response = await createApp().request('/api/chats/chat-id/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111119',
        message: 'Hello',
        responseModality: 'audio',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('"type":"committed"');
    expect(body).not.toContain('"type":"audio"');

    expect(mocks.synthesizeChatReplySpeech).toHaveBeenCalledWith('Hi there');
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
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'chat_speech', operation: 'speech', status: 'succeeded' }),
    );
  });

  it('degrades silently to text-only when speech synthesis fails', async () => {
    mocks.synthesizeChatReplySpeech.mockResolvedValue({
      kind: 'error',
      message: 'provider down',
    });

    const response = await createApp().request('/api/chats/chat-id/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111120',
        message: 'Hello',
        responseModality: 'audio',
      }),
    });

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
    const response = await createApp().request('/api/chats/chat-id/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        generationId: '11111111-1111-4111-8111-111111111121',
        message: 'Hello',
      }),
    });

    expect(response.status).toBe(200);
    await response.text();

    expect(mocks.synthesizeChatReplySpeech).not.toHaveBeenCalled();
    expect(mocks.storeFile).not.toHaveBeenCalled();
  });

  it('streams speech for an owned assistant message', async () => {
    mocks.streamChatReplySpeech.mockResolvedValue({
      kind: 'success',
      mimeType: 'audio/mpeg',
      generationId: 'gen-tts-1',
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('audio-'));
          controller.enqueue(new TextEncoder().encode('bytes'));
          controller.close();
        },
      }),
    });

    const response = await createApp().request('/api/chats/chat-id/messages/assistant-id/speech');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('audio/mpeg');
    expect(await response.text()).toBe('audio-bytes');
    expect(mocks.streamChatReplySpeech).toHaveBeenCalledWith('Hi there');
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ feature: 'chat_speech', status: 'succeeded' }),
    );
    expect(mocks.setSpeechGenerationId).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ providerGenerationId: 'gen-tts-1' }),
    );
    expect(mocks.markSpeechReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: expect.any(String), status: 'succeeded' }),
    );
  });
});
