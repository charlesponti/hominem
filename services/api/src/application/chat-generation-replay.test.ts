import {
  chatMessageSnapshotSchema,
  parseGenerationHistoryEvent,
  toolEventRoundTripFixture,
} from '@hominem/chat';
import { describe, expect, it, vi } from 'vitest';

import {
  replayGenerationEvents,
  type GenerationReplaySource,
  type ReplayEventRecord,
} from './chat-generation-replay';

function event(sequence: number, type: 'generation.phase_changed'): ReplayEventRecord;
function event(sequence: number, type: 'generation.failed'): ReplayEventRecord;
function event(sequence: number, type: 'generation.committed'): ReplayEventRecord;
function event(sequence: number, type: ReplayEventRecord['type']): ReplayEventRecord {
  const base = { generationId: 'generation-1', sequence };
  switch (type) {
    case 'generation.phase_changed':
      return { ...base, type, payload: { type, phase: 'running' } };
    case 'generation.failed':
      return { ...base, type, payload: { type, message: 'failed' } };
    case 'generation.committed':
      return {
        ...base,
        type,
        payload: {
          type,
          message: chatMessageSnapshotSchema.parse({
            id: 'message-1',
            chatId: 'chat-1',
            userId: 'user-1',
            role: 'assistant',
            content: 'done',
            files: null,
            toolCalls: null,
            reasoning: null,
            parentMessageId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }),
        },
      };
    default:
      throw new Error(`Unsupported test event ${type}`);
  }
}

function source(
  history: readonly ReplayEventRecord[],
  live: readonly ReplayEventRecord[],
): GenerationReplaySource {
  const pending = [...live];
  const subscription: AsyncIterable<ReplayEventRecord> & { close: () => void } = {
    close: vi.fn(),
    [Symbol.asyncIterator]() {
      return {
        next: async (): Promise<IteratorResult<ReplayEventRecord>> => {
          const next = pending.shift();
          if (next) return { done: false, value: next };
          return new Promise<IteratorResult<ReplayEventRecord>>(() => undefined);
        },
      };
    },
  };
  return {
    load: async () => history,
    subscribe: () => subscription,
    onDelivery: undefined,
    onDeduplicated: undefined,
  };
}

describe('replayGenerationEvents', () => {
  it('replays the shared persisted tool fixture as canonical history through the terminal event', async () => {
    const history: ReplayEventRecord[] = toolEventRoundTripFixture().map((payload, index) => {
      const parsed = parseGenerationHistoryEvent({
        version: 1,
        generationId: 'generation-1',
        sequence: index + 1,
        type: payload.type,
        payload,
      });
      return {
        generationId: parsed.generationId,
        sequence: parsed.sequence,
        type: parsed.type,
        payload: parsed.payload,
      };
    });
    const replayed: ReplayEventRecord[] = [];
    const replaySource = source(history, []);

    for await (const event of replayGenerationEvents(replaySource, 0)) {
      replayed.push({
        generationId: event.generationId,
        sequence: event.sequence,
        type: event.type,
        payload: event.payload,
      });
    }

    expect(replayed).toEqual(history);
    expect(replayed.at(-1)).toMatchObject({
      sequence: 11,
      type: 'generation.committed',
    });
  });

  it('deduplicates history/live overlap and stops at the first terminal event', async () => {
    const delivered: string[] = [];
    const deduplicated: number[] = [];
    const subscription = source(
      [event(1, 'generation.phase_changed')],
      [event(1, 'generation.phase_changed'), event(2, 'generation.committed')],
    );
    subscription.onDelivery = ({ sequence, delivery }) => delivered.push(`${delivery}:${sequence}`);
    subscription.onDeduplicated = ({ sequence }) => deduplicated.push(sequence);
    const received: GenerationEventType[] = [];
    for await (const value of replayGenerationEvents(subscription, 0)) {
      received.push(value.type);
    }
    expect(received).toEqual(['generation.phase_changed', 'generation.committed']);
    expect(delivered).toEqual(['replayed:1', 'live:2']);
    expect(deduplicated).toEqual([1]);
    expect(subscription.subscribe().close).toHaveBeenCalled();
  });
});

type GenerationEventType = ReplayEventRecord['type'];
