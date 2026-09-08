import { ensureIntegrationUsers, isIntegrationDatabaseAvailable } from '@hominem/db/test/utils';
import { createDeterministicIdFactory } from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { applyCopilotImportBatch } from './import/apply-import-plan';
import { createCopilotImportPlan, updatePlanSelection } from './import/create-import-plan';
import { resolveCopilotAccounts } from './import/resolve-copilot-accounts';
import type { ParsedRow } from './import/types';
import { createAccount, insertTransaction, listTransactionCompositeKeys } from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.import-dedup.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

function row(line: number, overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    line,
    date: '2026-03-05',
    name: 'Blue Bottle',
    amount: '42.50',
    status: 'posted',
    category: null,
    parentCategory: null,
    excluded: false,
    tags: [],
    type: 'regular',
    account: 'Checking',
    accountMask: null,
    note: null,
    recurring: null,
    raw: {},
    ...overrides,
  };
}

describeIntegration('finance import composite dedup integration', () => {
  let ownerId: string;
  let checkingId: string;

  beforeEach(async () => {
    ownerId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await ensureIntegrationUsers([{ id: ownerId, name: 'Finance Dedup User' }]);

    const account = await createAccount({
      userId: ownerId,
      name: 'Checking',
      accountType: 'checking',
    });
    checkingId = account.id;

    await insertTransaction({
      userId: ownerId,
      accountId: checkingId,
      amount: -42.5,
      description: 'Blue Bottle',
      postedOn: '2026-03-05',
    });
  });

  it('deselects ledger rows at plan time and refuses them at apply time', async () => {
    const rows = [
      row(2),
      row(3, { amount: '9.00', name: 'Croissant', category: 'Food', parentCategory: 'Cafes' }),
    ];
    const snapshots = [{ id: checkingId, name: 'Checking', mask: null, csvImportKey: null }];
    const resolution = resolveCopilotAccounts(rows, snapshots);
    const plan = createCopilotImportPlan(rows, resolution, new Set(), {
      existingCompositeKeys: await listTransactionCompositeKeys(ownerId),
    });

    expect(plan.transactions.map((transaction) => transaction.selected)).toEqual([false, true]);
    expect(plan.stats).toMatchObject({ total: 2, selected: 1, skipped: 1 });

    // Even when re-selected after planning, the ledger row must not import twice.
    const forced = plan.transactions.map((transaction) => ({ ...transaction, selected: true }));
    const first = await applyCopilotImportBatch({ userId: ownerId, plan, transactions: forced });
    expect(first).toMatchObject({ created: 1, skipped: 1 });

    const second = await applyCopilotImportBatch({ userId: ownerId, plan, transactions: forced });
    expect(second).toMatchObject({ created: 0, skipped: 2 });

    const keys = await listTransactionCompositeKeys(ownerId);
    expect(keys.has(`${checkingId}|2026-03-05|42.50|blue bottle`)).toBe(true);
    expect(keys.has(`${checkingId}|2026-03-05|9.00|croissant`)).toBe(true);
    expect(keys.size).toBe(2);
  });

  it('imports duplicate occurrences split across sequential batches', async () => {
    const rows = [row(2, { amount: '5.00', name: 'Gum' }), row(3, { amount: '5.00', name: 'Gum' })];
    const snapshots = [{ id: checkingId, name: 'Checking', mask: null, csvImportKey: null }];
    const resolution = resolveCopilotAccounts(rows, snapshots);
    const plan = createCopilotImportPlan(rows, resolution);
    expect(plan.transactions.map((transaction) => transaction.selected)).toEqual([true, true]);

    const first = await applyCopilotImportBatch({
      userId: ownerId,
      plan,
      transactions: [plan.transactions[0]],
    });
    const second = await applyCopilotImportBatch({
      userId: ownerId,
      plan,
      transactions: [plan.transactions[1]],
    });
    expect(first).toMatchObject({ created: 1, skipped: 0 });
    expect(second).toMatchObject({ created: 1, skipped: 0 });
  });

  it('honors an explicit user override of a ledger duplicate', async () => {
    const rows = [row(2)];
    const snapshots = [{ id: checkingId, name: 'Checking', mask: null, csvImportKey: null }];
    const resolution = resolveCopilotAccounts(rows, snapshots);
    const plan = createCopilotImportPlan(rows, resolution, new Set(), {
      existingCompositeKeys: await listTransactionCompositeKeys(ownerId),
    });
    expect(plan.transactions[0]).toMatchObject({ selected: false, ledgerDuplicate: true });

    const confirmed = updatePlanSelection(plan, new Set([plan.transactions[0]?.rowId ?? '']));
    const result = await applyCopilotImportBatch({
      userId: ownerId,
      plan: confirmed,
      transactions: confirmed.transactions,
    });
    expect(result).toMatchObject({ created: 1, skipped: 0 });
  });
});
