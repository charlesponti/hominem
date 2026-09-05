import { toNullableNumber, toRequiredNumber } from '@hominem/utils';
import { sql, type Insertable, type Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppAiUsageEvents, Json, Numeric } from '../../types/database';

type AIUsageEventRow = Selectable<AppAiUsageEvents>;

export type AIUsageFeature =
  | 'chat_stream'
  | 'text_enhance'
  | 'note_generate'
  | 'task_extract'
  | 'voice_task_extract'
  | 'time_block_extract'
  | 'voice_cleanup'
  | 'chat_speech'
  | 'embedding'
  | 'mcp_tool_call'
  | 'career_resume_convert'
  | 'career_resume_customize'
  | 'career_job_scrape'
  | 'career_skills_derive'
  | 'file_image_analyze'
  | 'file_document_summarize';

export type AIUsageOperation = 'chat_completion' | 'structured_output' | 'embedding' | 'speech';
export type AIUsageEventStatus = 'succeeded' | 'failed';

export interface AIUsageEventRecord {
  id: string;
  userId: string;
  provider: string;
  feature: AIUsageFeature;
  operation: AIUsageOperation;
  model: string | null;
  status: AIUsageEventStatus;
  usageAvailable: boolean;
  errorCode: string | null;
  errorStatus: number | null;
  requestId: string | null;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number | null;
  reasoningTokens: number | null;
  costUsd: number | null;
  durationMs: number | null;
  metadata: Json | null;
  createdAt: string;
}

export interface CreateAIUsageEventInput {
  id?: string;
  userId: string;
  provider: string;
  feature: AIUsageFeature;
  operation: AIUsageOperation;
  model?: string | null;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestId?: string | null;
  cachedInputTokens?: number | null;
  reasoningTokens?: number | null;
  costUsd?: number | null;
  durationMs?: number | null;
  status?: AIUsageEventStatus;
  usageAvailable?: boolean;
  errorCode?: string | null;
  errorStatus?: number | null;
  metadata?: Json | null;
}

export interface AIUsageQueryRange {
  userId: string;
  from?: string | null;
  to?: string | null;
}

export type AIUsageTimeseriesGranularity = 'day' | 'month';

export interface AIUsageTimeseriesQuery {
  userId: string;
  from: string;
  to: string;
  granularity: AIUsageTimeseriesGranularity;
}

export interface AIUsageSummaryRecord {
  requestCount: number;
  succeededCount: number;
  failedCount: number;
  usageAvailableCount: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  lastRecordedAt: string | null;
}

