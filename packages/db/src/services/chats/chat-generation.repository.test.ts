import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { authDb, db } from '../../db';
import { runInTransaction } from '../../transaction';
import { ChatGenerationRepository } from './chat-generation.repository';

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

    return { userId, generationId };
  }

  it('appends ordered events idempotently and updates the projection atomically', async () => {
    const { userId, generationId } = await createGeneration();
    const event = { type: 'generation.started' as const, generationId };

    const first = await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event,
        idempotencyKey: 'start-effect',
        projection: { status: 'running' },
      }),
    );
    const replay = await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event,
        idempotencyKey: 'start-effect',
        projection: { status: 'running' },
      }),
    );

    expect(first.sequence).toBe(1);
    expect(replay.id).toBe(first.id);
    expect(await ChatGenerationRepository.listEvents(db, generationId, userId)).toHaveLength(1);
    await expect(
      ChatGenerationRepository.listEvents(db, generationId, randomUUID()),
    ).resolves.toEqual([]);
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

  it('allocates the next sequence without an idempotency key and enforces ownership', async () => {
    const { userId, generationId } = await createGeneration();
    const first = await runInTransaction((trx) =>
      ChatGenerationRepository.appendEvent(trx, {
        generationId,
        ownerUserId: userId,
        event: { type: 'generation.started', generationId },
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
});
