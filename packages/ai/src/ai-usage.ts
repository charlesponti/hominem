import {
  AIUsageEventRepository,
  db,
  ForbiddenError,
  type AIUsageFeature,
  type AIUsageEventStatus,
  type AIUsageFeatureBreakdownRecord,
  type AIUsageModelBreakdownRecord,
  type AIUsageSummaryRecord,
  type AIUsageOperation,
  type AIUsageTimeseriesGranularity,
  type AIUsageTimeseriesRecord,
  type JsonObject,
} from '@hominem/db';
import { logger } from '@hominem/telemetry';

import type { AIUsageMetrics } from './shared';

// Free-tier monthly cap on AI usage cost. Once a user's `cost_usd` sum for
// the current calendar month reaches this, AI-cost-incurring routes refuse
// new requests until the next month (see assertUnderMonthlyUsageLimit).
const MONTHLY_AI_USAGE_LIMIT_USD = 10;

type RecordAIUsageEventInput = {
  eventId: string;
  userId: string;
  feature: AIUsageFeature;
  operation: AIUsageOperation;
  usage?: AIUsageMetrics | null;
  metadata?: JsonObject;
  model?: string | null;
  durationMs: number;
  status?: AIUsageEventStatus;
  error?: unknown;
  errorCode?: string | null;
  errorStatus?: number | null;
};

type AIUsageFailureDetails = {
  errorCode: string | null;
  errorStatus: number | null;
};

export function startAIUsageTimer() {
  const startedAt = performance.now();
  return () => Math.max(0, Math.round(performance.now() - startedAt));
}

function sanitizeErrorCode(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const sanitized = value.replace(/[^a-zA-Z0-9._:-]/g, '_').slice(0, 64);
  return sanitized || null;
}

export function getAIUsageFailureDetails(error: unknown): AIUsageFailureDetails {
  if (!error || typeof error !== 'object') {
    return { errorCode: null, errorStatus: null };
  }

  const code = Reflect.get(error, 'code');
  const statusValue = Reflect.get(error, 'status');
  const statusCodeValue = Reflect.get(error, 'statusCode');
  const status =
    typeof statusValue === 'number'
      ? statusValue
      : typeof statusCodeValue === 'number'
        ? statusCodeValue
        : null;

  return {
    errorCode: sanitizeErrorCode(code),
    errorStatus:
      status !== null && Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
  };
}

function buildMetadata(
  metadata: JsonObject | undefined,
  usage: AIUsageMetrics,
): JsonObject | undefined {
  if (usage.reportedTotalTokens === null) {
    return metadata;
  }

  return {
    ...metadata,
    reportedTotalTokens: usage.reportedTotalTokens,
  };
}

export async function recordAIUsageEvent(input: RecordAIUsageEventInput) {
  const usage = input.usage ?? null;
  const failure = input.error ? getAIUsageFailureDetails(input.error) : null;

  if (!usage) {
    logger.warn('[ai-usage] provider response missing usage', {
      eventId: input.eventId,
      userId: input.userId,
      feature: input.feature,
      operation: input.operation,
      model: input.model ?? null,
      status: input.status ?? 'succeeded',
      error: input.error instanceof Error ? input.error.message : (input.error ?? null),
      errorCode: failure?.errorCode,
      errorStatus: failure?.errorStatus,
    });
  }

  try {
    await AIUsageEventRepository.createIfAbsent(db, {
      id: input.eventId,
      userId: input.userId,
      provider: usage?.provider ?? 'openrouter',
      feature: input.feature,
      operation: input.operation,
      model: usage?.model ?? input.model ?? null,
      inputTokens: usage?.promptTokens ?? 0,
      outputTokens: usage?.completionTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
      costUsd: usage?.costUsd ?? null,
      cachedInputTokens: usage?.cachedPromptTokens ?? null,
      reasoningTokens: usage?.reasoningTokens ?? null,
      durationMs: input.durationMs,
      status: input.status ?? 'succeeded',
      usageAvailable: usage !== null,
      errorCode: input.errorCode ?? failure?.errorCode ?? null,
      errorStatus: input.errorStatus ?? failure?.errorStatus ?? null,
      metadata: usage ? buildMetadata(input.metadata, usage) : input.metadata,
    });
  } catch (error) {
    logger.error('[ai-usage] failed to record usage event', {
      eventId: input.eventId,
      userId: input.userId,
      feature: input.feature,
      operation: input.operation,
      model: usage?.model ?? input.model ?? null,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export interface MonthlyUsageStatus {
  totalCostUsd: number;
  limitUsd: number;
  remainingUsd: number;
  isOverLimit: boolean;
  periodStart: string;
  periodEnd: string;
}

export interface MonthlyAIUsageReport {
  range: { from: string; to: string };
  monthly: MonthlyUsageStatus;
  summary: AIUsageSummaryRecord;
  byFeature: AIUsageFeatureBreakdownRecord[];
  byModel: AIUsageModelBreakdownRecord[];
}

export interface AIUsageTimeseriesReport {
  range: { from: string; to: string };
  granularity: AIUsageTimeseriesGranularity;
  points: AIUsageTimeseriesRecord[];
}

function currentMonthRange(now = new Date()): { from: string; to: string } {
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { from: periodStart.toISOString(), to: now.toISOString() };
}

export async function getMonthlyUsageStatus(userId: string): Promise<MonthlyUsageStatus> {
  const { from, to } = currentMonthRange();
  const summary = await AIUsageEventRepository.getSummary(db, { userId, from, to });

  return buildMonthlyUsageStatus(summary, from, to);
}

function buildMonthlyUsageStatus(
  summary: AIUsageSummaryRecord,
  from: string,
  to: string,
): MonthlyUsageStatus {
  return {
    totalCostUsd: summary.totalCostUsd,
    limitUsd: MONTHLY_AI_USAGE_LIMIT_USD,
    remainingUsd: Math.max(0, MONTHLY_AI_USAGE_LIMIT_USD - summary.totalCostUsd),
    isOverLimit: summary.totalCostUsd >= MONTHLY_AI_USAGE_LIMIT_USD,
    periodStart: from,
    periodEnd: to,
  };
}

export async function getMonthlyAIUsageReport(userId: string): Promise<MonthlyAIUsageReport> {
  const range = currentMonthRange();
  const query = { userId, from: range.from, to: range.to };
  const [summary, byFeature, byModel] = await Promise.all([
    AIUsageEventRepository.getSummary(db, query),
    AIUsageEventRepository.getFeatureBreakdown(db, query),
    AIUsageEventRepository.getModelBreakdown(db, query),
  ]);

  return {
    range,
    monthly: buildMonthlyUsageStatus(summary, range.from, range.to),
    summary,
    byFeature,
    byModel,
  };
}

export async function getAIUsageTimeseries(input: {
  userId: string;
  from: string;
  to: string;
  granularity: AIUsageTimeseriesGranularity;
}): Promise<AIUsageTimeseriesReport> {
  const points = await AIUsageEventRepository.getTimeseries(db, input);
  return {
    range: { from: input.from, to: input.to },
    granularity: input.granularity,
    points,
  };
}

// Called at the top of AI-cost-incurring routes (chat send, voice task
// extraction, voice cleanup) before any provider call is made.
export async function assertUnderMonthlyUsageLimit(userId: string): Promise<void> {
  const status = await getMonthlyUsageStatus(userId);
  if (status.isOverLimit) {
    throw new ForbiddenError('Monthly AI usage limit reached', {
      reason: 'usage_limit_exceeded',
      limitUsd: status.limitUsd,
      totalCostUsd: status.totalCostUsd,
    });
  }
}
