import type { GenerationHistoryEvent } from '@hominem/chat';
import { parseGenerationHistoryEvent } from '@hominem/chat';

export type ReplayEventRecord = {
  generationId: string;
  sequence: number;
  type: GenerationHistoryEvent['type'];
  payload: GenerationHistoryEvent['payload'];
};

export type GenerationReplaySource = {
  load: () => Promise<readonly ReplayEventRecord[]>;
  subscribe: () => AsyncIterable<ReplayEventRecord> & { close: () => void };
  stopAfterLoad?: boolean;
  onDelivery?: (input: {
    generationId: string;
    sequence: number;
    delivery: 'live' | 'replayed';
  }) => void;
  onDeduplicated?: (input: { generationId: string; sequence: number }) => void;
};

function isTerminal(type: ReplayEventRecord['type']): boolean {
  return (
    type === 'generation.committed' ||
    type === 'generation.cancelled' ||
    type === 'generation.failed'
  );
}

export async function* replayGenerationEvents(
  source: GenerationReplaySource,
  afterSequence: number,
): AsyncIterable<GenerationHistoryEvent> {
  const subscription = source.subscribe();
  let cursor = afterSequence;
  try {
    const history = await source.load();
    for (const record of history) {
      if (record.sequence <= cursor) {
        source.onDeduplicated?.({ generationId: record.generationId, sequence: record.sequence });
        continue;
      }
      cursor = record.sequence;
      source.onDelivery?.({
        generationId: record.generationId,
        sequence: record.sequence,
        delivery: 'replayed',
      });
      yield parseGenerationHistoryEvent({
        version: 1,
        generationId: record.generationId,
        sequence: record.sequence,
        type: record.type,
        payload: record.payload,
      });
      if (isTerminal(record.type)) return;
    }
    if (source.stopAfterLoad) return;

    // The terminal event can be committed between the initial load and the
    // subscription becoming observable. Recheck durable history once before
    // waiting so a reload cannot get stuck on a missed live publication.
    const handoffHistory = await source.load();
    for (const record of handoffHistory) {
      if (record.sequence <= cursor) continue;
      cursor = record.sequence;
      source.onDelivery?.({
        generationId: record.generationId,
        sequence: record.sequence,
        delivery: 'replayed',
      });
      yield parseGenerationHistoryEvent({
        version: 1,
        generationId: record.generationId,
        sequence: record.sequence,
        type: record.type,
        payload: record.payload,
      });
      if (isTerminal(record.type)) return;
    }

    for await (const record of subscription) {
      if (record.sequence <= cursor) {
        source.onDeduplicated?.({ generationId: record.generationId, sequence: record.sequence });
        continue;
      }
      cursor = record.sequence;
      source.onDelivery?.({
        generationId: record.generationId,
        sequence: record.sequence,
        delivery: 'live',
      });
      yield parseGenerationHistoryEvent({
        version: 1,
        generationId: record.generationId,
        sequence: record.sequence,
        type: record.type,
        payload: record.payload,
      });
      if (isTerminal(record.type)) return;
    }
  } finally {
    subscription.close();
  }
}
