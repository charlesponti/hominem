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
  getGenerationRunByAssistantMessageId: vi.fn(),
  deleteAssistantMessage: vi.fn(),
  insertMessage: vi.fn(),
  touchLastMessage: vi.fn(),
  appendEvent: vi.fn(),
  appendEvents: vi.fn(),
  forceFail: vi.fn(),
  listEvents: vi.fn(),
  rebuildProjection: vi.fn(),
  getToolEffect: vi.fn(),
  saveToolEffect: vi.fn(),
  deleteRun: vi.fn(),
  runInTransaction: vi.fn(),
  generationPubSubPublish: vi.fn(),
  generationPubSubSubscribe: vi.fn(),
  planChatTools: vi.fn(),
  callTool: vi.fn(),
  executeGenerationTurn: vi.fn(),
}));

vi.mock('@hominem/db/chats', () => ({
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
    getGenerationRunByAssistantMessageId: mocks.getGenerationRunByAssistantMessageId,
    deleteAssistantMessage: mocks.deleteAssistantMessage,
    insertMessage: mocks.insertMessage,
    touchLastMessage: mocks.touchLastMessage,
  },
  ChatGenerationRepository: {
    appendEvent: mocks.appendEvent,
    appendEvents: mocks.appendEvents,
    forceFail: mocks.forceFail,
    listEvents: mocks.listEvents,
    rebuildProjection: mocks.rebuildProjection,
    getToolEffect: mocks.getToolEffect,
    saveToolEffect: mocks.saveToolEffect,
    deleteRun: mocks.deleteRun,
  },
  runInTransaction: mocks.runInTransaction,
}));
vi.mock('@hominem/db/core', () => ({ db: {}, runInTransaction: mocks.runInTransaction }));
vi.mock('@hominem/db/transaction', () => ({ runInTransaction: mocks.runInTransaction }));

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
vi.mock('../application/ai-usage.service', () => ({
  assertUnderMonthlyUsageLimit: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  startAIUsageTimer: () => () => 0,
}));
vi.mock('./chat-generation-engine', () => ({
  executeGenerationTurn: mocks.executeGenerationTurn,
}));
vi.mock('./chat-generation-replay', () => ({ replayGenerationEvents: vi.fn() }));
vi.mock('./chat-speech.service', () => ({
  synthesizeReplyAudioFile: vi.fn(),
  persistSpeechRun: vi.fn(),
}));
vi.mock('./chat-generation-store', () => ({
  ChatGenerationStore: {
    publish: mocks.generationPubSubPublish,
    subscribe: mocks.generationPubSubSubscribe,
    start: vi.fn(),
    stop: vi.fn(),
  },
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

// executeGeneration's local `append` is now a batch of 1 through appendMany,
// so every append it makes (started/accepted/phase_changed/committed/failed/
// confirmation.required) goes through ChatGenerationRepository.appendEvents,
// not the singular appendEvent (still used directly by cancel() and the
// tool-call eventStore in executeGenerationTurn — those stay on appendEvent).
function defaultAppendEventsImpl(sequence: { current: number }) {
  // Echoes back the real payload the caller constructed (as the real
  // ChatGenerationRepository.appendEvents does) instead of the synthetic
  // `event()` helper below, which only stubs a couple of event types and
  // would otherwise fail schema parsing for every other type (accepted,
  // phase_changed, committed, ...).
  return async (
    _trx: unknown,
    args: { events: ReadonlyArray<{ event: Record<string, unknown> & { type: string } }> },
  ) =>
    args.events.map(({ event: evt }) => ({
      id: `event-${++sequence.current}`,
      generationId: input.generationId,
      sequence: sequence.current,
      type: evt.type,
      payload: evt,
    }));
}

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
    mocks.appendEvents.mockImplementation(defaultAppendEventsImpl({ current: 0 }));
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
  });

  it('does not append a second terminal decision', async () => {
    const committed = { ...preparingRun, status: 'committed' as const };
    mocks.getGenerationRunById.mockResolvedValueOnce(committed).mockResolvedValueOnce(committed);

    const result = await new ChatGenerationService().cancel(input);

    expect(result).toEqual(committed);
    expect(mocks.appendEvent).not.toHaveBeenCalled();
    expect(mocks.generationPubSubPublish).not.toHaveBeenCalled();
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
    mocks.appendEvents.mockImplementation(
      async (
        _trx: unknown,
        args: { events: ReadonlyArray<{ event: { type: string; [key: string]: unknown } }> },
      ) =>
        args.events.map(({ event: evt }) => {
          sequence += 1;
          return {
            id: `event-${sequence}`,
            generationId: input.generationId,
            sequence,
            type: evt.type,
            payload: evt,
            idempotencyKey: `key-${sequence}`,
            createdAt: '2026-01-01T00:00:00.000Z',
          };
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

    expect(events.map((value) => value.type)).toEqual([
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
  });

  it('force-fails the run row directly when even the failure-event append throws', async () => {
    mocks.getOwnedOrThrow.mockResolvedValue({
      id: input.chatId,
      userId: input.ownerUserId,
      title: 'Chat',
      archivedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mocks.executeGenerationTurn.mockRejectedValueOnce(new Error('provider payload secret'));
    const sequence = { current: 0 };
    mocks.appendEvents.mockImplementation(
      async (_trx: unknown, args: { events: ReadonlyArray<{ event: { type: string } }> }) => {
        if (args.events.some(({ event: evt }) => evt.type === 'generation.failed')) {
          throw new Error('DB unavailable while recording the failure');
        }
        return args.events.map(({ event: evt }) => event(evt.type, ++sequence.current));
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

    await expect(async () => {
      for await (const _value of stream) {
        // draining the stream surfaces queue.fail(failureDeliveryError)
      }
    }).rejects.toThrow('DB unavailable while recording the failure');

    expect(mocks.forceFail).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        generationId: input.generationId,
        ownerUserId: input.ownerUserId,
        errorMessage: 'Generation failed',
      }),
    );

    // mockRejectedValueOnce/custom mockImplementation calls above aren't
    // undone by the next test's beforeEach (vi.clearAllMocks() clears call
    // history, not queued once-behavior or a replaced implementation) —
    // reset explicitly so later tests get their own mocks' defaults back.
    mocks.executeGenerationTurn.mockReset();
    mocks.appendEvent.mockReset();
    mocks.appendEvents.mockReset();
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
    const sequence = { current: 0 };
    mocks.appendEvents.mockImplementation(
      async (_trx: unknown, args: { events: ReadonlyArray<{ event: Record<string, unknown> }> }) =>
        args.events.map(({ event: evt }) => ({
          ...event(String(evt.type), ++sequence.current),
          payload: evt,
        })),
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
    expect(mocks.appendEvents).toHaveBeenCalledOnce();
    expect(
      mocks.appendEvents.mock.calls[0]?.[1].events.map(
        (item: { event: { type: string } }) => item.event.type,
      ),
    ).toEqual(['generation.started', 'generation.accepted', 'generation.phase_changed']);
  });
});

describe('ChatGenerationService.regenerate (failedGenerationId)', () => {
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
      // regenerate() checks for an idempotent replay (by the *new*
      // generationId) before resolving the target, so this comes first.
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'generation-failed',
        chatId: 'chat-1',
        ownerUserId: 'user-1',
        kind: 'send',
        status: 'failed',
        userMessageId: 'message-1',
        targetAssistantMessageId: null,
      });
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
    mocks.insertMessage.mockResolvedValue({
      id: 'assistant-retry-1',
      chatId: 'chat-1',
      userId: 'user-1',
      role: 'assistant',
      content: 'Recovered',
      files: null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: 'message-1',
      createdAt: '2026-01-01T00:00:02.000Z',
      updatedAt: '2026-01-01T00:00:02.000Z',
    });
    mocks.touchLastMessage.mockResolvedValue(undefined);
    mocks.planChatTools.mockResolvedValue({ tools: [], requiresLookup: false });
    // .mockReset() first: a leaked queued once-value from another describe
    // block (which vi.clearAllMocks() above does not clear) would otherwise
    // take priority over this default and silently fail the generation.
    mocks.executeGenerationTurn.mockReset().mockResolvedValue({
      assistantText: 'Recovered',
      reasoningText: null,
      toolCallRecords: [],
      usage: null,
      pendingToolCall: null,
    });
    mocks.getGenerationRunById.mockReset().mockResolvedValue(null);
    mocks.runInTransaction
      .mockReset()
      .mockImplementation((callback: (trx: unknown) => unknown) => callback({}));
    mocks.appendEvent.mockImplementation(async (_trx: unknown, args: { event: { type: string } }) =>
      event(args.event.type, mocks.appendEvent.mock.calls.length),
    );
    mocks.appendEvents.mockImplementation(defaultAppendEventsImpl({ current: 0 }));
  });

  it('creates a linked retry without inserting another user message', async () => {
    await new ChatGenerationService().regenerate({
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
    // executeGeneration runs as a fire-and-forget background promise (the
    // stream isn't drained here), so wait for its first durable write
    // instead of asserting on mock state immediately.
    await vi.waitFor(() =>
      expect(mocks.appendEvents.mock.calls).toEqual(
        expect.arrayContaining([
          [
            {},
            expect.objectContaining({
              generationId: 'generation-retry',
              events: expect.arrayContaining([
                expect.objectContaining({
                  event: expect.objectContaining({
                    type: 'generation.started',
                    context: expect.objectContaining({ userMessageId: 'message-1' }),
                  }),
                }),
              ]),
            }),
          ],
        ]),
      ),
    );
    // The failed attempt is superseded like any other regenerated attempt —
    // its event log is deleted once the retry commits. It never produced a
    // message, so there's nothing to delete there.
    await vi.waitFor(() =>
      expect(mocks.deleteRun).toHaveBeenCalledWith(
        {},
        {
          generationId: 'generation-failed',
          ownerUserId: 'user-1',
        },
      ),
    );
    expect(mocks.deleteAssistantMessage).not.toHaveBeenCalled();
  });

  it('rejects retrying a non-failed generation', async () => {
    mocks.getGenerationRun.mockReset().mockImplementation(
      async (_handle: unknown, _chatId: string, generationId: string) =>
        generationId === 'generation-active'
          ? {
              id: 'generation-active',
              chatId: 'chat-1',
              ownerUserId: 'user-1',
              kind: 'send',
              status: 'committed',
              userMessageId: 'message-1',
              targetAssistantMessageId: null,
            }
          : null, // no existing run for the new generationId ('generation-retry')
    );

    await expect(
      new ChatGenerationService().regenerate({
        userId: 'user-1',
        chatId: 'chat-1',
        failedGenerationId: 'generation-active',
        generationId: 'generation-retry',
      }),
    ).rejects.toThrow('Only a failed generation');
  });
});
