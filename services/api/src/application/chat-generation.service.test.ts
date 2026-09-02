import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOwnedOrThrow: vi.fn(),
  getGenerationRun: vi.fn(),
  getGenerationRunById: vi.fn(),
  getMessageById: vi.fn(),
  getAwaitingGenerationRunForAssistantMessage: vi.fn(),
  updateToolCallLifecycle: vi.fn(),
  getMessages: vi.fn(),
  getChatSourceContext: vi.fn(),
  createGenerationRun: vi.fn(),
  appendEvent: vi.fn(),
  listEvents: vi.fn(),
  rebuildProjection: vi.fn(),
  getToolEffect: vi.fn(),
  saveToolEffect: vi.fn(),
  runInTransaction: vi.fn(),
  publishGenerationEvent: vi.fn(),
  planChatTools: vi.fn(),
  callTool: vi.fn(),
  executeGenerationTurn: vi.fn(),
}));

vi.mock('@hominem/db', () => ({
  db: {},
  ChatRepository: {
    getOwnedOrThrow: mocks.getOwnedOrThrow,
    getGenerationRun: mocks.getGenerationRun,
    getGenerationRunById: mocks.getGenerationRunById,
    getMessageById: mocks.getMessageById,
    getAwaitingGenerationRunForAssistantMessage: mocks.getAwaitingGenerationRunForAssistantMessage,
    updateToolCallLifecycle: mocks.updateToolCallLifecycle,
    getMessages: mocks.getMessages,
    getChatSourceContext: mocks.getChatSourceContext,
    createGenerationRun: mocks.createGenerationRun,
  },
  ChatGenerationRepository: {
    appendEvent: mocks.appendEvent,
    listEvents: mocks.listEvents,
    rebuildProjection: mocks.rebuildProjection,
    getToolEffect: mocks.getToolEffect,
    saveToolEffect: mocks.saveToolEffect,
  },
  runInTransaction: mocks.runInTransaction,
}));

vi.mock('@hominem/ai', () => ({
  CHAT_MODEL: 'test-model',
  getChatCompletionUsage: vi.fn(),
}));
vi.mock('@hominem/queues', () => ({ embeddingQueue: { add: vi.fn() } }));
vi.mock('../mcp/chat-tool-adapter', () => ({ planChatTools: mocks.planChatTools }));
vi.mock('../mcp/tool-registry', () => ({
  callTool: mocks.callTool,
  getToolDefinition: vi.fn(),
}));
vi.mock('./ai-usage.service', () => ({
  assertUnderMonthlyUsageLimit: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  startAIUsageTimer: () => () => 0,
}));
vi.mock('./chat-generation-engine', () => ({
  executeGenerationTurn: mocks.executeGenerationTurn,
}));
vi.mock('./chat-generation-replay', () => ({ replayGenerationEvents: vi.fn() }));
vi.mock('./chat-speech.service', () => ({ chatSpeechService: {} }));
vi.mock('./generation-live-bus', () => ({
  publishGenerationEvent: mocks.publishGenerationEvent,
  subscribeToGenerationEvents: vi.fn(),
}));

import { ChatGenerationService } from './chat-generation.service';

const input = {
  chatId: 'chat-1',
  generationId: 'generation-1',
  ownerUserId: 'user-1',
};

const preparingRun = {
  id: input.generationId,
  chatId: input.chatId,
  ownerUserId: input.ownerUserId,
  kind: 'send' as const,
  status: 'preparing' as const,
  userMessageId: 'message-1',
  targetAssistantMessageId: null,
};

