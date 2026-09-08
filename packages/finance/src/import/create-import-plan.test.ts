import { describe, expect, it } from 'vitest';

import { createCopilotImportPlan, updatePlanSelection } from './create-import-plan';
import { resolveCopilotAccounts } from './resolve-copilot-accounts';
import type { ParsedRow } from './types';

function row(line: number, overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    line,
    date: '2026-01-01',
    name: 'Coffee',
    amount: '4.50',
    status: 'posted',
    category: null,
    parentCategory: null,
    excluded: false,
    tags: [],
    type: 'regular',
    account: 'Checking',
    accountMask: '1234',
    note: null,
    recurring: null,
    raw: { name: 'Coffee' },
    ...overrides,
  };
}

describe('createCopilotImportPlan', () => {
  it('preserves repeated rows with distinct row identities', () => {
    const rows = [row(2), row(3)];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution);

    expect(plan.transactions).toHaveLength(2);
    expect(new Set(plan.transactions.map((transaction) => transaction.rowId)).size).toBe(2);
    expect(plan.duplicateCandidateRowIds).toHaveLength(2);
  });

  it('normalizes Copilot regular and income amounts', () => {
    const rows = [row(2, { amount: '10.00' }), row(3, { type: 'income', amount: '-25.00' })];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution);

    expect(
      plan.transactions.map((transaction) => [transaction.amount, transaction.transactionType]),
    ).toEqual([
      ['-10.00', 'debit'],
      ['25.00', 'credit'],
    ]);
  });

  it('negates internal transfers and flags them for review', () => {
    const rows = [row(2, { type: 'internal transfer', amount: '500.00' })];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution);

    expect(
      plan.transactions.map((transaction) => [
        transaction.amount,
        transaction.transactionType,
        transaction.needsReview,
      ]),
    ).toEqual([['-500.00', 'transfer', true]]);
    expect(plan.stats.needsReview).toBe(1);
  });

  it('forces credit for split-redirected always-credit lines', () => {
    const rows = [row(2, { amount: '-12.34' })];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution, new Set(), {
      forcedCreditLines: new Set([2]),
    });

    expect(
      plan.transactions.map((transaction) => [
        transaction.amount,
        transaction.transactionType,
        transaction.needsReview,
      ]),
    ).toEqual([['12.34', 'credit', false]]);
  });

  it('marks recurring series names without treating false as active', () => {
    const rows = [
      row(2, { recurring: 'Netflix' }),
      row(3, { recurring: 'false' }),
      row(4, { recurring: null }),
    ];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution);

    expect(plan.transactions.map((transaction) => transaction.recurring)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('clears the ledger-duplicate marker when the user explicitly selects the row', () => {
    const rows = [row(2, { amount: '10.00' })];
    const snapshots = [{ id: 'acc-1', name: 'Checking', mask: '1234', csvImportKey: null }];
    const resolution = resolveCopilotAccounts(rows, snapshots);
    const plan = createCopilotImportPlan(rows, resolution, new Set(), {
      existingCompositeKeys: new Set(['acc-1|2026-01-01|10.00|coffee']),
    });
    expect(plan.transactions[0]).toMatchObject({ selected: false, ledgerDuplicate: true });

    const updated = updatePlanSelection(plan, new Set([plan.transactions[0]?.rowId ?? '']));
    expect(updated.transactions[0]).toMatchObject({ selected: true, ledgerDuplicate: false });
  });

  it('recomputes review counts when rows are deselected', () => {
    const rows = [
      row(2, { type: 'internal transfer', amount: '500.00' }),
      row(3, { amount: '4.50' }),
    ];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution);
    expect(plan.stats.needsReview).toBe(1);

    const updated = updatePlanSelection(plan, new Set([plan.transactions[1]?.rowId]));
    expect(updated.stats.needsReview).toBe(0);
  });

  it('deselects rows the ledger already holds under another source', () => {
    const rows = [row(2, { amount: '10.00' }), row(3, { amount: '99.00' })];
    const snapshots = [{ id: 'acc-1', name: 'Checking', mask: '1234', csvImportKey: null }];
    const resolution = resolveCopilotAccounts(rows, snapshots);
    const plan = createCopilotImportPlan(rows, resolution, new Set(), {
      existingCompositeKeys: new Set(['acc-1|2026-01-01|10.00|coffee']),
    });

    expect(plan.transactions.map((transaction) => transaction.selected)).toEqual([false, true]);
    expect(plan.transactions.map((transaction) => transaction.ledgerDuplicate)).toEqual([
      true,
      false,
    ]);
    expect(plan.stats.selected).toBe(1);
    expect(plan.stats.skipped).toBe(1);
  });

  it('leaves unresolved rows to the account-mapping step', () => {
    const rows = [row(2, { amount: '10.00' })];
    const resolution = resolveCopilotAccounts(rows, []);
    expect(resolution.groups[0]?.matchedAccountId).toBeNull();
    const plan = createCopilotImportPlan(rows, resolution, new Set(), {
      existingCompositeKeys: new Set(['acc-1|2026-01-01|10.00|coffee']),
    });

    expect(plan.transactions[0]?.selected).toBe(true);
    expect(plan.transactions[0]?.ledgerDuplicate).toBe(false);
  });

  it('supports explicit deselection without changing row identities', () => {
    const rows = [row(2), row(3)];
    const resolution = resolveCopilotAccounts(rows, []);
    const plan = createCopilotImportPlan(rows, resolution);
    const selected = new Set([plan.transactions[0]?.rowId]);
    const updated = updatePlanSelection(plan, selected);

    expect(updated.transactions.filter((transaction) => transaction.selected)).toHaveLength(1);
    expect(updated.transactions.map((transaction) => transaction.rowId)).toEqual(
      plan.transactions.map((transaction) => transaction.rowId),
    );
  });

  it('skips row identities already present in the database snapshot', () => {
    const rows = [row(2)];
    const resolution = resolveCopilotAccounts(rows, []);
    const first = createCopilotImportPlan(rows, resolution);
    const second = createCopilotImportPlan(
      rows,
      resolution,
      new Set([first.transactions[0]?.externalId]),
    );

    expect(second.stats.selected).toBe(0);
    expect(second.stats.skipped).toBe(1);
  });
});
