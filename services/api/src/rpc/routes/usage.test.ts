import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';

const mocks = vi.hoisted(() => ({
  getMonthlyAIUsageReport: vi.fn(),
  getMonthlyUsageStatus: vi.fn(),
}));

vi.mock('../../application/ai-usage.service', () => mocks);

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

describe('usage routes', () => {
  beforeEach(() => {
    mocks.getMonthlyAIUsageReport.mockReset();
    mocks.getMonthlyUsageStatus.mockReset();
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
        completionTokens: 5,
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
});
