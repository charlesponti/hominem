import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';

const mocks = vi.hoisted(() => ({
  getMonthlyAIUsageReport: vi.fn(),
  getMonthlyUsageStatus: vi.fn(),
  getAIUsageTimeseries: vi.fn(),
  getSpeechUsageHealth: vi.fn(),
}));

vi.mock('../../application/ai-usage.service', () => mocks);
vi.mock('../../application/speech-usage.service', () => ({
  getSpeechUsageHealth: mocks.getSpeechUsageHealth,
}));

import { usageRoutes } from './usage';

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'usage@example.com',
  name: 'Usage Test User',
  emailVerified: true,
  image: null,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createApp(authenticated = true) {
  const app = new Hono<AppContext>().onError(apiErrorHandler).use(requestIdMiddleware);

  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('auth', { user: testUser, userId: testUser.id, credential: 'session', scopes: [] });
      await next();
    });
  }

  return app.route('/api/usage', usageRoutes);
}

function createAdminApp() {
  const app = new Hono<AppContext>().onError(apiErrorHandler).use(requestIdMiddleware);
  app.use('*', async (c, next) => {
    c.set('auth', {
      user: { ...testUser, isAdmin: true },
      userId: testUser.id,
      credential: 'session',
      scopes: [],
    });
    await next();
  });
  return app.route('/api/usage', usageRoutes);
}

describe('usage routes', () => {
  beforeEach(() => {
    mocks.getMonthlyAIUsageReport.mockReset();
    mocks.getMonthlyUsageStatus.mockReset();
    mocks.getAIUsageTimeseries.mockReset();
    mocks.getSpeechUsageHealth.mockReset();
  });

  it('requires authentication', async () => {
    const response = await createApp(false).request('/api/usage');

    expect(response.status).toBe(401);
  });

  it('returns the current-month usage report for the authenticated user', async () => {
    const report = {
      range: { from: '2026-08-01T00:00:00.000Z', to: '2026-08-22T00:00:00.000Z' },
      monthly: {
        totalCostUsd: 1.25,
        limitUsd: 10,
        remainingUsd: 8.75,
        isOverLimit: false,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-08-22T00:00:00.000Z',
      },
      summary: {
        requestCount: 2,
        succeededCount: 2,
        failedCount: 0,
        usageAvailableCount: 2,
        promptTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        totalCostUsd: 1.25,
        lastRecordedAt: '2026-08-22T00:00:00.000Z',
      },
      byFeature: [],
      byModel: [],
    };
    mocks.getMonthlyAIUsageReport.mockResolvedValue(report);

    const response = await createApp().request('/api/usage');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(report);
    expect(mocks.getMonthlyAIUsageReport).toHaveBeenCalledWith(testUser.id);
  });

  it('preserves the monthly allowance endpoint', async () => {
    const status = {
      totalCostUsd: 1,
      limitUsd: 10,
      remainingUsd: 9,
      isOverLimit: false,
      periodStart: '2026-08-01T00:00:00.000Z',
      periodEnd: '2026-08-22T00:00:00.000Z',
    };
    mocks.getMonthlyUsageStatus.mockResolvedValue(status);

    const response = await createApp().request('/api/usage/monthly');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(status);
    expect(mocks.getMonthlyUsageStatus).toHaveBeenCalledWith(testUser.id);
  });

  it('returns time-series usage for the authenticated user', async () => {
    const report = {
      range: { from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
      granularity: 'day' as const,
      points: [
        {
          bucketStart: '2026-08-01T00:00:00.000Z',
          model: 'model-a',
          requestCount: 2,
          usageAvailableCount: 1,
          totalCostUsd: 0.25,
        },
      ],
    };
    mocks.getAIUsageTimeseries.mockResolvedValue(report);

    const response = await createApp().request(
      '/api/usage/timeseries?from=2026-08-01T00%3A00%3A00.000Z&to=2026-09-01T00%3A00%3A00.000Z&granularity=day',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(report);
    expect(mocks.getAIUsageTimeseries).toHaveBeenCalledWith({
      userId: testUser.id,
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-09-01T00:00:00.000Z',
      granularity: 'day',
    });
  });

  it('rejects invalid time-series ranges', async () => {
    const response = await createApp().request(
      '/api/usage/timeseries?from=2026-09-01T00%3A00%3A00.000Z&to=2026-08-01T00%3A00%3A00.000Z&granularity=day',
    );

    expect(response.status).toBe(400);
    expect(mocks.getAIUsageTimeseries).not.toHaveBeenCalled();
  });

  it('rejects health reports for non-admin users', async () => {
    const response = await createApp().request('/api/usage/health');

    expect(response.status).toBe(403);
  });

  it('returns aggregate speech health to admins', async () => {
    const health = {
      pendingCount: 1,
      failedCount: 0,
      succeededCount: 4,
      missingUsageEventCount: 0,
      oldestPendingAt: '2026-08-23T00:00:00.000Z',
    };
    mocks.getSpeechUsageHealth.mockResolvedValue(health);

    const response = await createAdminApp().request('/api/usage/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(health);
  });
});
