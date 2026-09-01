import type { Selectable } from 'kysely';
import { sql } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppChatSpeechRuns } from '../../types/database';

type ChatSpeechRunRow = Selectable<AppChatSpeechRuns>;

export type ChatSpeechRunStatus = 'pending' | 'succeeded' | 'failed';
export type ChatSpeechReconciliationStatus = 'pending' | 'succeeded' | 'failed';

export interface ChatSpeechRunRecord {
  id: string;
  messageId: string;
  ownerUserId: string;
  usageEventId: string;
  provider: string;
  providerGenerationId: string | null;
  characterCount: number;
  status: ChatSpeechRunStatus;
  reconciliationStatus: ChatSpeechReconciliationStatus;
  reconciliationAttempts: number;
  lastReconciliationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatSpeechRunInput {
  id: string;
  messageId: string;
  ownerUserId: string;
  usageEventId: string;
  provider: string;
  characterCount: number;
}

export interface ChatSpeechUsageHealthRecord {
  pendingCount: number;
  failedCount: number;
  succeededCount: number;
  missingUsageEventCount: number;
  oldestPendingAt: string | null;
}

function toRecord(row: ChatSpeechRunRow): ChatSpeechRunRecord {
  return {
    id: row.id,
    messageId: row.messageId,
    ownerUserId: row.ownerUserId,
    usageEventId: row.usageEventId,
    provider: row.provider,
    providerGenerationId: row.providerGenerationId,
    characterCount: row.characterCount,
    status: row.status as ChatSpeechRunStatus,
    reconciliationStatus: row.reconciliationStatus as ChatSpeechReconciliationStatus,
    reconciliationAttempts: row.reconciliationAttempts,
    lastReconciliationError: row.lastReconciliationError,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export const ChatSpeechRunRepository = {
  async create(handle: DbHandle, input: CreateChatSpeechRunInput): Promise<ChatSpeechRunRecord> {
    const row = await handle
      .insertInto('app.chatSpeechRuns')
      .values({
        id: input.id,
        messageId: input.messageId,
        ownerUserId: input.ownerUserId,
        usageEventId: input.usageEventId,
        provider: input.provider,
        characterCount: input.characterCount,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return toRecord(row);
  },

  async getById(
    handle: DbHandle,
    id: string,
    ownerUserId?: string,
  ): Promise<ChatSpeechRunRecord | null> {
    let query = handle.selectFrom('app.chatSpeechRuns').selectAll().where('id', '=', id);
    if (ownerUserId) {
      query = query.where('ownerUserId', '=', ownerUserId);
    }
    const row = await query.executeTakeFirst();
    return row ? toRecord(row) : null;
  },

  async setProviderGenerationId(
    handle: DbHandle,
    input: { id: string; providerGenerationId: string },
  ): Promise<ChatSpeechRunRecord | null> {
    const row = await handle
      .updateTable('app.chatSpeechRuns')
      .set({ providerGenerationId: input.providerGenerationId })
      .where('id', '=', input.id)
      .returningAll()
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  },

  async markComplete(
    handle: DbHandle,
    input: { id: string; status: Exclude<ChatSpeechRunStatus, 'pending'> },
  ): Promise<ChatSpeechRunRecord | null> {
    const row = await handle
      .updateTable('app.chatSpeechRuns')
      .set({ status: input.status })
      .where('id', '=', input.id)
      .returningAll()
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  },

  async markReconciliation(
    handle: DbHandle,
    input: {
      id: string;
      status: ChatSpeechReconciliationStatus;
      error?: string | null;
    },
  ): Promise<ChatSpeechRunRecord | null> {
    const row = await handle
      .updateTable('app.chatSpeechRuns')
      .set((eb) => ({
        reconciliationStatus: input.status,
        reconciliationAttempts: eb('reconciliationAttempts', '+', 1),
        lastReconciliationError: input.error ?? null,
      }))
      .where('id', '=', input.id)
      .returningAll()
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  },

  async listPending(handle: DbHandle, limit = 100): Promise<ChatSpeechRunRecord[]> {
    const rows = await handle
      .selectFrom('app.chatSpeechRuns')
      .selectAll()
      .where('reconciliationStatus', '=', 'pending')
      .where('providerGenerationId', 'is not', null)
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .execute();
    return rows.map((row) => toRecord(row));
  },

  async getUsageHealth(handle: DbHandle): Promise<ChatSpeechUsageHealthRecord> {
    const row = await handle
      .selectFrom('app.chatSpeechRuns as runs')
      .select([
        sql<number>`count(*) FILTER (WHERE runs.reconciliation_status = 'pending')`.as(
          'pendingCount',
        ),
        sql<number>`count(*) FILTER (WHERE runs.reconciliation_status = 'failed')`.as(
          'failedCount',
        ),
        sql<number>`count(*) FILTER (WHERE runs.reconciliation_status = 'succeeded')`.as(
          'succeededCount',
        ),
        sql<number>`count(*) FILTER (
          WHERE runs.provider_generation_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM app.ai_usage_events AS events
            WHERE events.id = runs.usage_event_id
          )
        )`.as('missingUsageEventCount'),
        sql<Date | string | null>`min(runs.created_at) FILTER (
          WHERE runs.reconciliation_status = 'pending'
        )`.as('oldestPendingAt'),
      ])
      .executeTakeFirstOrThrow();

    return {
      pendingCount: Number(row.pendingCount ?? 0),
      failedCount: Number(row.failedCount ?? 0),
      succeededCount: Number(row.succeededCount ?? 0),
      missingUsageEventCount: Number(row.missingUsageEventCount ?? 0),
      oldestPendingAt:
        row.oldestPendingAt == null ? null : new Date(row.oldestPendingAt).toISOString(),
    };
  },
};
