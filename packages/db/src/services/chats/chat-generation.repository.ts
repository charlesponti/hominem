import {
  rebuildGenerationProjection,
  reduceGenerationProjection,
  type GenerationEventPayload,
  type GenerationRunIdentity,
  type GenerationRunProjection,
  type ToolResult,
} from '@hominem/chat';
import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type {
  AppChatGenerationEvents,
  AppChatGenerationToolEffects,
  Json,
} from '../../types/database';
import type { ChatGenerationStatus } from './chat.repository';

type GenerationEventRow = Selectable<AppChatGenerationEvents>;
type ToolEffectRow = Selectable<AppChatGenerationToolEffects>;

export interface ChatGenerationEventRecord {
  id: string;
  generationId: string;
  sequence: number;
  type: GenerationEventPayload['type'];
  payload: GenerationEventPayload;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface AppendChatGenerationEventInput {
  generationId: string;
  ownerUserId: string;
  event: GenerationEventPayload;
  idempotencyKey?: string;
}

export interface ChatGenerationToolEffectRecord {
  id: string;
  generationId: string;
  idempotencyKey: string;
  toolName: string;
  result: ToolResult;
  createdAt: string;
}

function toEventRecord(row: GenerationEventRow): ChatGenerationEventRecord {
  const sequence = Number(row.sequence);
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('Chat generation event sequence is outside the safe integer range');
  }
  return {
    id: row.id,
    generationId: row.generationId,
    sequence,
    type: row.type as GenerationEventPayload['type'],
    payload: row.payload as GenerationEventPayload,
    idempotencyKey: row.idempotencyKey,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function toGenerationIdentity(row: {
  id: string;
  chatId: string;
  ownerUserId: string;
  kind: string;
  userMessageId: string | null;
  targetAssistantMessageId: string | null;
}): GenerationRunIdentity {
  return {
    generationId: row.id,
    chatId: row.chatId,
    ownerUserId: row.ownerUserId,
    kind: row.kind as GenerationRunIdentity['kind'],
    userMessageId: row.userMessageId,
    targetAssistantMessageId: row.targetAssistantMessageId,
  };
}

function projectionUpdate(projection: GenerationRunProjection) {
  return {
    status: projection.status as ChatGenerationStatus,
    assistantMessageId: projection.assistantMessageId,
    errorMessage: projection.errorMessage,
  };
}

function assertSafeCursor(afterSequence: number): void {
  if (!Number.isSafeInteger(afterSequence) || afterSequence < 0) {
    throw new Error('Chat generation event cursor is outside the safe integer range');
  }
}

function toToolEffectRecord(row: ToolEffectRow): ChatGenerationToolEffectRecord {
  return {
    id: row.id,
    generationId: row.generationId,
    idempotencyKey: row.idempotencyKey,
    toolName: row.toolName,
    result: row.result as ToolResult,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export const ChatGenerationRepository = {
  async appendEvent(
    handle: DbHandle,
    input: AppendChatGenerationEventInput,
  ): Promise<ChatGenerationEventRecord> {
    const run = (await handle
      .selectFrom('app.chatGenerationRuns')
      .select(['id', 'chatId', 'ownerUserId', 'kind', 'userMessageId', 'targetAssistantMessageId'])
      .where('id', '=', input.generationId)
      .where('ownerUserId', '=', input.ownerUserId)
      .forUpdate()
      .executeTakeFirstOrThrow()) as {
      id: string;
      chatId: string;
      ownerUserId: string;
      kind: string;
      userMessageId: string | null;
      targetAssistantMessageId: string | null;
    };

    const existing = input.idempotencyKey
      ? await handle
          .selectFrom('app.chatGenerationEvents')
          .selectAll()
          .where('generationId', '=', input.generationId)
          .where('idempotencyKey', '=', input.idempotencyKey)
          .executeTakeFirst()
      : undefined;

    if (existing) return toEventRecord(existing as GenerationEventRow);

    const priorRows = await handle
      .selectFrom('app.chatGenerationEvents')
      .selectAll()
      .where('generationId', '=', input.generationId)
      .orderBy('sequence', 'asc')
      .execute();
    const events = priorRows.map((row) => toEventRecord(row as GenerationEventRow));
    const prior = events.length > 0 ? events.map((event) => event.payload) : [];
    const identity = toGenerationIdentity(run);
    const current = prior.length > 0 ? rebuildGenerationProjection(identity, prior) : null;
    const next = reduceGenerationProjection(current, identity, input.event);
    const previousSequence = events.length > 0 ? BigInt(priorRows.at(-1)!.sequence) : 0n;
    if (previousSequence >= BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error('Chat generation event sequence is outside the safe integer range');
    }
    const sequence = Number(previousSequence + 1n);

    const inserted = await handle
      .insertInto('app.chatGenerationEvents')
      .values({
        generationId: input.generationId,
        sequence,
        type: input.event.type,
        payload: input.event as unknown as Json,
        idempotencyKey: input.idempotencyKey ?? null,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await handle
      .updateTable('app.chatGenerationRuns')
      .set({
        ...projectionUpdate(next),
        encryptedSnapshot: ['committed', 'cancelled', 'failed'].includes(next.status)
          ? null
          : undefined,
      })
      .where('id', '=', input.generationId)
      .where('ownerUserId', '=', input.ownerUserId)
      .executeTakeFirstOrThrow();

    return toEventRecord(inserted as GenerationEventRow);
  },

  async listEvents(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
    afterSequence = 0,
  ): Promise<ChatGenerationEventRecord[]> {
    assertSafeCursor(afterSequence);
    const rows = await handle
      .selectFrom('app.chatGenerationEvents as event')
      .innerJoin('app.chatGenerationRuns as run', 'run.id', 'event.generationId')
      .select([
        'event.id',
        'event.generationId',
        'event.sequence',
        'event.type',
        'event.payload',
        'event.idempotencyKey',
        'event.createdAt',
        'event.updatedAt',
      ])
      .where('event.generationId', '=', generationId)
      .where('run.ownerUserId', '=', ownerUserId)
      .where('event.sequence', '>', String(afterSequence))
      .orderBy('event.sequence', 'asc')
      .execute();

    return rows.map((row) => toEventRecord(row as GenerationEventRow));
  },

  async saveSnapshot(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
    encryptedSnapshot: string,
  ): Promise<void> {
    await handle
      .updateTable('app.chatGenerationRuns')
      .set({ encryptedSnapshot })
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .where('status', 'not in', ['committed', 'cancelled', 'failed'])
      .executeTakeFirstOrThrow();
  },

  async getSnapshot(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
  ): Promise<string | null> {
    const row = await handle
      .selectFrom('app.chatGenerationRuns')
      .select('encryptedSnapshot')
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .where('status', 'not in', ['committed', 'cancelled', 'failed'])
      .executeTakeFirst();

    return row?.encryptedSnapshot ?? null;
  },

  async rebuildProjection(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
  ): Promise<GenerationRunProjection> {
    const run = (await handle
      .selectFrom('app.chatGenerationRuns')
      .select(['id', 'chatId', 'ownerUserId', 'kind', 'userMessageId', 'targetAssistantMessageId'])
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .forUpdate()
      .executeTakeFirstOrThrow()) as {
      id: string;
      chatId: string;
      ownerUserId: string;
      kind: string;
      userMessageId: string | null;
      targetAssistantMessageId: string | null;
    };
    const rows = await handle
      .selectFrom('app.chatGenerationEvents')
      .selectAll()
      .where('generationId', '=', generationId)
      .orderBy('sequence', 'asc')
      .execute();
    const identity = toGenerationIdentity(run);
    const projection = rebuildGenerationProjection(
      identity,
      rows.map((row) => row.payload as unknown as GenerationEventPayload),
    );
    await handle
      .updateTable('app.chatGenerationRuns')
      .set({
        ...projectionUpdate(projection),
        encryptedSnapshot: ['committed', 'cancelled', 'failed'].includes(projection.status)
          ? null
          : undefined,
      })
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .executeTakeFirstOrThrow();
    return projection;
  },

  async getToolEffect(
    handle: DbHandle,
    input: { generationId: string; ownerUserId: string; idempotencyKey: string },
  ): Promise<ChatGenerationToolEffectRecord | null> {
    const row = await handle
      .selectFrom('app.chatGenerationToolEffects as effect')
      .innerJoin('app.chatGenerationRuns as run', 'run.id', 'effect.generationId')
      .select([
        'effect.id',
        'effect.generationId',
        'effect.idempotencyKey',
        'effect.toolName',
        'effect.result',
        'effect.createdAt',
      ])
      .where('effect.generationId', '=', input.generationId)
      .where('run.ownerUserId', '=', input.ownerUserId)
      .where('effect.idempotencyKey', '=', input.idempotencyKey)
      .executeTakeFirst();

    return row ? toToolEffectRecord(row as ToolEffectRow) : null;
  },

  async saveToolEffect(
    handle: DbHandle,
    input: {
      generationId: string;
      ownerUserId: string;
      idempotencyKey: string;
      toolName: string;
      result: ToolResult;
    },
  ): Promise<ChatGenerationToolEffectRecord> {
    await handle
      .selectFrom('app.chatGenerationRuns')
      .select('id')
      .where('id', '=', input.generationId)
      .where('ownerUserId', '=', input.ownerUserId)
      .forUpdate()
      .executeTakeFirstOrThrow();

    await handle
      .insertInto('app.chatGenerationToolEffects')
      .values({
        generationId: input.generationId,
        idempotencyKey: input.idempotencyKey,
        toolName: input.toolName,
        result: input.result as unknown as Json,
      })
      .onConflict((conflict) => conflict.columns(['generationId', 'idempotencyKey']).doNothing())
      .execute();

    const saved = await ChatGenerationRepository.getToolEffect(handle, input);
    if (!saved) throw new Error('Unable to persist chat generation tool effect');
    return saved;
  },
};
