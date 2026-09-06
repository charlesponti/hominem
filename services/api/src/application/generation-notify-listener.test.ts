import { randomUUID } from 'node:crypto';

import { ChatGenerationRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { authDb } from '@hominem/db/core';
import { runInTransaction } from '@hominem/db/transaction';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  startGenerationNotifyListener,
  type GenerationNotifyListener,
} from './generation-notify-listener';
import { GenerationPubSub } from './generation-pub-sub';

function nextWithTimeout<T>(iterator: AsyncIterator<T>, ms: number): Promise<IteratorResult<T>> {
  return Promise.race([
    iterator.next(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`No event received within ${ms}ms`)), ms),
    ),
  ]);
}

describe('generation notify listener', () => {
  let listener: GenerationNotifyListener;
  const userIds: string[] = [];

  beforeEach(async () => {
    listener = startGenerationNotifyListener();
    // Give the dedicated client time to connect and issue LISTEN before any
    // test fires a NOTIFY — there's no synchronous "ready" signal to await.
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  afterEach(async () => {
    await listener.close();
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
    const subscription = GenerationPubSub.subscribe(generationId);
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
    const subscription = GenerationPubSub.subscribe(generationId);
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