export interface AIUsageFeatureBreakdownRecord {
  feature: AIUsageFeature;
  requestCount: number;
  succeededCount: number;
  failedCount: number;
  usageAvailableCount: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AIUsageModelBreakdownRecord {
  model: string | null;
  requestCount: number;
  succeededCount: number;
  failedCount: number;
  usageAvailableCount: number;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AIUsageTimeseriesRecord {
  bucketStart: string;
  model: string | null;
  requestCount: number;
  usageAvailableCount: number;
  totalCostUsd: number;
}

function toAIUsageEventRecord(row: AIUsageEventRow): AIUsageEventRecord {
  return {
    id: row.id,
    userId: row.ownerUserid,
    provider: row.provider,
    feature: row.feature as AIUsageFeature,
    operation: row.operation as AIUsageOperation,
    model: row.model ?? null,
    status: row.status as AIUsageEventStatus,
    usageAvailable: row.usageAvailable,
    errorCode: row.errorCode ?? null,
    errorStatus: row.errorStatus ?? null,
    requestId: row.requestId ?? null,
    promptTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    totalTokens: row.totalTokens,
    cachedInputTokens: row.cachedInputTokens,
    reasoningTokens: row.reasoningTokens,
    costUsd: toNullableNumber(row.costUsd),
    durationMs: row.durationMs,
    metadata: row.metadata,
    createdAt: new Date(row.createdat).toISOString(),
  };
}

function toAIUsageEventInsert(input: CreateAIUsageEventInput): Insertable<AppAiUsageEvents> {
  return {
    ...(input.id ? { id: input.id } : {}),
    ownerUserid: input.userId,
    provider: input.provider,
    feature: input.feature,
    operation: input.operation,
    model: input.model ?? null,
    status: input.status ?? 'succeeded',
    usageAvailable: input.usageAvailable ?? true,
    errorCode: input.errorCode ?? null,
    errorStatus: input.errorStatus ?? null,
    requestId: input.requestId ?? null,
    inputTokens: input.promptTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.totalTokens,
    cachedInputTokens: input.cachedInputTokens ?? null,
    reasoningTokens: input.reasoningTokens ?? null,
    costUsd: input.costUsd ?? null,
    durationMs: input.durationMs ?? null,
    metadata: input.metadata ?? null,
  };
}

export const AIUsageEventRepository = {
  async getById(handle: DbHandle, id: string): Promise<AIUsageEventRecord | null> {
    const row = await handle
      .selectFrom('app.aiUsageEvents')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return row ? toAIUsageEventRecord(row) : null;
  },

  async create(handle: DbHandle, input: CreateAIUsageEventInput): Promise<AIUsageEventRecord> {
    const row = await handle
      .insertInto('app.aiUsageEvents')
      .values(toAIUsageEventInsert(input))
      .returningAll()
      .executeTakeFirstOrThrow();

    return toAIUsageEventRecord(row);
  },

  async createIfAbsent(handle: DbHandle, input: CreateAIUsageEventInput): Promise<boolean> {
    const inserted = await handle
      .insertInto('app.aiUsageEvents')
      .values(toAIUsageEventInsert(input))
      .onConflict((conflict) => conflict.column('id').doNothing())
      .returning('id')
      .executeTakeFirst();

    return Boolean(inserted?.id);
  },

  async updateUsage(
    handle: DbHandle,
    input: {
      eventId: string;
      usage: {
        provider: string;
        model: string;
        promptTokens: number;
        outputTokens: number;
        totalTokens: number;
        costUsd: number | null;
        cachedPromptTokens: number | null;
        reasoningTokens: number | null;
      };
      status?: AIUsageEventStatus;
    },
  ): Promise<boolean> {
    const updated = await handle
      .updateTable('app.aiUsageEvents')
      .set({
        provider: input.usage.provider,
        model: input.usage.model,
        inputTokens: input.usage.promptTokens,
        outputTokens: input.usage.outputTokens,
        totalTokens: input.usage.totalTokens,
        costUsd: input.usage.costUsd,
        cachedInputTokens: input.usage.cachedPromptTokens,
        reasoningTokens: input.usage.reasoningTokens,
        usageAvailable: true,
        ...(input.status ? { status: input.status } : {}),
      })
      .where('id', '=', input.eventId)
      .returning('id')
      .executeTakeFirst();

    return Boolean(updated?.id);
  },

  async getSummary(handle: DbHandle, input: AIUsageQueryRange): Promise<AIUsageSummaryRecord> {
    let query = handle.selectFrom('app.aiUsageEvents').where('ownerUserid', '=', input.userId);

    if (input.from) {
      query = query.where('createdat', '>=', new Date(input.from).toISOString());
    }

    if (input.to) {
      query = query.where('createdat', '<=', new Date(input.to).toISOString());
    }

    const row = await query
      .select([
        sql<number>`count(*)`.as('requestCount'),
        sql<number>`count(*) FILTER (WHERE status = 'succeeded')`.as('succeededCount'),
        sql<number>`count(*) FILTER (WHERE status = 'failed')`.as('failedCount'),
        sql<number>`count(*) FILTER (WHERE usage_available)`.as('usageAvailableCount'),
        sql<number>`coalesce(sum(input_tokens), 0)`.as('promptTokens'),
        sql<number>`coalesce(sum(output_tokens), 0)`.as('outputTokens'),
        sql<number>`coalesce(sum(total_tokens), 0)`.as('totalTokens'),
        sql<Numeric>`coalesce(sum(cost_usd), 0)`.as('totalCostUsd'),
        sql<Date | string | null>`max(createdat)`.as('lastRecordedAt'),
      ])
      .executeTakeFirstOrThrow();

    return {
      requestCount: Number(row.requestCount ?? 0),
      succeededCount: Number(row.succeededCount ?? 0),
      failedCount: Number(row.failedCount ?? 0),
      usageAvailableCount: Number(row.usageAvailableCount ?? 0),
      promptTokens: Number(row.promptTokens ?? 0),
      outputTokens: Number(row.outputTokens ?? 0),
      totalTokens: Number(row.totalTokens ?? 0),
      totalCostUsd: toRequiredNumber(row.totalCostUsd),
      lastRecordedAt:
        row.lastRecordedAt == null ? null : new Date(row.lastRecordedAt).toISOString(),
    };
  },

  async getFeatureBreakdown(
    handle: DbHandle,
    input: AIUsageQueryRange,
  ): Promise<AIUsageFeatureBreakdownRecord[]> {
    let query = handle.selectFrom('app.aiUsageEvents').where('ownerUserid', '=', input.userId);

    if (input.from) {
      query = query.where('createdat', '>=', new Date(input.from).toISOString());
    }

    if (input.to) {
      query = query.where('createdat', '<=', new Date(input.to).toISOString());
    }

    const rows = await query
      .select([
        'feature',
        sql<number>`count(*)`.as('requestCount'),
        sql<number>`count(*) FILTER (WHERE status = 'succeeded')`.as('succeededCount'),
        sql<number>`count(*) FILTER (WHERE status = 'failed')`.as('failedCount'),
        sql<number>`count(*) FILTER (WHERE usage_available)`.as('usageAvailableCount'),
        sql<number>`coalesce(sum(input_tokens), 0)`.as('promptTokens'),
        sql<number>`coalesce(sum(output_tokens), 0)`.as('outputTokens'),
        sql<number>`coalesce(sum(total_tokens), 0)`.as('totalTokens'),
        sql<Numeric>`coalesce(sum(cost_usd), 0)`.as('totalCostUsd'),
      ])
      .groupBy('feature')
      .orderBy(sql`coalesce(sum(cost_usd), 0)`, 'desc')
      .orderBy(sql`coalesce(sum(total_tokens), 0)`, 'desc')
      .execute();

    return rows.map(
      (row): AIUsageFeatureBreakdownRecord => ({
        feature: row.feature as AIUsageFeature,
        requestCount: Number(row.requestCount ?? 0),
        succeededCount: Number(row.succeededCount ?? 0),
        failedCount: Number(row.failedCount ?? 0),
        usageAvailableCount: Number(row.usageAvailableCount ?? 0),
        promptTokens: Number(row.promptTokens ?? 0),
        outputTokens: Number(row.outputTokens ?? 0),
        totalTokens: Number(row.totalTokens ?? 0),
        totalCostUsd: toRequiredNumber(row.totalCostUsd),
      }),
    );
  },

  async getModelBreakdown(
    handle: DbHandle,
    input: AIUsageQueryRange,
  ): Promise<AIUsageModelBreakdownRecord[]> {
    let query = handle.selectFrom('app.aiUsageEvents').where('ownerUserid', '=', input.userId);

    if (input.from) {
      query = query.where('createdat', '>=', new Date(input.from).toISOString());
    }

    if (input.to) {
      query = query.where('createdat', '<=', new Date(input.to).toISOString());
    }

    const rows = await query
      .select([
        'model',
        sql<number>`count(*)`.as('requestCount'),
        sql<number>`count(*) FILTER (WHERE status = 'succeeded')`.as('succeededCount'),
        sql<number>`count(*) FILTER (WHERE status = 'failed')`.as('failedCount'),
        sql<number>`count(*) FILTER (WHERE usage_available)`.as('usageAvailableCount'),
        sql<number>`coalesce(sum(input_tokens), 0)`.as('promptTokens'),
        sql<number>`coalesce(sum(output_tokens), 0)`.as('outputTokens'),
        sql<number>`coalesce(sum(total_tokens), 0)`.as('totalTokens'),
        sql<Numeric>`coalesce(sum(cost_usd), 0)`.as('totalCostUsd'),
      ])
      .groupBy('model')
      .orderBy(sql`coalesce(sum(cost_usd), 0)`, 'desc')
      .orderBy(sql`coalesce(sum(total_tokens), 0)`, 'desc')
      .execute();

    return rows.map(
      (row): AIUsageModelBreakdownRecord => ({
        model: row.model ?? null,
        requestCount: Number(row.requestCount ?? 0),
        succeededCount: Number(row.succeededCount ?? 0),
        failedCount: Number(row.failedCount ?? 0),
        usageAvailableCount: Number(row.usageAvailableCount ?? 0),
        promptTokens: Number(row.promptTokens ?? 0),
        outputTokens: Number(row.outputTokens ?? 0),
        totalTokens: Number(row.totalTokens ?? 0),
        totalCostUsd: toRequiredNumber(row.totalCostUsd),
      }),
    );
  },

  async getTimeseries(
    handle: DbHandle,
    input: AIUsageTimeseriesQuery,
  ): Promise<AIUsageTimeseriesRecord[]> {
    const bucket =
      input.granularity === 'day'
        ? sql<Date | string>`date_trunc('day', createdat AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`
        : sql<Date | string>`date_trunc('month', createdat AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`;

    const rows = await handle
      .selectFrom('app.aiUsageEvents')
      .select([
        bucket.as('bucketStart'),
        'model',
        sql<number>`count(*)`.as('requestCount'),
        sql<number>`count(*) FILTER (WHERE usage_available)`.as('usageAvailableCount'),
        sql<Numeric>`coalesce(sum(cost_usd), 0)`.as('totalCostUsd'),
      ])
      .where('ownerUserid', '=', input.userId)
      .where('createdat', '>=', new Date(input.from).toISOString())
      .where('createdat', '<', new Date(input.to).toISOString())
      .groupBy([bucket, 'model'])
      .orderBy(bucket, 'asc')
      .orderBy('model', 'asc')
      .execute();

    return rows.map((row) => ({
      bucketStart: new Date(row.bucketStart).toISOString(),
      model: row.model ?? null,
      requestCount: Number(row.requestCount ?? 0),
      usageAvailableCount: Number(row.usageAvailableCount ?? 0),
      totalCostUsd: toRequiredNumber(row.totalCostUsd),
    }));
  },
};
