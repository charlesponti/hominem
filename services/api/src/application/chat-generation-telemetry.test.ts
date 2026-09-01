import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock('@hominem/telemetry', () => ({ logger: { info: mocks.info } }));

import {
  recordGenerationEventDeduplicated,
  recordGenerationEventDelivery,
  recordGenerationRecovery,
  recordGenerationToolEffect,
} from './chat-generation-telemetry';

describe('chat generation telemetry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('records correlation fields without accepting payload fields', () => {
    recordGenerationEventDelivery({ generationId: 'generation-1', sequence: 3, delivery: 'live' });
    recordGenerationEventDeduplicated({ generationId: 'generation-1', sequence: 3 });
    recordGenerationToolEffect({
      generationId: 'generation-1',
      toolName: 'write_memory',
      outcome: 'reused',
    });
    recordGenerationRecovery({
      generationId: 'generation-1',
      phase: 'awaiting_confirmation',
      disposition: 'awaiting_confirmation',
      lastDurableSequence: 3,
    });

    expect(mocks.info).toHaveBeenNthCalledWith(1, 'chat_generation_event_delivered', {
      generationId: 'generation-1',
      sequence: 3,
      delivery: 'live',
    });
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('arguments');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('result');
  });
});
