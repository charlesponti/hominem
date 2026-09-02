import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ info: vi.fn() }));

vi.mock('@hominem/telemetry', () => ({ logger: { info: mocks.info } }));

import {
  recordGenerationDiagnostic,
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

    expect(mocks.info).toHaveBeenCalledWith('chat_generation_event_delivered', {
      generationId: 'generation-1',
      sequence: 3,
      delivery: 'live',
    });
    expect(mocks.info).toHaveBeenCalledWith('chat_generation_diagnostic', {
      generationId: 'generation-1',
      durableSequence: 3,
      replayCursor: 3,
      deliveryMode: 'live',
    });
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('arguments');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('result');
  });

  it('records the complete scalar diagnostic contract without payload data', () => {
    recordGenerationDiagnostic({
      generationId: 'generation-1',
      attempt: 2,
      turnId: 'turn-1',
      durableSequence: 8,
      replayCursor: 7,
      deliveryMode: 'replayed',
      recoveryDecision: 'resume_required',
      terminalOutcome: 'failed',
      errorCategory: 'provider',
      effectOutcome: 'failed',
    });

    expect(mocks.info).toHaveBeenCalledWith('chat_generation_diagnostic', {
      generationId: 'generation-1',
      attempt: 2,
      turnId: 'turn-1',
      durableSequence: 8,
      replayCursor: 7,
      deliveryMode: 'replayed',
      recoveryDecision: 'resume_required',
      terminalOutcome: 'failed',
      errorCategory: 'provider',
      effectOutcome: 'failed',
    });
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('arguments');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('result');
  });
});