function event(type: string, sequence: number) {
  return {
    id: `event-${sequence}`,
    generationId: input.generationId,
    sequence,
    type,
    payload:
      type === 'generation.started'
        ? {
            type,
            context: {
              chatId: input.chatId,
              kind: 'send',
              userMessageId: 'message-1',
              targetAssistantMessageId: null,
              requestContext: {},
            },
          }
        : type === 'generation.cancel_requested'
          ? { type, requestedAt: '2026-01-01T00:00:00.000Z', requestedBy: input.ownerUserId }
          : { type },
    idempotencyKey: `${input.generationId}:${type}`,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('ChatGenerationService.cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnedOrThrow.mockResolvedValue({ id: input.chatId });
    mocks.getGenerationRun.mockResolvedValue(null);
    mocks.getMessageById.mockResolvedValue(null);
    mocks.getAwaitingGenerationRunForAssistantMessage.mockResolvedValue(null);
    mocks.getMessages.mockResolvedValue([]);
    mocks.getChatSourceContext.mockResolvedValue([]);
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.getToolEffect.mockResolvedValue(null);
    mocks.planChatTools.mockResolvedValue({ tools: [], requiresLookup: false });
    mocks.executeGenerationTurn.mockResolvedValue({
      assistantText: 'continued',
      reasoningText: null,
      toolCallRecords: [],
      usage: null,
      pendingToolCall: null,
    });
    mocks.listEvents.mockResolvedValue([]);
    mocks.rebuildProjection.mockResolvedValue(undefined);
    mocks.runInTransaction.mockImplementation((callback: (trx: unknown) => unknown) =>
      callback({}),
    );
    mocks.appendEvent.mockImplementation(async (_trx: unknown, args: { event: { type: string } }) =>
      event(args.event.type, mocks.appendEvent.mock.calls.length),
    );
  });

  it('durably records cancellation from a preparing run in order', async () => {
    mocks.getGenerationRunById
      .mockResolvedValueOnce(preparingRun)
      .mockResolvedValueOnce({ ...preparingRun, status: 'cancelled' });

    const result = await new ChatGenerationService().cancel(input);

    expect(result?.status).toBe('cancelled');
    expect(mocks.appendEvent.mock.calls.map(([, args]) => args.event.type)).toEqual([
      'generation.started',
      'generation.cancel_requested',
      'generation.cancelled',
    ]);
    expect(mocks.publishGenerationEvent.mock.calls).toHaveLength(3);
  });

  it('does not append a second terminal decision', async () => {
    const committed = { ...preparingRun, status: 'committed' as const };
    mocks.getGenerationRunById.mockResolvedValueOnce(committed).mockResolvedValueOnce(committed);

    const result = await new ChatGenerationService().cancel(input);

    expect(result).toEqual(committed);
    expect(mocks.appendEvent).not.toHaveBeenCalled();
    expect(mocks.publishGenerationEvent).not.toHaveBeenCalled();
  });

  it('recovers phase and cursor from the owner-scoped durable event log', async () => {
    mocks.getGenerationRun.mockResolvedValue(preparingRun);
    mocks.listEvents.mockResolvedValue([{ sequence: 1 }, { sequence: 2 }, { sequence: 3 }]);
    mocks.rebuildProjection.mockResolvedValue({ status: 'awaiting_confirmation' });

    await expect(new ChatGenerationService().recover(input)).resolves.toEqual({
      generationId: input.generationId,
      chatId: input.chatId,
      phase: 'awaiting_confirmation',
      lastDurableSequence: 3,
      disposition: 'awaiting_confirmation',
      mayExecuteEffect: false,
    });
    expect(mocks.rebuildProjection).toHaveBeenCalledWith({}, input.generationId, input.ownerUserId);
  });

  it('does not expose tool exceptions when resuming confirmation', async () => {
    const pendingMessage = {
      id: 'assistant-1',
      role: 'assistant' as const,
      content: 'I need approval',
      toolCalls: [
        {
          type: 'tool-call' as const,
          toolName: 'write_memory',
          toolCallId: 'call-1',
          args: { value: 'secret' },
          confirmationStatus: 'pending' as const,
          executionStatus: 'pending' as const,
        },
      ],
    };
    mocks.getMessageById.mockResolvedValue(pendingMessage);
    mocks.getAwaitingGenerationRunForAssistantMessage.mockResolvedValue({
      id: input.generationId,
      chatId: input.chatId,
    });
    mocks.getMessages.mockResolvedValue([pendingMessage]);
    mocks.listEvents.mockResolvedValue([
      {
        ...event('generation.started', 1),
      },
      {
        id: 'event-confirmation-required',
        generationId: input.generationId,
        sequence: 2,
        type: 'confirmation.required',
        payload: {
          type: 'confirmation.required',
          call: {
            id: 'call-1',
            name: 'write_memory',
            arguments: JSON.stringify({ value: 'secret' }),
            iteration: 0,
            turnId: input.generationId,
            messageId: pendingMessage.id,
            preview: null,
          },
        },
        idempotencyKey: `${input.generationId}:confirmation.required`,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    await new ChatGenerationService().respondToConfirmation({
      userId: input.ownerUserId,
      chatId: input.chatId,
      messageId: pendingMessage.id,
      toolCallId: 'call-1',
      approved: true,
    });

    await vi.waitFor(() =>
      expect(mocks.executeGenerationTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          initialInput: { type: 'confirmation-approved', callId: 'call-1' },
          initialState: expect.objectContaining({
            phase: 'awaiting_confirmation',
            assistantText: '',
            reasoningText: '',
            pendingConfirmation: expect.objectContaining({ id: 'call-1' }),
          }),
          targetAssistantMessageId: pendingMessage.id,
          messages: expect.not.arrayContaining([expect.objectContaining({ role: 'tool' })]),
        }),
      ),
    );
    expect(mocks.callTool).not.toHaveBeenCalled();
  });

  it('feeds a rejected tool result back to the provider instead of reopening confirmation', async () => {
    const pendingMessage = {
      id: 'assistant-1',
      role: 'assistant' as const,
      content: 'I need approval',
      toolCalls: [
        {
          type: 'tool-call' as const,
          toolName: 'write_memory',
          toolCallId: 'call-1',
          args: { value: 'secret' },
          confirmationStatus: 'pending' as const,
          executionStatus: 'pending' as const,
        },
      ],
    };
    mocks.getMessageById.mockResolvedValue(pendingMessage);
    mocks.getAwaitingGenerationRunForAssistantMessage.mockResolvedValue({
      id: input.generationId,
      chatId: input.chatId,
    });
    mocks.getMessages.mockResolvedValue([pendingMessage]);
    mocks.listEvents.mockResolvedValue([
      { ...event('generation.started', 1) },
      {
        ...event('confirmation.required', 2),
        payload: {
          type: 'confirmation.required',
          call: {
            id: 'call-1',
            name: 'write_memory',
            arguments: JSON.stringify({ value: 'secret' }),
            iteration: 0,
            turnId: input.generationId,
            messageId: pendingMessage.id,
            preview: null,
          },
        },
      },
    ]);

    await new ChatGenerationService().respondToConfirmation({
      userId: input.ownerUserId,
      chatId: input.chatId,
      messageId: pendingMessage.id,
      toolCallId: 'call-1',
      approved: false,
    });

    await vi.waitFor(() =>
      expect(mocks.executeGenerationTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          initialInput: {
            type: 'confirmation-rejected',
            callId: 'call-1',
            reason: 'User rejected tool call',
          },
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'tool',
              toolCallId: 'call-1',
              content: JSON.stringify({ error: 'User rejected tool call' }),
            }),
          ]),
        }),
      ),
    );
    expect(mocks.callTool).not.toHaveBeenCalled();
  });

  it('persists and publishes a safe terminal failure when provider execution fails', async () => {
    mocks.getOwnedOrThrow.mockResolvedValue({
      id: input.chatId,
      userId: input.ownerUserId,
      title: 'Chat',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.executeGenerationTurn.mockRejectedValueOnce(new Error('provider payload secret'));

    let sequence = 0;
    mocks.appendEvent.mockImplementation(
      async (_trx: unknown, args: { event: { type: string; [key: string]: unknown } }) => {
        sequence += 1;
        return {
          id: `event-${sequence}`,
          generationId: input.generationId,
          sequence,
          type: args.event.type,
          payload:
            args.event.type === 'generation.started'
              ? args.event
              : args.event.type === 'generation.accepted'
                ? args.event
                : args.event.type === 'generation.phase_changed'
                  ? args.event
                  : args.event,
          idempotencyKey: `key-${sequence}`,
          createdAt: '2026-01-01T00:00:00.000Z',
        };
      },
    );

    const stream = await new ChatGenerationService().send({
      userId: input.ownerUserId,
      generationId: input.generationId,
      chatId: input.chatId,
      model: 'test-model',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [],
      userMessageId: null,
    });
    const events = [];
    for await (const value of stream) events.push(value);

    expect(events.map((value) => ('payload' in value ? value.type : value.event.type))).toEqual([
      'generation.started',
      'generation.accepted',
      'generation.phase_changed',
      'generation.failed',
    ]);
    expect(events.at(-1)).toMatchObject({
      type: 'generation.failed',
      payload: { type: 'generation.failed', message: 'Generation failed' },
    });
    expect(events).not.toContainEqual(expect.objectContaining({ type: 'generation.committed' }));
    expect(mocks.publishGenerationEvent.mock.calls.at(-1)?.[0]).toMatchObject({
      type: 'generation.failed',
      payload: { message: 'Generation failed' },
    });
  });

  it('does not commit provider output after cancellation wins during execution', async () => {
    mocks.getOwnedOrThrow.mockResolvedValue({
      id: input.chatId,
      userId: input.ownerUserId,
      title: 'Chat',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.getMessageById.mockResolvedValue(null);
    mocks.getGenerationRunById.mockResolvedValue({ ...preparingRun, status: 'cancelled' });
    mocks.executeGenerationTurn.mockResolvedValue({
      assistantText: 'late provider output',
      reasoningText: null,
      toolCallRecords: [],
      usage: null,
      pendingToolCall: null,
    });
    mocks.appendEvent.mockImplementation(
      async (_trx: unknown, args: { event: Record<string, unknown> }) => ({
        ...event(String(args.event.type), mocks.appendEvent.mock.calls.length),
        payload: args.event,
      }),
    );

    const stream = await new ChatGenerationService().send({
      userId: input.ownerUserId,
      generationId: input.generationId,
      chatId: input.chatId,
      model: 'test-model',
      messages: [{ role: 'user', content: 'hello' }],
      tools: [],
      userMessageId: null,
    });
    const events = [];
    for await (const value of stream) events.push(value);

    expect(events).not.toContainEqual(expect.objectContaining({ type: 'generation.committed' }));
    expect(mocks.executeGenerationTurn).toHaveBeenCalledOnce();
    expect(mocks.appendEvent.mock.calls.map(([, args]) => args.event.type)).toEqual([
      'generation.started',
      'generation.accepted',
      'generation.phase_changed',
    ]);
  });
});

describe('ChatGenerationService.retryMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOwnedOrThrow.mockResolvedValue({
      id: 'chat-1',
      userId: 'user-1',
      title: 'Retry chat',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.getGenerationRun
      .mockResolvedValueOnce({
        id: 'generation-failed',
        chatId: 'chat-1',
        ownerUserId: 'user-1',
        kind: 'send',
        status: 'failed',
        userMessageId: 'message-1',
        targetAssistantMessageId: null,
      })
      .mockResolvedValueOnce(null);
    mocks.getMessages.mockResolvedValue([
      {
        id: 'message-1',
        chatId: 'chat-1',
        userId: 'user-1',
        role: 'user',
        content: 'Try this again',
        files: null,
        toolCalls: null,
        reasoning: null,
        parentMessageId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mocks.getMessageById.mockResolvedValue({
      id: 'message-1',
      chatId: 'chat-1',
      userId: 'user-1',
      role: 'user',
      content: 'Try this again',
      files: null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.getChatSourceContext.mockResolvedValue([]);
    mocks.createGenerationRun.mockResolvedValue(undefined);
    mocks.planChatTools.mockResolvedValue({ tools: [], requiresLookup: false });
    mocks.executeGenerationTurn.mockResolvedValue({
      assistantText: 'Recovered',
      reasoningText: null,
      toolCallRecords: [],
      usage: null,
      pendingToolCall: null,
    });
    mocks.appendEvent.mockImplementation(async (_trx: unknown, args: { event: { type: string } }) =>
      event(args.event.type, mocks.appendEvent.mock.calls.length),
    );
  });

  it('creates a linked retry without inserting another user message', async () => {
    await new ChatGenerationService().retryMessage({
      userId: 'user-1',
      chatId: 'chat-1',
      failedGenerationId: 'generation-failed',
      generationId: 'generation-retry',
      responseLength: 'short',
    });

    expect(mocks.createGenerationRun).toHaveBeenCalledWith(
      {},
      {
        id: 'generation-retry',
        chatId: 'chat-1',
        ownerUserId: 'user-1',
        kind: 'send',
        userMessageId: 'message-1',
      },
    );
    expect(mocks.appendEvent.mock.calls).toEqual(
      expect.arrayContaining([
        [
          {},
          expect.objectContaining({
            generationId: 'generation-retry',
            event: expect.objectContaining({
              type: 'generation.started',
              context: expect.objectContaining({ retryOfGenerationId: 'generation-failed' }),
            }),
          }),
        ],
      ]),
    );
  });

  it('rejects retrying a non-failed generation', async () => {
    mocks.getGenerationRun.mockReset().mockResolvedValue({
      id: 'generation-active',
      chatId: 'chat-1',
      ownerUserId: 'user-1',
      kind: 'send',
      status: 'committed',
      userMessageId: 'message-1',
      targetAssistantMessageId: null,
    });

    await expect(
      new ChatGenerationService().retryMessage({
        userId: 'user-1',
        chatId: 'chat-1',
        failedGenerationId: 'generation-active',
        generationId: 'generation-retry',
      }),
    ).rejects.toThrow('Only a failed generation');
  });
});
