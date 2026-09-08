import { describe, expect, it } from 'vitest';

import { applyDescriptionSplits, isRecurringActive, resolveCopilotSign } from './copilot-sign';
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
    raw: {},
    ...overrides,
  };
}

describe('resolveCopilotSign', () => {
  it('negates regular rows to money-out-negative', () => {
    expect(resolveCopilotSign('regular', '10.00')).toEqual({
      amount: '-10.00',
      transactionType: 'debit',
      needsReview: false,
      reviewReason: null,
    });
  });

  it('forces income rows positive regardless of raw sign', () => {
    expect(resolveCopilotSign('income', '-25.00')).toEqual({
      amount: '25.00',
      transactionType: 'credit',
      needsReview: false,
      reviewReason: null,
    });
    expect(resolveCopilotSign('income', '25.00').amount).toBe('25.00');
  });

  it('negates internal transfers but always flags them for review', () => {
    expect(resolveCopilotSign('internal transfer', '500.00')).toEqual({
      amount: '-500.00',
      transactionType: 'transfer',
      needsReview: true,
      reviewReason: 'internal transfer — verify direction before committing',
    });
  });

  it('flags unrecognized types instead of guessing', () => {
    const resolved = resolveCopilotSign('mystery', '7.00');
    expect(resolved.needsReview).toBe(true);
    expect(resolved.reviewReason).toContain('mystery');
  });

  it('forces credit for verified always-credit split rows', () => {
    expect(resolveCopilotSign('regular', '-12.34', { forceCredit: true })).toEqual({
      amount: '12.34',
      transactionType: 'credit',
      needsReview: false,
      reviewReason: null,
    });
  });
});

describe('applyDescriptionSplits', () => {
  const splits = [
    {
      sourceAccount: 'American Express Savings',
      targetAccount: 'Apple Savings',
      csvAccountLabel: 'Savings',
      descriptions: ['Deposit', 'Interest', 'Withdrawal'],
      alwaysCreditDescriptions: ['Deposit', 'Interest'],
    },
  ];

  it('redirects colliding labels and forces credit on always-credit descriptions', () => {
    const { rows, forcedCreditLines } = applyDescriptionSplits(
      [
        row(2, { account: 'Savings', name: 'Deposit' }),
        row(3, { account: 'Savings', name: 'Withdrawal' }),
      ],
      splits,
    );

    expect(rows.map((entry) => entry.account)).toEqual(['Apple Savings', 'Apple Savings']);
    expect(forcedCreditLines).toEqual(new Set([2]));
  });

  it('leaves unrelated rows untouched', () => {
    const { rows, forcedCreditLines } = applyDescriptionSplits(
      [row(2, { account: 'Checking', name: 'Coffee' })],
      splits,
    );

    expect(rows[0]?.account).toBe('Checking');
    expect(forcedCreditLines.size).toBe(0);
  });
});

describe('isRecurringActive', () => {
  it('treats series names as active and blanks as inactive', () => {
    expect(isRecurringActive('Netflix')).toBe(true);
    expect(isRecurringActive('true')).toBe(true);
    expect(isRecurringActive('false')).toBe(false);
    expect(isRecurringActive('')).toBe(false);
    expect(isRecurringActive(null)).toBe(false);
  });
});
