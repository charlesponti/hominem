import type { ChatGenerationEventRecord } from '@hominem/db/chats';
import { describe, expect, it } from 'vitest';

import { GenerationPubSub } from './generation-pub-sub';

const event = (sequence: number): ChatGenerationEventRecord => ({
  id: `event-${sequence}`,
  generationId: 'generation-1',
  sequence,
  type: 'generation.phase_changed',
  payload: { type: 'generation.phase_changed', phase: 'running' },
  idempotencyKey: `phase-${sequence}`,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('GenerationPubSub', () => {
  it('delivers events published after subscription and closes cleanly', async () => {
    const subscription = GenerationPubSub.subscribe('generation-1');
    GenerationPubSub.publish(event(1));

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
    const subscription = GenerationPubSub.subscribe('generation-2');
    GenerationPubSub.publish(event(1));

    const iterator = subscription[Symbol.asyncIterator]();
    const pending = iterator.next();
    subscription.close();
    await expect(pending).resolves.toMatchObject({ done: true });
  });

  it('queues multiple events and closes through iterator return', async () => {
    const subscription = GenerationPubSub.subscribe('generation-1');
    const iterator = subscription[Symbol.asyncIterator]();
    const pending = iterator.next();

    GenerationPubSub.publish(event(1));
    await expect(pending).resolves.toMatchObject({ done: false, value: event(1) });

    GenerationPubSub.publish(event(2));
    GenerationPubSub.publish(event(3));
    await expect(iterator.next()).resolves.toMatchObject({ done: false, value: event(2) });
    await expect(iterator.next()).resolves.toMatchObject({ done: false, value: event(3) });
    await expect(iterator.return?.()).resolves.toMatchObject({ done: true });
    await expect(iterator.next()).resolves.toMatchObject({ done: true });
    subscription.close();
  });
});
