import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireAuth, mockLedger } = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockLedger: {
    getLedgerReconcileData: vi.fn(),
    getLedgerBreakdown: vi.fn(),
    postLedgerTrueUp: vi.fn(),
  },
}));

vi.mock('../lib/require-auth.server', () => ({ requireAuth: mockRequireAuth }));
vi.mock('../lib/finance/ledger.server', () => mockLedger);

import { action, loader } from './finance.reconcile';

function loaderArgs(url: string): LoaderFunctionArgs {
  return { request: new Request(url), params: {}, context: {} };
}

function actionArgs(entries: Record<string, string>): ActionFunctionArgs {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) form.set(key, value);
  return {
    request: new Request('http://localhost/finance/reconcile', { method: 'POST', body: form }),
    params: {},
    context: {},
  };
}

const staleness = [
  {
    accountId: 'acc-1',
    accountName: 'Checking',
    accountType: 'checking',
    lifecycleStatus: 'open',
    balance: -100,
    lastReconciled: null,
  },
];
const gates = {
  totalTransactions: 1,
  orphanTransactions: 0,
  accountsWithNoTransactions: [],
  duplicateGroups: [],
  duplicateGroupCount: 0,
  signViolations: [],
  signViolationCount: 0,
  uncategorizedTransactions: 0,
};

describe('finance reconcile route', () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockRequireAuth.mockResolvedValue({ user: { id: 'user-1' }, headers: new Headers() });
    mockLedger.getLedgerReconcileData.mockReset();
    mockLedger.getLedgerBreakdown.mockReset();
    mockLedger.postLedgerTrueUp.mockReset();
    mockLedger.getLedgerReconcileData.mockResolvedValue({ staleness, gates });
    mockLedger.getLedgerBreakdown.mockResolvedValue(null);
  });

  it('loads staleness and gates without a breakdown by default', async () => {
    const result = await loader(loaderArgs('http://localhost/finance/reconcile'));

    expect(mockLedger.getLedgerReconcileData).toHaveBeenCalledWith('user-1');
    expect(mockLedger.getLedgerBreakdown).not.toHaveBeenCalled();
    expect(result).toEqual({ staleness, gates, breakdown: null, accountId: null });
  });

  it('loads a breakdown when accountId is selected', async () => {
    const breakdown = { accountId: 'acc-1', accountName: 'Checking', balance: -100, rows: [] };
    mockLedger.getLedgerBreakdown.mockResolvedValue(breakdown);

    const result = await loader(loaderArgs('http://localhost/finance/reconcile?accountId=acc-1'));

    expect(mockLedger.getLedgerBreakdown).toHaveBeenCalledWith('user-1', 'acc-1');
    expect(result.breakdown).toEqual(breakdown);
    expect(result.accountId).toBe('acc-1');
  });

  it('rejects unauthenticated loaders', async () => {
    mockRequireAuth.mockRejectedValue(new Response(null, { status: 302 }));

    await expect(loader(loaderArgs('http://localhost/finance/reconcile'))).rejects.toMatchObject({
      status: 302,
    });
  });

  it('posts a true-up on a valid form', async () => {
    const posted = {
      accountId: 'acc-1',
      accountName: 'Checking',
      ledgerSumBefore: -100,
      plug: 10,
      alreadyReconciled: false,
      committed: true,
      transactionId: 'tx-1',
      warnings: [],
    };
    mockLedger.postLedgerTrueUp.mockResolvedValue(posted);

    const result = await action(
      actionArgs({ accountId: 'acc-1', balance: '-90', date: '2026-02-01' }),
    );

    expect(mockLedger.postLedgerTrueUp).toHaveBeenCalledWith({
      userId: 'user-1',
      accountId: 'acc-1',
      targetBalance: -90,
      date: '2026-02-01',
      force: false,
    });
    expect(result).toEqual({ ok: true, result: posted });
  });

  it('returns 400 on invalid forms and service errors', async () => {
    const invalid = await action(actionArgs({ balance: '100' }));
    expect(invalid).toMatchObject({ init: { status: 400 }, data: { ok: false } });
    expect(mockLedger.postLedgerTrueUp).not.toHaveBeenCalled();

    mockLedger.postLedgerTrueUp.mockRejectedValue(new Error('An adjustment already exists'));
    const failed = await action(actionArgs({ accountId: 'acc-1', balance: '0' }));
    expect(failed).toMatchObject({
      init: { status: 400 },
      data: { ok: false, error: 'An adjustment already exists' },
    });
  });
});
