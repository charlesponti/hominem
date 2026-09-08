import { randomUUID } from 'node:crypto';

import type { ChatGenerationEventRecord } from '@hominem/db/chats';
import { ChatGenerationRepository } from '@hominem/db/chats';
import { authDb, db } from '@hominem/db/core';
import { runInTransaction } from '@hominem/db/transaction';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ChatGenerationStore } from './chat-generation-store';

const event = (sequence: number): ChatGenerationEventRecord => ({
  id: `event-${sequence}`,
  generationId: 'generation-1',
  sequence,
  type: 'generation.phase_changed',
  payload: { type: 'generation.phase_changed', phase: 'running' },
  idempotencyKey: `phase-${sequence}`,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('ChatGenerationStore local pub/sub', () => {
  it('delivers events published after subscription and closes cleanly', async () => {
    const subscription = ChatGenerationStore.subscribe('generation-1');
    ChatGenerationStore.publish(event(1));

    await expect(subscription[Symbol.asyncIterator]().next()).resolves.toMatchObject({
      done: false,
      value: event(1),
    });
    subscription.close();
    await expect(subscription[Symbol.asyncIterator]().next()).resolves.toMatchObject({
      done: true,
    });
  });

  it('isolates subscribers by generation', async () => {
    const subscription = ChatGenerationStore.subscribe('generation-2');
    ChatGenerationStore.publish(event(1));

    const iterator = subscription[Symbol.asyncIterator]();
    const pending = iterator.next();
    subscription.close();
    await expect(pending).resolves.toMatchObject({ done: true });
  });

  it('queues multiple events and closes through iterator return', async () => {
    const subscription = ChatGenerationStore.subscribe('generation-1');
    const iterator = subscription[Symbol.asyncIterator]();
    const pending = iterator.next();

    ChatGenerationStore.publish(event(1));
    await expect(pending).resolves.toMatchObject({ done: false, value: event(1) });

    ChatGenerationStore.publish(event(2));
    ChatGenerationStore.publish(event(3));
    await expect(iterator.next()).resolves.toMatchObject({ done: false, value: event(2) });
    await expect(iterator.next()).resolves.toMatchObject({ done: false, value: event(3) });
    await expect(iterator.return?.()).resolves.toMatchObject({ done: true });
    await expect(iterator.next()).resolves.toMatchObject({ done: true });
    subscription.close();
  });
});

function nextWithTimeout<T>(iterator: AsyncIterator<T>, ms: number): Promise<IteratorResult<T>> {
  return Promise.race([
    iterator.next(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`No event received within ${ms}ms`)), ms),
    ),
  ]);
}

describe('ChatGenerationStore Postgres NOTIFY listener', () => {
  const userIds: string[] = [];

  beforeEach(async () => {
    ChatGenerationStore.start();
    // Give the dedicated client time to connect and issue LISTEN before any
    // test fires a NOTIFY — there's no synchronous "ready" signal to await.
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  afterEach(async () => {
    await ChatGenerationStore.stop();
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
      .values({ id: userId, name: 'Notify Listener User', email: `${userId}@example.com` })
      .execute();
    await db
      .insertInto('app.chats')
      .values({ id: chatId, ownerUserid: userId, title: 'Notify listener test' })
      .execute();
    await db
      .insertInto('app.chatGenerationRuns')
      .values({ id: generationId, chatId, ownerUserId: userId, kind: 'send', status: 'preparing' })
      .execute();

    return { userId, chatId, generationId };
  }

  it('delivers a durably-appended event to a local subscriber via NOTIFY', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const subscription = ChatGenerationStore.subscribe(generationId);
    const iterator = subscription[Symbol.asyncIterator]();

    try {
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

      const step = await nextWithTimeout(iterator, 5_000);
      expect(step.done).toBe(false);
      expect(step.value).toMatchObject({
        generationId,
        type: 'generation.started',
      });
      // `sequence` is a DB identity column shared across all generations
      // (see the 20260903030000 migration), not app-computed per generation.
      expect(Number.isSafeInteger((step.value as { sequence: number }).sequence)).toBe(true);
    } finally {
      subscription.close();
    }
  });

  it('delivers events in order across multiple appends to the same generation', async () => {
    const { userId, chatId, generationId } = await createGeneration();
    const subscription = ChatGenerationStore.subscribe(generationId);
    const iterator = subscription[Symbol.asyncIterator]();

    try {
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
          event: { type: 'generation.phase_changed', phase: 'running' },
        }),
      );

      const first = await nextWithTimeout(iterator, 5_000);
      const second = await nextWithTimeout(iterator, 5_000);
      expect(first.value).toMatchObject({ type: 'generation.started' });
      expect(second.value).toMatchObject({ type: 'generation.phase_changed' });
      // `sequence` is a DB identity column shared across all generations,
      // so only strictly-ascending order (not literal values) is asserted.
      expect((second.value as { sequence: number }).sequence).toBeGreaterThan(
        (first.value as { sequence: number }).sequence,
      );
    } finally {
      subscription.close();
    }
  });
});
