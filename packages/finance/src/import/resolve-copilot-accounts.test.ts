import { describe, expect, it } from 'vitest';

import { resolveCopilotAccounts } from './resolve-copilot-accounts';
import type { ParsedRow } from './types';

function row(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    line: 2,
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

describe('resolveCopilotAccounts', () => {
  it('matches a unique mask even when the account label changes', () => {
    const result = resolveCopilotAccounts(
      [row({ account: 'Renamed checking' })],
      [{ id: 'account-1', name: 'Checking', mask: '1234', csvImportKey: 'copilot:mask:1234' }],
    );

    expect(result.groups[0]?.matchedAccountId).toBe('account-1');
    expect(result.accountsToCreate).toHaveLength(0);
  });

  it('does not guess when a shared mask has no exact label match', () => {
    const result = resolveCopilotAccounts(
      [row()],
      [
        { id: 'account-1', name: 'Savings', mask: '1234', csvImportKey: null },
        { id: 'account-2', name: 'Card', mask: '1234', csvImportKey: null },
      ],
    );

    expect(result.groups[0]?.unresolved).toBe(true);
    expect(result.accountsToCreate[0]?.importKey).toBe('copilot:mask:1234:label:checking');
  });

  it('creates one draft per distinct Copilot account group', () => {
    const result = resolveCopilotAccounts(
      [row(), row({ line: 3 }), row({ line: 4, account: 'Savings', accountMask: '5678' })],
      [],
    );

    expect(result.accountsToCreate).toHaveLength(2);
  });
});
