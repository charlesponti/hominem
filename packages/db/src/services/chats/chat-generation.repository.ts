import {
  rebuildGenerationProjection,
  reduceGenerationProjection,
  type GenerationHistoryEventPayload,
  type GenerationRunIdentity,
  type GenerationRunProjection,
  type ToolResult,
} from '@hominem/chat';
import { GenerationHistoryEventPayloadSchema } from '@hominem/chat/schemas';
import type { Selectable } from 'kysely';

import { ValidationError } from '../../errors';
import type { DbHandle } from '../../transaction';
import type {
  AppChatGenerationEvents,
  AppChatGenerationToolEffects,
  Json,
} from '../../types/database';
type GenerationEventRow = Selectable<AppChatGenerationEvents>;
type ToolEffectRow = Selectable<AppChatGenerationToolEffects>;
type GenerationRunRow = {
  id: string;
  chatId: string;
  ownerUserId: string;
  kind: string;
  userMessageId: string | null;
  targetAssistantMessageId: string | null;
};

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isToolResult(value: unknown): value is ToolResult {
  if (!value || !isJsonObject(value)) return false;
  return (
    isString(value.callId) &&
    isString(value.toolName) &&
    isString(value.content) &&
    typeof value.error === 'boolean'
  );
}

function invalidGenerationData(field: string, details?: Record<string, unknown>): ValidationError {
  return new ValidationError(`Invalid chat generation ${field}`, details);
}

export function parseGenerationEventPayload(value: unknown): GenerationHistoryEventPayload {
  const result = GenerationHistoryEventPayloadSchema.safeParse(value);
  if (!result.success) {
    throw invalidGenerationData('event payload');
  }
  return result.data;
}

export function parseToolResult(value: unknown): ToolResult {
  if (!isToolResult(value)) throw invalidGenerationData('tool result');
  return value;
}

export function parseGenerationKind(value: string): GenerationRunIdentity['kind'] {
  if (value === 'send' || value === 'start' || value === 'regenerate') return value;
  throw invalidGenerationData('kind');
}

export function toJsonValue(value: unknown): Json {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, toJsonValue(entry)]),
    );
  }
  throw new Error('Value is not JSON serializable');
}

export interface ChatGenerationEventRecord {
  id: string;
  generationId: string;
  sequence: number;
  type: GenerationHistoryEventPayload['type'];
  payload: GenerationHistoryEventPayload;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface AppendChatGenerationEventInput {
  generationId: string;
  ownerUserId: string;
  event: GenerationHistoryEventPayload;
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
    throw new ValidationError('Chat generation event sequence is outside the safe integer range', {
      generationId: row.generationId,
      field: 'sequence',
    });
  }
  const payload = parseGenerationEventPayload(row.payload);
  return {
    id: row.id,
    generationId: row.generationId,
    sequence,
    type: payload.type,
    payload,
    idempotencyKey: row.idempotencyKey,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

function toGenerationIdentity(row: GenerationRunRow): GenerationRunIdentity {
  return {
    generationId: row.id,
    chatId: row.chatId,
    ownerUserId: row.ownerUserId,
    kind: parseGenerationKind(row.kind),
    userMessageId: row.userMessageId,
    targetAssistantMessageId: row.targetAssistantMessageId,
  };
}

function projectionUpdate(projection: GenerationRunProjection) {
  return {
    status: projection.status,
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
    result: parseToolResult(row.result),
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

namespace ChatGenerationEvents {
  export function getByIdempotencyKey(
    handle: DbHandle,
    generationId: string,
    idempotencyKey: string,
  ): Promise<GenerationEventRow | undefined> {
    return handle
      .selectFrom('app.chatGenerationEvents')
      .selectAll()
      .where('generationId', '=', generationId)
      .where('idempotencyKey', '=', idempotencyKey)
      .executeTakeFirst();
  }
}

export const ChatGenerationRepository = {
  async appendEvent(
    handle: DbHandle,
    input: AppendChatGenerationEventInput,
  ): Promise<ChatGenerationEventRecord> {
    const run = await handle
      .selectFrom('app.chatGenerationRuns')
      .select(['id', 'chatId', 'ownerUserId', 'kind', 'userMessageId', 'targetAssistantMessageId'])
      .where('id', '=', input.generationId)
      .where('ownerUserId', '=', input.ownerUserId)
      .forUpdate()
      .executeTakeFirstOrThrow();

    const existing = input.idempotencyKey
      ? await ChatGenerationEvents.getByIdempotencyKey(
          handle,
          input.generationId,
          input.idempotencyKey,
        )
      : undefined;

    if (existing) return toEventRecord(existing);

    const priorRows = await handle
      .selectFrom('app.chatGenerationEvents')
      .selectAll()
      .where('generationId', '=', input.generationId)
      .orderBy('sequence', 'asc')
      .execute();
    const events = priorRows.map(toEventRecord);
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
        payload: toJsonValue(input.event),
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

    return toEventRecord(inserted);
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

    return rows.map(toEventRecord);
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
      .returning('id')
      .executeTakeFirstOrThrow();
  },

  // Last-resort direct status write, bypassing the event-append/projection
  // path entirely. Used only when appending a `generation.failed` event
  // itself throws (e.g. DB hiccup) — without this, that run's status row is
  // left non-terminal forever, since status otherwise only ever changes as a
  // side effect of a successful appendEvent. The `status not in (...)` guard
  // makes this safe against racing a concurrent successful completion: it
  // only ever moves a still-in-flight row to `failed`, never clobbers an
  // already-terminal one.
  async forceFail(
    handle: DbHandle,
    input: { generationId: string; ownerUserId: string; errorMessage: string },
  ): Promise<void> {
    await handle
      .updateTable('app.chatGenerationRuns')
      .set({ status: 'failed', errorMessage: input.errorMessage })
      .where('id', '=', input.generationId)
      .where('ownerUserId', '=', input.ownerUserId)
      .where('status', 'not in', ['committed', 'cancelled', 'failed'])
      .executeTakeFirst();
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
    const run = await handle
      .selectFrom('app.chatGenerationRuns')
      .select(['id', 'chatId', 'ownerUserId', 'kind', 'userMessageId', 'targetAssistantMessageId'])
      .where('id', '=', generationId)
      .where('ownerUserId', '=', ownerUserId)
      .forUpdate()
      .executeTakeFirstOrThrow();
    const rows = await handle
      .selectFrom('app.chatGenerationEvents')
      .selectAll()
      .where('generationId', '=', generationId)
      .orderBy('sequence', 'asc')
      .execute();
    const identity = toGenerationIdentity(run);
    const projection = rebuildGenerationProjection(
      identity,
      rows.map((row) => parseGenerationEventPayload(row.payload)),
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

    return row ? toToolEffectRecord(row) : null;
  },

  async listToolEffects(
    handle: DbHandle,
    input: { generationId: string; ownerUserId: string },
  ): Promise<ChatGenerationToolEffectRecord[]> {
    const rows = await handle
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
      .orderBy('effect.createdAt', 'asc')
      .orderBy('effect.id', 'asc')
      .execute();

    return rows.map(toToolEffectRecord);
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
        result: toJsonValue(input.result),
      })
      .onConflict((conflict) => conflict.columns(['generationId', 'idempotencyKey']).doNothing())
      .execute();

    const saved = await ChatGenerationRepository.getToolEffect(handle, input);
    if (!saved) throw new Error('Unable to persist chat generation tool effect');
    return saved;
  },
};
