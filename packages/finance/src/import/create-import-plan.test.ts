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
