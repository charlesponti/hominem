import type { GenerationEventPayload, ToolResult } from '@hominem/chat';
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
  projection?: {
    status: ChatGenerationStatus;
    assistantMessageId?: string | null;
    errorMessage?: string | null;
  };
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
  return {
    id: row.id,
    generationId: row.generationId,
    sequence: Number(row.sequence),
    type: row.type as GenerationEventPayload['type'],
    payload: row.payload as GenerationEventPayload,
    idempotencyKey: row.idempotencyKey,
    createdAt: new Date(row.createdAt).toISOString(),
  };
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
    const existing = input.idempotencyKey
      ? await handle
          .selectFrom('app.chatGenerationEvents')
          .selectAll()
          .where('generationId', '=', input.generationId)
          .where('idempotencyKey', '=', input.idempotencyKey)
          .executeTakeFirst()
      : undefined;

    if (existing) return toEventRecord(existing as GenerationEventRow);

    await handle
      .selectFrom('app.chatGenerationRuns')
      .select('id')
      .where('id', '=', input.generationId)
      .where('ownerUserId', '=', input.ownerUserId)
      .forUpdate()
      .executeTakeFirstOrThrow();

    const existingAfterLock = input.idempotencyKey
      ? await handle
          .selectFrom('app.chatGenerationEvents')
          .selectAll()
          .where('generationId', '=', input.generationId)
          .where('idempotencyKey', '=', input.idempotencyKey)
          .executeTakeFirst()
      : undefined;

    if (existingAfterLock) return toEventRecord(existingAfterLock as GenerationEventRow);

    const previous = await handle
      .selectFrom('app.chatGenerationEvents')
      .select('sequence')
      .where('generationId', '=', input.generationId)
      .orderBy('sequence', 'desc')
      .limit(1)
      .executeTakeFirst();
    const sequence = previous ? Number(previous.sequence) + 1 : 1;

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

    if (input.projection) {
      await handle
        .updateTable('app.chatGenerationRuns')
        .set({
          status: input.projection.status,
          assistantMessageId: input.projection.assistantMessageId,
          errorMessage: input.projection.errorMessage,
        })
        .where('id', '=', input.generationId)
        .where('ownerUserId', '=', input.ownerUserId)
        .executeTakeFirstOrThrow();
    }

    return toEventRecord(inserted as GenerationEventRow);
  },

  async listEvents(
    handle: DbHandle,
    generationId: string,
    ownerUserId: string,
    afterSequence = 0,
  ): Promise<ChatGenerationEventRecord[]> {
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
      .executeTakeFirst();

    return row?.encryptedSnapshot ?? null;
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
