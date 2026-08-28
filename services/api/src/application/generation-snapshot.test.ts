import { describe, expect, it } from 'vitest';

import {
  createGenerationSnapshotCodec,
  GenerationSnapshotIntegrityError,
  type GenerationRecoverySnapshot,
} from './generation-snapshot';

const key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const snapshot: GenerationRecoverySnapshot = {
  version: 1,
  startContext: {
    chatId: 'chat-1',
    kind: 'send',
    userMessageId: 'message-1',
    targetAssistantMessageId: null,
    requestContext: { model: 'test-model' },
  },
  state: {
    generationId: 'generation-1',
    phase: 'awaiting_confirmation',
    iteration: 1,
    turnId: 'turn-1',
    assistantText: 'Before approval',
    reasoningText: '',
    requestedToolCalls: [],
    toolCalls: [],
    pendingToolCalls: [],
    completedToolResults: [],
    activeToolCall: null,
    pendingConfirmation: {
      id: 'call-1',
      name: 'write_memory',
      arguments: '{}',
      iteration: 1,
      turnId: 'turn-1',
    },
    lastError: null,
  },
};

describe('generation snapshot codec', () => {
  it('round trips the minimum private resume state', () => {
    const codec = createGenerationSnapshotCodec(key);
    const encoded = codec.encrypt('generation-1', 'user-1', snapshot);

    expect(codec.decrypt('generation-1', 'user-1', encoded)).toEqual(snapshot);
    expect(encoded).not.toContain('Before approval');
  });

  it('uses a fresh IV for every encryption', () => {
    const codec = createGenerationSnapshotCodec(key);
    expect(codec.encrypt('generation-1', 'user-1', snapshot)).not.toBe(
      codec.encrypt('generation-1', 'user-1', snapshot),
    );
  });

  it('rejects invalid keys, wrong identity, tampering, and malformed envelopes', () => {
    expect(() => createGenerationSnapshotCodec('invalid')).toThrow(
      GenerationSnapshotIntegrityError,
    );
    const codec = createGenerationSnapshotCodec(key);
    const encoded = codec.encrypt('generation-1', 'user-1', snapshot);
    const envelope = JSON.parse(encoded) as { ciphertext: string };
    envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`;

    expect(() => codec.decrypt('generation-1', 'other-user', encoded)).toThrow(
      GenerationSnapshotIntegrityError,
    );
    expect(() => codec.decrypt('generation-1', 'user-1', JSON.stringify(envelope))).toThrow(
      GenerationSnapshotIntegrityError,
    );
    expect(() => codec.decrypt('generation-1', 'user-1', '{}')).toThrow(
      GenerationSnapshotIntegrityError,
    );
  });
});
