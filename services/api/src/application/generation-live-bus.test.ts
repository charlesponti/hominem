import { describe, expect, it } from 'vitest';

import { publishGenerationEvent, subscribeToGenerationEvents } from './generation-live-bus';

const event = (sequence: number) => ({
  id: `event-${sequence}`,
  generationId: 'generation-1',
  sequence,
  type: 'generation.phase_changed' as const,
  payload: { type: 'generation.phase_changed' as const, phase: 'running' as const },
  idempotencyKey: `phase-${sequence}`,
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('generation live bus', () => {
  it('delivers events published after subscription and closes cleanly', async () => {
    const subscription = subscribeToGenerationEvents('generation-1');
    publishGenerationEvent(event(1));

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
    const subscription = subscribeToGenerationEvents('generation-2');
    publishGenerationEvent(event(1));

    const iterator = subscription[Symbol.asyncIterator]();
    const pending = iterator.next();
    subscription.close();
    await expect(pending).resolves.toMatchObject({ done: true });
  });
});
