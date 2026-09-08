import type {
  ChatMessageSnapshot,
  GenerationDeltaEventPayload,
  GenerationEffectStore,
  GenerationEvent,
  GenerationHistoryEvent,
} from '@hominem/chat';
import {
  chatMessageSnapshotSchema,
  chatSnapshotSchema,
  parseGenerationHistoryEvent,
} from '@hominem/chat';
import type { ChatGenerationEventRecord } from '@hominem/db/chats';
import { ChatGenerationRepository, ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';

import { recordGenerationToolEffect } from './chat-generation-telemetry';

export function toHistoryEvent(record: ChatGenerationEventRecord): GenerationHistoryEvent {
  return parseGenerationHistoryEvent({
    version: 1,
    generationId: record.generationId,
    sequence: record.sequence,
    type: record.type,
    payload: record.payload,
  });
}

export function toMessageSnapshot(message: ChatMessageSnapshot): ChatMessageSnapshot {
  const parsed = chatMessageSnapshotSchema.parse(message);
  if (parsed.role !== 'user' && parsed.role !== 'assistant') {
    throw new Error('Generation snapshots only support user and assistant messages');
  }
  return { ...parsed, role: parsed.role };
}

export function toChatSnapshot(chat: Awaited<ReturnType<typeof ChatRepository.getOwnedOrThrow>>) {
  return chatSnapshotSchema.parse(chat);
}

export function toLiveEvent(
  generationId: string,
  payload: GenerationDeltaEventPayload,
): GenerationEvent {
  switch (payload.type) {
    case 'text-delta':
      return { version: 1, generationId, sequence: null, type: 'text-delta', payload };
    case 'reasoning-delta':
      return { version: 1, generationId, sequence: null, type: 'reasoning-delta', payload };
  }
}

export function createEffectStore(ownerUserId: string): GenerationEffectStore {
  return {
    get: async ({ generationId, idempotencyKey, toolName }) => {
      const effect = await ChatGenerationRepository.getToolEffect(db, {
        generationId,
        ownerUserId,
        idempotencyKey,
      });
      if (!effect) return null;
      recordGenerationToolEffect({ generationId, toolName, outcome: 'reused' });
      return effect.result;
    },
    save: async ({ generationId, idempotencyKey, toolName, result }) => {
      const effect = await ChatGenerationRepository.saveToolEffect(db, {
        generationId,
        ownerUserId,
        idempotencyKey,
        toolName,
        result,
      });
      recordGenerationToolEffect({
        generationId,
        toolName,
        outcome: result.error ? 'failed' : 'executed',
      });
      return effect.result;
    },
  };
}
