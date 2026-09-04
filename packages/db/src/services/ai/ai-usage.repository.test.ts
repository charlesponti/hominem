import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { authDb, db, sql } from '../../db';
import { AIUsageEventRepository } from './ai-usage.repository';

describe('AIUsageEventRepository', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) {
      await authDb.deleteFrom('user').where('id', '=', userId).execute();
    }
  });

  async function createUser() {
    const userId = randomUUID();
    userIds.push(userId);
    await authDb
      .insertInto('user')
      .values({
        id: userId,
        name: 'AI Usage Test User',
        email: `${userId}@example.com`,
      })
      .execute();
    return userId;
  }

  it('writes a given event id only once', async () => {
    const userId = await createUser();
    const eventId = randomUUID();

    expect(
      await AIUsageEventRepository.createIfAbsent(db, {
        id: eventId,
        userId,
        provider: 'openrouter',
        feature: 'career_resume_convert',
        operation: 'structured_output',
        model: 'model',
        promptTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        costUsd: 0.15,
        durationMs: 1234,
      }),
    ).toBe(true);

    expect(
      await AIUsageEventRepository.createIfAbsent(db, {
        id: eventId,
        userId,
        provider: 'openrouter',
        feature: 'career_resume_convert',
        operation: 'structured_output',
        model: 'model',
        promptTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        costUsd: 0.15,
      }),
    ).toBe(false);

    const row = await db
      .selectFrom('app.aiUsageEvents')
      .select((eb) => eb.fn.countAll<number>().as('count'))
      .where('id', '=', eventId)
      .executeTakeFirstOrThrow();

    expect(Number(row.count)).toBe(1);

    const usageEvent = await db
      .selectFrom('app.aiUsageEvents')
      .select('durationMs')
      .where('id', '=', eventId)
      .executeTakeFirstOrThrow();

    expect(usageEvent.durationMs).toBe(1234);
  });

  it('stores distinct provider invocations separately and supports new feature values', async () => {
    const userId = await createUser();

    await AIUsageEventRepository.createIfAbsent(db, {
      id: randomUUID(),
      userId,
      provider: 'openrouter',
      feature: 'career_job_scrape',
      operation: 'structured_output',
      model: 'model-a',
      promptTokens: 2,
      outputTokens: 1,
      totalTokens: 3,
      costUsd: 0.02,
    });
    await AIUsageEventRepository.createIfAbsent(db, {
      id: randomUUID(),
      userId,
      provider: 'openrouter',
      feature: 'mcp_tool_call',
      operation: 'chat_completion',
      model: 'model-b',
      promptTokens: 4,
      outputTokens: 2,
      totalTokens: 6,
      costUsd: 0.03,
    });

    const featureBreakdown = await AIUsageEventRepository.getFeatureBreakdown(db, { userId });
    expect(featureBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ feature: 'career_job_scrape', requestCount: 1 }),
        expect.objectContaining({ feature: 'mcp_tool_call', requestCount: 1 }),
      ]),
    );

    const mcpToday = await db
      .selectFrom('app.aiUsageEvents')
      .select(sql<number>`count(*)`.as('count'))
      .where('ownerUserid', '=', userId)
      .where('feature', '=', 'mcp_tool_call')
      .where(sql<boolean>`createdat::date = current_date`)
      .executeTakeFirstOrThrow();

    expect(Number(mcpToday.count)).toBe(1);
  });

  it('stores failed attempts without usage and exposes status counts', async () => {
    const userId = await createUser();

    await AIUsageEventRepository.createIfAbsent(db, {
      id: randomUUID(),
      userId,
      provider: 'openrouter',
      feature: 'text_enhance',
      operation: 'chat_completion',
      model: null,
      promptTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      status: 'failed',
      usageAvailable: false,
      errorCode: 'quota_exceeded',
      errorStatus: 429,
    });

    const summary = await AIUsageEventRepository.getSummary(db, { userId });
    expect(summary).toMatchObject({
      requestCount: 1,
      succeededCount: 0,
      failedCount: 1,
      usageAvailableCount: 0,
      totalTokens: 0,
      totalCostUsd: 0,
    });

    const row = await db
      .selectFrom('app.aiUsageEvents')
      .select(['status', 'usageAvailable', 'errorCode', 'errorStatus', 'model'])
      .where('ownerUserid', '=', userId)
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      status: 'failed',
      usageAvailable: false,
      errorCode: 'quota_exceeded',
      errorStatus: 429,
      model: null,
    });
  });

  it('aggregates usage by UTC day and month without crossing user or range boundaries', async () => {
    const userId = await createUser();
    const otherUserId = await createUser();
    const events = [
      { userId, model: 'model-a', costUsd: 0.2, date: '2026-08-01T01:00:00.000Z' },
      { userId, model: 'model-a', costUsd: 0.3, date: '2026-08-01T23:00:00.000Z' },
      { userId, model: null, costUsd: null, date: '2026-08-02T01:00:00.000Z' },
      { userId, model: 'model-a', costUsd: 0.4, date: '2026-09-01T00:00:00.000Z' },
      { userId: otherUserId, model: 'model-a', costUsd: 10, date: '2026-08-01T01:00:00.000Z' },
    ];

    for (const event of events) {
      const eventId = randomUUID();
      await AIUsageEventRepository.createIfAbsent(db, {
        id: eventId,
        userId: event.userId,
        provider: 'openrouter',
        feature: 'text_enhance',
        operation: 'chat_completion',
        model: event.model,
        promptTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: event.costUsd,
        usageAvailable: event.costUsd !== null,
      });
      await db
        .updateTable('app.aiUsageEvents')
        .set({ createdat: event.date })
        .where('id', '=', eventId)
        .execute();
    }

    await expect(
      AIUsageEventRepository.getTimeseries(db, {
        userId,
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
        granularity: 'day',
      }),
    ).resolves.toEqual([
      {
        bucketStart: '2026-08-01T00:00:00.000Z',
        model: 'model-a',
        requestCount: 2,
        usageAvailableCount: 2,
        totalCostUsd: 0.5,
      },
      {
        bucketStart: '2026-08-02T00:00:00.000Z',
        model: null,
        requestCount: 1,
        usageAvailableCount: 0,
        totalCostUsd: 0,
      },
    ]);

    await expect(
      AIUsageEventRepository.getTimeseries(db, {
        userId,
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-10-01T00:00:00.000Z',
        granularity: 'month',
      }),
    ).resolves.toEqual([
      {
        bucketStart: '2026-08-01T00:00:00.000Z',
        model: 'model-a',
        requestCount: 2,
        usageAvailableCount: 2,
        totalCostUsd: 0.5,
      },
      {
        bucketStart: '2026-08-01T00:00:00.000Z',
        model: null,
        requestCount: 1,
        usageAvailableCount: 0,
        totalCostUsd: 0,
      },
      {
        bucketStart: '2026-09-01T00:00:00.000Z',
        model: 'model-a',
        requestCount: 1,
        usageAvailableCount: 1,
        totalCostUsd: 0.4,
      },
    ]);
  });
});
