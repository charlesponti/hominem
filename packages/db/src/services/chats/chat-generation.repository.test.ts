import { randomUUID } from 'node:crypto';

import { toolEventRoundTripFixture, type GenerationHistoryEventPayload } from '@hominem/chat';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authDb, db } from '../../db';
import { ValidationError } from '../../errors';
import { runInTransaction } from '../../transaction';
import {
  ChatGenerationRepository,
  parseGenerationEventPayload,
  parseGenerationKind,
  parseToolResult,
  toJsonValue,
} from './chat-generation.repository';

describe('ChatGenerationRepository', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) {
      await authDb.deleteFrom('user').where('id', '=', userId).execute();
    }
  });

  async function createGeneration() {
    const userId = randomUUID();
    const chatId = randomUUID();
    const generationId = randomUUID();
    userIds.push(userId);

    await authDb
      .insertInto('user')
      .values({ id: userId, name: 'Generation Repository User', email: `${userId}@example.com` })
      .execute();
    await db
      .insertInto('app.chats')
      .values({ id: chatId, ownerUserid: userId, title: 'Generation test' })
      .execute();
    await db
      .insertInto('app.chatGenerationRuns')
      .values({
        id: generationId,
        chatId,
        ownerUserId: userId,
        kind: 'send',
        status: 'preparing',
      })
      .execute();

    return { userId, chatId, generationId };
  }

  async function createAssistantMessage(chatId: string, userId: string) {
    const id = randomUUID();
    await db
      .insertInto('app.chatMessages')
      .values({
        id,
        chatId,
        authorUserid: userId,
        role: 'assistant',
        content: 'Done',
        files: null,
        reasoning: null,
        toolCalls: null,
        parentMessageId: null,
      })
      .execute();
    return id;
  }

  it('checks every persisted event and tool-result shape before mapping it', () => {
    const message = {
      id: 'message-1',
      chatId: 'chat-1',
      userId: 'user-1',
      role: 'assistant' as const,
      content: 'Done',
      files: null,
      toolCalls: null,
      reasoning: null,
      parentMessageId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const call = { id: 'call-1', name: 'lookup', arguments: '{}', iteration: 0, turnId: 'turn-1' };
    const result = { callId: 'call-1', toolName: 'lookup', content: '{}', error: false };
    const events = [
      {
        type: 'generation.started',
        context: {
          chatId: 'chat-1',
          kind: 'send',
          userMessageId: null,
          targetAssistantMessageId: null,
          requestContext: {},
        },
      },
      {
        type: 'generation.accepted',
        chatId: 'chat-1',
        chat: {
          id: 'chat-1',
          userId: 'user-1',
          title: 'Chat',
          archivedAt: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        userMessage: { ...message, role: 'user' },
      },
      { type: 'generation.phase_changed', phase: 'running' },
      { type: 'generation.cancel_requested', requestedAt: 'now', requestedBy: 'user-1' },
      {
        type: 'generation.checkpointed',
        checkpoint: {
          turnId: 'turn-1',
          iteration: 0,
          assistantMessage: message,
          pendingToolCallIds: ['call-1'],
        },
      },
      { type: 'tool.requested', call },
      { type: 'tool.completed', result },
      { type: 'tool.failed', result: { ...result, error: true } },
      { type: 'confirmation.required', call },
      { type: 'confirmation.approved', callId: 'call-1' },
      { type: 'confirmation.rejected', callId: 'call-1', reason: 'no' },
      { type: 'generation.retry_scheduled', attempt: 1, maxAttempts: 2 },
      { type: 'generation.committed', message },
      { type: 'generation.cancelled' },
      { type: 'generation.failed', message: 'failed' },
    ];

    for (const event of events) expect(parseGenerationEventPayload(event).type).toBe(event.type);
    expect(parseToolResult(result)).toEqual(result);
    expect(parseGenerationKind('send')).toBe('send');
    expect(parseGenerationKind('start')).toBe('start');
    expect(parseGenerationKind('regenerate')).toBe('regenerate');
  });

  it('rejects malformed persisted JSON and unsupported generation kinds', () => {
    expect(() => parseGenerationEventPayload(null)).toThrow(ValidationError);
    expect(() => parseGenerationEventPayload(null)).toThrow(
      'Invalid chat generation event payload',
    );
    expect(() => parseGenerationEventPayload([])).toThrow('Invalid chat generation event payload');
    expect(() => parseGenerationEventPayload({ type: 'unknown' })).toThrow(
      'Invalid chat generation event payload',
    );
    expect(() =>
      parseGenerationEventPayload({ type: 'generation.started', context: {} }),
    ).toThrow();
    expect(() =>
      parseGenerationEventPayload({ type: 'generation.accepted', chatId: 'chat-1' }),
    ).toThrow();
    expect(() =>
      parseGenerationEventPayload({ type: 'generation.committed', message: {} }),
    ).toThrow();
    expect(() => parseGenerationEventPayload({ type: 'tool.requested', call: null })).toThrow();
    expect(() => parseToolResult({})).toThrow(ValidationError);
    expect(() => parseToolResult(null)).toThrow('Invalid chat generation tool result');
    expect(() => parseGenerationKind('unknown')).toThrow(ValidationError);
    let error: unknown;
    try {
      parseGenerationEventPayload({ type: 'generation.started', context: { secret: 'value' } });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ValidationError);
    expect(JSON.stringify(error)).not.toContain('secret');
    expect(() => toJsonValue(Symbol('not-json'))).toThrow('Value is not JSON serializable');
  });

  it('appends ordered events idempotently and updates the projection atomically', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const event = {
      type: 'generation.started',
      context: {
        chatId,
        kind: 'send',
        userMessageId: null,
        targetAssistantMessageId: null,
        requestContext: { values: ['x'] },
      },
    } satisfies GenerationHistoryEventPayload;

    const [first, replay] = await Promise.all(
      [1, 2].map(() =>
        runInTransaction((trx) =>
          ChatGenerationRepository.appendEvent(trx, {
            generationId,
            ownerUserId: userId,
            event,
            idempotencyKey: 'start-effect',
          }),
        ),
      ),
    );

    expect(first.sequence).toBe(1);
    expect(replay.id).toBe(first.id);
    expect(await ChatGenerationRepository.listEvents(db, generationId, userId)).toHaveLength(1);
    await expect(
      ChatGenerationRepository.listEvents(db, generationId, randomUUID()),
    ).resolves.toEqual([]);
  });

  it('round-trips the shared tool event fixture through durable storage and projection rebuild', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const assistantMessageId = await createAssistantMessage(chatId, userId);
    const fixture = toolEventRoundTripFixture({ chatId, assistantMessageId });

    for (const [index, event] of fixture.entries()) {
      await runInTransaction((trx) =>
        ChatGenerationRepository.appendEvent(trx, {
          generationId,
          ownerUserId: userId,
          event,
          idempotencyKey: `${generationId}:fixture:${index + 1}`,
        }),
      );
    }

    const records = await ChatGenerationRepository.listEvents(db, generationId, userId);
    expect(records.map((record) => record.payload)).toEqual(fixture);

    const projection = await runInTransaction((trx) =>
      ChatGenerationRepository.rebuildProjection(trx, generationId, userId),
    );
    expect(projection).toMatchObject({
      generationId,
      status: 'committed',
      assistantMessageId,
      errorMessage: null,
    });
  });

  it('stores private snapshots and reuses a completed tool effect', async () => {
    const { userId, generationId } = await createGeneration();
    const toolResult = {
      callId: 'call-1',
      toolName: 'write_memory',
      content: '{"id":"memory-1"}',
      error: false,
    };

    await ChatGenerationRepository.saveSnapshot(db, generationId, userId, 'encrypted-snapshot');
    expect(await ChatGenerationRepository.getSnapshot(db, generationId, userId)).toBe(
      'encrypted-snapshot',
    );

    const saved = await runInTransaction((trx) =>
      ChatGenerationRepository.saveToolEffect(trx, {
        generationId,
        ownerUserId: userId,
        idempotencyKey: 'write-effect',
        toolName: toolResult.toolName,
        result: toolResult,
      }),
    );
    const replay = await runInTransaction((trx) =>
      ChatGenerationRepository.saveToolEffect(trx, {
        generationId,
        ownerUserId: userId,
        idempotencyKey: 'write-effect',
        toolName: toolResult.toolName,
        result: { ...toolResult, content: 'should-not-replace' },
      }),
    );

    expect(saved.result).toEqual(toolResult);
    expect(replay.result).toEqual(toolResult);
    expect(
      await ChatGenerationRepository.getToolEffect(db, {
        generationId,
        ownerUserId: userId,
        idempotencyKey: 'write-effect',
      }),
    ).toMatchObject({ result: toolResult });
  });

  it('rejects snapshot writes for another owner and terminal generations', async () => {
    const { userId, chatId, generationId } = await createGeneration();

    await expect(
      ChatGenerationRepository.saveSnapshot(db, generationId, randomUUID(), 'encrypted-snapshot'),
    ).rejects.toThrow();

    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: { type: 'generation.cancelled' },
      }),
    );

    await expect(
      ChatGenerationRepository.saveSnapshot(db, generationId, userId, 'encrypted-snapshot'),
    ).rejects.toThrow();
  });

  it('allocates the next sequence without an idempotency key and enforces ownership', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const first = await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );
    const second = await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: { type: 'generation.phase_changed', phase: 'running' },
      }),
    );

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    await expect(
      ChatGenerationRepository.appendEvent(db, {
        generationId,
        ownerUserId: randomUUID(),
        event: { type: 'generation.failed', message: 'forbidden' },
      }),
    ).rejects.toThrow();
    await expect(
      ChatGenerationRepository.getSnapshot(db, generationId, randomUUID()),
    ).resolves.toBeNull();
    await expect(
      ChatGenerationRepository.getToolEffect(db, {
        generationId,
        ownerUserId: userId,
        idempotencyKey: 'missing-effect',
      }),
    ).resolves.toBeNull();
  });

  it('rebuilds the current projection from the authoritative event history', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const assistantId = await createAssistantMessage(chatId, userId);
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.committed',
          message: {
            id: assistantId,
            chatId,
            userId,
            role: 'assistant',
            content: 'Done',
            files: null,
            toolCalls: null,
            reasoning: null,
            parentMessageId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      }),
    );

    await db
      .updateTable('app.chatGenerationRuns')
      .set({ status: 'failed', assistantMessageId: null, errorMessage: 'drift' })
      .where('id', '=', generationId)
      .execute();

    const rebuilt = await runInTransaction((trx) =>
      ChatGenerationRepository.rebuildProjection(trx, generationId, userId),
    );
    expect(rebuilt).toMatchObject({
      status: 'committed',
      assistantMessageId: assistantId,
      errorMessage: null,
    });
  });

  it('rebuilds an active projection without clearing its private snapshot', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    await ChatGenerationRepository.saveSnapshot(db, generationId, userId, 'encrypted');
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );

    await db
      .updateTable('app.chatGenerationRuns')
      .set({ status: 'failed', errorMessage: 'drift' })
      .where('id', '=', generationId)
      .execute();
    await runInTransaction((trx) =>
      ChatGenerationRepository.rebuildProjection(trx, generationId, userId),
    );

    await expect(
      db
        .selectFrom('app.chatGenerationRuns')
        .select(['status', 'encryptedSnapshot'])
        .where('id', '=', generationId)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({ status: 'running', encryptedSnapshot: 'encrypted' });
  });

  it('clears the private snapshot when a terminal event is appended', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const assistantId = await createAssistantMessage(chatId, userId);
    await ChatGenerationRepository.saveSnapshot(db, generationId, userId, 'encrypted');

    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.committed',
          message: {
            id: assistantId,
            chatId,
            userId,
            role: 'assistant',
            content: 'Done',
            files: null,
            toolCalls: null,
            reasoning: null,
            parentMessageId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      }),
    );

    expect(await ChatGenerationRepository.getSnapshot(db, generationId, userId)).toBeNull();
  });

  it('serializes concurrent appends and rejects a second terminal outcome', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );

    await Promise.all(
      (['running', 'saving'] satisfies Array<'running' | 'saving'>).map((phase) =>
        runInTransaction((trx) =>
          ChatGenerationRepository.appendEvent(trx, {
            generationId,
            ownerUserId: userId,
            idempotencyKey: `phase-${phase}`,
            event: { type: 'generation.phase_changed', phase },
          }),
        ),
      ),
    );

    const events = await ChatGenerationRepository.listEvents(db, generationId, userId);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3]);

    const assistantId = await createAssistantMessage(chatId, userId);
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.committed',
          message: {
            id: assistantId,
            chatId,
            userId,
            role: 'assistant',
            content: 'Done',
            files: null,
            toolCalls: null,
            reasoning: null,
            parentMessageId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      }),
    );
    await expect(
      runInTransaction((trx) =>
        ChatGenerationRepository.appendEvent(trx, {
          generationId,
          ownerUserId: userId,
          event: { type: 'generation.failed', message: 'too late' },
        }),
      ),
    ).rejects.toThrow('followed a terminal event');
    expect(await ChatGenerationRepository.listEvents(db, generationId, userId)).toHaveLength(4);
  });

  it('rolls back an inserted event when its projection update fails', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      }),
    );

    await expect(
      runInTransaction((trx) =>
        ChatGenerationRepository.appendEvent(trx, {
          generationId,
          ownerUserId: userId,
          event: {
            type: 'generation.committed',
            message: {
              id: randomUUID(),
              chatId,
              userId,
              role: 'assistant',
              content: 'This message was never saved',
              files: null,
              toolCalls: null,
              reasoning: null,
              parentMessageId: null,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          },
        }),
      ),
    ).rejects.toThrow();

    expect(await ChatGenerationRepository.listEvents(db, generationId, userId)).toHaveLength(1);
    await expect(
      db
        .selectFrom('app.chatGenerationRuns')
        .select(['status', 'assistantMessageId', 'errorMessage'])
        .where('id', '=', generationId)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({ status: 'running', assistantMessageId: null, errorMessage: null });
  });

  it('rejects unsafe stored sequences without appending another event', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    await db
      .insertInto('app.chatGenerationEvents')
      .values({
        generationId,
        sequence: String(Number.MAX_SAFE_INTEGER + 1),
        type: 'generation.started',
        payload: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      })
      .execute();

    await expect(
      runInTransaction((trx) =>
        ChatGenerationRepository.appendEvent(trx, {
          generationId,
          ownerUserId: userId,
          event: { type: 'generation.phase_changed', phase: 'running' },
        }),
      ),
    ).rejects.toThrow('safe integer range');
    await expect(ChatGenerationRepository.listEvents(db, generationId, userId, -1)).rejects.toThrow(
      'safe integer range',
    );
    await expect(
      ChatGenerationRepository.listEvents(db, generationId, userId, 0.5),
    ).rejects.toThrow('safe integer range');
    await expect(
      ChatGenerationRepository.listEvents(db, generationId, userId, Number.MAX_SAFE_INTEGER + 1),
    ).rejects.toThrow('safe integer range');
    expect(
      await db
        .selectFrom('app.chatGenerationEvents')
        .select('id')
        .where('generationId', '=', generationId)
        .execute(),
    ).toHaveLength(1);
  });

  it('rejects appending after the largest safe sequence', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    await db
      .insertInto('app.chatGenerationEvents')
      .values({
        generationId,
        sequence: String(Number.MAX_SAFE_INTEGER),
        type: 'generation.started',
        payload: {
          type: 'generation.started',
          context: {
            chatId,
            kind: 'send',
            userMessageId: null,
            targetAssistantMessageId: null,
            requestContext: {},
          },
        },
      })
      .execute();

    await expect(
      runInTransaction((trx) =>
        ChatGenerationRepository.appendEvent(trx, {
          generationId,
          ownerUserId: userId,
          event: { type: 'generation.phase_changed', phase: 'running' },
        }),
      ),
    ).rejects.toThrow('safe integer range');
    expect(
      await db
        .selectFrom('app.chatGenerationEvents')
        .select('sequence')
        .where('generationId', '=', generationId)
        .execute(),
    ).toHaveLength(1);
  });

  it('enforces mutually exclusive terminal events in the database', async () => {
    const { chatId, generationId } = await createGeneration();
    await db
      .insertInto('app.chatGenerationEvents')
      .values({
        generationId,
        sequence: 1,
        type: 'generation.committed',
        payload: {
          type: 'generation.committed',
          message: { id: randomUUID(), chatId, role: 'assistant', content: 'Done' },
        },
      })
      .execute();

    await expect(
      db
        .insertInto('app.chatGenerationEvents')
        .values({
          generationId,
          sequence: 2,
          type: 'generation.cancelled',
          payload: { type: 'generation.cancelled' },
        })
        .execute(),
    ).rejects.toThrow();
  });

  it('rolls back repository writes when the enclosing transaction fails', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const toolResult = {
      callId: 'call-rollback',
      toolName: 'write_memory',
      content: '{"id":"memory-rollback"}',
      error: false,
    };

    await expect(
      runInTransaction(async (trx) => {
        await ChatGenerationRepository.appendEvent(trx, {
          generationId,
          ownerUserId: userId,
          event: {
            type: 'generation.started',
            context: {
              chatId,
              kind: 'send',
              userMessageId: null,
              targetAssistantMessageId: null,
              requestContext: {},
            },
          },
        });
        await ChatGenerationRepository.saveToolEffect(trx, {
          generationId,
          ownerUserId: userId,
          idempotencyKey: 'rollback-effect',
          toolName: toolResult.toolName,
          result: toolResult,
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(await ChatGenerationRepository.listEvents(db, generationId, userId)).toEqual([]);
    await expect(
      ChatGenerationRepository.getToolEffect(db, {
        generationId,
        ownerUserId: userId,
        idempotencyKey: 'rollback-effect',
      }),
    ).resolves.toBeNull();
    await expect(
      db
        .selectFrom('app.chatGenerationRuns')
        .select('status')
        .where('id', '=', generationId)
        .executeTakeFirstOrThrow(),
    ).resolves.toEqual({ status: 'preparing' });
  });

  it('rolls back a tool effect when its post-insert read fails', async () => {
    const { userId, generationId } = await createGeneration();
    const getToolEffect = vi
      .spyOn(ChatGenerationRepository, 'getToolEffect')
      .mockResolvedValueOnce(null);

    try {
      await expect(
        runInTransaction((trx) =>
          ChatGenerationRepository.saveToolEffect(trx, {
            generationId,
            ownerUserId: userId,
            idempotencyKey: 'unreadable-effect',
            toolName: 'write_memory',
            result: {
              callId: 'call-unreadable',
              toolName: 'write_memory',
              content: '{}',
              error: false,
            },
          }),
        ),
      ).rejects.toThrow('Unable to persist chat generation tool effect');
    } finally {
      getToolEffect.mockRestore();
    }

    await expect(
      ChatGenerationRepository.getToolEffect(db, {
        generationId,
        ownerUserId: userId,
        idempotencyKey: 'unreadable-effect',
      }),
    ).resolves.toBeNull();
  });
});
