import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { GenerationStartContext, GenerationState } from '@hominem/chat';
import * as z from 'zod';

const SNAPSHOT_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';

const toolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  arguments: z.string(),
  iteration: z.number().int().nonnegative(),
  turnId: z.string().min(1),
});
const toolResultSchema = z.object({
  callId: z.string().min(1),
  toolName: z.string().min(1),
  content: z.string(),
  error: z.boolean(),
});
const stateSchema = z.object({
  generationId: z.string().min(1),
  phase: z.enum([
    'preparing',
    'running',
    'awaiting_confirmation',
    'saving',
    'cancel_requested',
    'committed',
    'cancelled',
    'failed',
  ]),
  iteration: z.number().int().nonnegative(),
  turnId: z.string().nullable(),
  assistantText: z.string(),
  reasoningText: z.string(),
  requestedToolCalls: z.array(toolCallSchema),
  toolCalls: z.array(toolCallSchema),
  pendingToolCalls: z.array(toolCallSchema),
  completedToolResults: z.array(toolResultSchema),
  activeToolCall: toolCallSchema.nullable(),
  pendingConfirmation: toolCallSchema.nullable(),
  lastError: z.string().nullable(),
});
const snapshotSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  startContext: z.object({
    chatId: z.string().min(1),
    kind: z.enum(['send', 'start', 'regenerate']),
    userMessageId: z.string().min(1).nullable(),
    targetAssistantMessageId: z.string().min(1).nullable(),
    requestContext: z.record(z.string(), z.json()),
  }),
  state: stateSchema,
});
const envelopeSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  algorithm: z.literal(ALGORITHM),
  iv: z.string().min(1),
  ciphertext: z.string().min(1),
  tag: z.string().min(1),
});

export type GenerationRecoverySnapshot = {
  version: 1;
  startContext: GenerationStartContext;
  state: GenerationState;
};

export class GenerationSnapshotIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationSnapshotIntegrityError';
  }
}

function keyFromBase64(value: string): Buffer {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new GenerationSnapshotIntegrityError('CHAT_GENERATION_SNAPSHOT_KEY must be 32 bytes');
  }
  return key;
}

function associatedData(generationId: string, ownerUserId: string): Buffer {
  return Buffer.from(`generation-snapshot:v1:${generationId}:${ownerUserId}`);
}

export function createGenerationSnapshotCodec(keyValue: string) {
  const key = keyFromBase64(keyValue);

  return {
    encrypt(generationId: string, ownerUserId: string, snapshot: GenerationRecoverySnapshot) {
      const plaintext = snapshotSchema.parse(snapshot);
      const iv = randomBytes(12);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      cipher.setAAD(associatedData(generationId, ownerUserId));
      const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(plaintext), 'utf8'),
        cipher.final(),
      ]);
      return JSON.stringify({
        version: SNAPSHOT_VERSION,
        algorithm: ALGORITHM,
        iv: iv.toString('base64'),
        ciphertext: ciphertext.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
      });
    },

    decrypt(
      generationId: string,
      ownerUserId: string,
      encoded: string,
    ): GenerationRecoverySnapshot {
      try {
        const envelope = envelopeSchema.parse(JSON.parse(encoded));
        const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(envelope.iv, 'base64'));
        decipher.setAAD(associatedData(generationId, ownerUserId));
        decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
        const plaintext = Buffer.concat([
          decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
          decipher.final(),
        ]);
        return snapshotSchema.parse(JSON.parse(plaintext.toString('utf8')));
      } catch {
        throw new GenerationSnapshotIntegrityError(
          'Generation snapshot failed integrity validation',
        );
      }
    },
  };
}
