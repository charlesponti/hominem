import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { importJobRoutes } from './finance.import.jobs';

const mocks = vi.hoisted(() => ({
  getJobStatus: vi.fn(),
  getUserJobs: vi.fn(),
  requestImportCancellation: vi.fn(),
}));

vi.mock('@hominem/queues', () => ({
  getJobStatus: mocks.getJobStatus,
  getUserJobs: mocks.getUserJobs,
  importTransactionsQueue: {
    getJob: vi.fn().mockResolvedValue(null),
  },
  publishImportProgress: vi.fn(),
  requestImportCancellation: mocks.requestImportCancellation,
  updateImportJob: vi.fn(),
}));

vi.mock('@hominem/db', () => ({
  UnauthorizedError: class UnauthorizedError extends Error {},
  ValidationError: class ValidationError extends Error {},
}));

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'import@example.com',
  name: 'Import Test User',
  emailVerified: true,
  image: null,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const job = {
  jobId: 'job-123',
  userId: testUser.id,
  type: 'import-transactions' as const,
  fileName: 'transactions.csv',
  planId: 'plan-123',
  status: 'processing' as const,
  stats: {},
  startTime: new Date('2026-01-01T00:00:00.000Z').getTime(),
};

function createApp() {
  const app = new Hono<AppContext>();
  app.use('*', async (c, next) => {
    c.set('auth', {
      user: testUser,
      userId: testUser.id,
      credential: 'session',
      scopes: [],
    });
    await next();
  });
  return app.route('/api/finance/import/jobs', importJobRoutes);
}

describe('finance import job routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getJobStatus.mockResolvedValue(job);
    mocks.requestImportCancellation.mockResolvedValue(true);
  });

  it('cancels a job through the jobs route', async () => {
    const response = await createApp().request('/api/finance/import/jobs/job-123/cancel', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      jobId: 'job-123',
      status: 'processing',
    });
    expect(mocks.requestImportCancellation).toHaveBeenCalledWith('job-123', testUser.id);
  });

  it('does not expose the legacy unscoped cancellation route', async () => {
    const response = await createApp().request('/api/finance/import/job-123/cancel', {
      method: 'POST',
    });

    expect(response.status).toBe(404);
  });
});
