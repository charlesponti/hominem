import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSession, mocks } = vi.hoisted(() => ({
  mockSession: { getServerSession: vi.fn() },
  mocks: {
    countOwnedAccounts: vi.fn(),
    listImportAccountSnapshots: vi.fn(),
    parseCopilotCsv: vi.fn(),
    createCopilotImportPlan: vi.fn(),
    resolveCopilotAccounts: vi.fn(),
    applyAccountMappingsToPlan: vi.fn(),
    updatePlanSelection: vi.fn(),
    listCopilotExternalIds: vi.fn(),
    listTransactionCompositeKeys: vi.fn(),
    getJobStatus: vi.fn(),
    getUserJobs: vi.fn(),
    requestImportCancellation: vi.fn(),
    importTransactionsQueue: { getJob: vi.fn() },
    getPreflight: vi.fn(),
    getPreflightPlanContent: vi.fn(),
  },
}));

vi.mock('../lib/auth.server', () => mockSession);

vi.mock('@hominem/finance-services', () => ({
  countOwnedAccounts: mocks.countOwnedAccounts,
  listImportAccountSnapshots: mocks.listImportAccountSnapshots,
}));

vi.mock('@hominem/finance-services/import', () => ({
  applyAccountMappingsToPlan: mocks.applyAccountMappingsToPlan,
  createCopilotImportPlan: mocks.createCopilotImportPlan,
  parseCopilotCsv: mocks.parseCopilotCsv,
  resolveCopilotAccounts: mocks.resolveCopilotAccounts,
  updatePlanSelection: mocks.updatePlanSelection,
}));

vi.mock('@hominem/finance-services/transactions', () => ({
  listCopilotExternalIds: mocks.listCopilotExternalIds,
  listTransactionCompositeKeys: mocks.listTransactionCompositeKeys,
}));

vi.mock('@hominem/queues', () => ({
  claimPreflight: vi.fn(),
  createImportJob: vi.fn(),
  createPreflight: vi.fn(),
  deletePreflight: vi.fn(),
  getJobStatus: mocks.getJobStatus,
  getPreflight: mocks.getPreflight,
  getPreflightPlanContent: mocks.getPreflightPlanContent,
  getUserJobs: mocks.getUserJobs,
  importTransactionsQueue: {
    ...mocks.importTransactionsQueue,
    add: vi.fn(),
  },
  publishImportProgress: vi.fn(),
  requestImportCancellation: mocks.requestImportCancellation,
  setImportPlanContent: vi.fn(),
  updateImportJob: vi.fn(),
  updatePreflightStatus: vi.fn(),
}));

import { loader as jobsLoader } from './api.finance.import.jobs';
import { action as cancelAction } from './api.finance.import.jobs.$jobId.cancel';
import { action as preflightAction } from './api.finance.import.preflight';
import { loader as preflightLoader } from './api.finance.import.preflight.$preflightId';
import { action as confirmAction } from './api.finance.import.preflight.$preflightId.confirm';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'u@example.com', name: 'U' };

function signedIn() {
  mockSession.getServerSession.mockResolvedValue({ user: USER, headers: new Headers() });
}

function signedOut() {
  mockSession.getServerSession.mockResolvedValue({ user: null, headers: new Headers() });
}

function loaderArgs(url: string, params: Record<string, string> = {}): LoaderFunctionArgs {
  return { request: new Request(url), params, context: {} };
}

function actionArgs(
  url: string,
  init: { method?: string; body?: BodyInit; headers?: HeadersInit } = {},
  params: Record<string, string> = {},
): ActionFunctionArgs {
  return { request: new Request(url, init), params, context: {} };
}

describe('finance import API (served by the finance app)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedOut();
    mocks.listCopilotExternalIds.mockResolvedValue(new Set());
    mocks.listTransactionCompositeKeys.mockResolvedValue(new Set());
  });

  it('rejects every route without a session (401 JSON, not a redirect)', async () => {
    const requests = [
      preflightAction(
        actionArgs('http://localhost/api/finance/import/preflight', { method: 'POST' }),
      ),
      preflightLoader(
        loaderArgs('http://localhost/api/finance/import/preflight/abc', { preflightId: 'abc' }),
      ),
      confirmAction(
        actionArgs('http://localhost/api/finance/import/preflight/abc/confirm', { method: 'POST' }),
        { preflightId: 'abc' },
      ),
      jobsLoader(loaderArgs('http://localhost/api/finance/import/jobs')),
      cancelAction(
        actionArgs(
          'http://localhost/api/finance/import/jobs/job-1/cancel',
          { method: 'POST' },
          { jobId: 'job-1' },
        ),
      ),
    ];

    for (const response of await Promise.all(requests)) {
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: 'Authentication required' });
    }
  });

  it('rejects an upload without a file', async () => {
    signedIn();
    const response = await preflightAction(
      actionArgs('http://localhost/api/finance/import/preflight', {
        method: 'POST',
        body: new FormData(),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'A Copilot CSV file is required',
    });
    expect(mocks.createCopilotImportPlan).not.toHaveBeenCalled();
  });

  it('lists jobs for the session user', async () => {
    signedIn();
    const jobs = { jobs: [{ jobId: 'job-1', status: 'processing' }] };
    mocks.getUserJobs.mockResolvedValue(jobs);

    const response = await jobsLoader(loaderArgs('http://localhost/api/finance/import/jobs'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(jobs);
    expect(mocks.getUserJobs).toHaveBeenCalledWith(USER.id);
  });

  it('cancels a queued job through the queue, not the redis status alone', async () => {
    signedIn();
    mocks.requestImportCancellation.mockResolvedValue(true);
    const job = { jobId: 'job-1', userId: USER.id, status: 'processed' as const, stats: {} };
    mocks.getJobStatus.mockResolvedValue(job);

    const response = await cancelAction(
      actionArgs(
        'http://localhost/api/finance/import/jobs/job-1/cancel',
        { method: 'POST' },
        { jobId: 'job-1' },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ jobId: 'job-1', status: 'processing' });
    expect(mocks.requestImportCancellation).toHaveBeenCalledWith('job-1', USER.id);
  });

  it('404s on cancel for a job the user does not own', async () => {
    signedIn();
    mocks.getJobStatus.mockResolvedValue({
      jobId: 'job-1',
      userId: 'someone-else',
      status: 'processing',
    });

    const response = await cancelAction(
      actionArgs(
        'http://localhost/api/finance/import/jobs/job-1/cancel',
        { method: 'POST' },
        { jobId: 'job-1' },
      ),
    );

    expect(response.status).toBe(404);
    expect(mocks.requestImportCancellation).not.toHaveBeenCalled();
  });

  it('returns 404 for an expired preflight detail', async () => {
    signedIn();
    mocks.getPreflight.mockResolvedValue(null);

    const response = await preflightLoader(
      loaderArgs('http://localhost/api/finance/import/preflight/abc', { preflightId: 'abc' }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Preflight was not found or expired',
    });
  });
});
