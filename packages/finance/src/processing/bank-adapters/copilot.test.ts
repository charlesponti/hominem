import { describe, expect, it } from 'vitest';

import {
  type CopilotTransaction,
  convertCopilotTransaction,
  translateTransactionType,
} from './copilot';

describe('translateTransactionType', () => {
  it('should translate "income" to "income"', () => {
    expect(translateTransactionType('income')).toBe('income');
  });

  it('should translate "internal transfer" to "transfer"', () => {
    expect(translateTransactionType('internal transfer')).toBe('transfer');
  });

  it('should translate "regular" to "expense"', () => {
    expect(translateTransactionType('regular')).toBe('expense');
  });

  it('should default unknown types to "expense"', () => {
    expect(translateTransactionType('unknown')).toBe('expense');
    expect(translateTransactionType('')).toBe('expense');
  });
});

describe('convertCopilotTransaction', () => {
  const baseCopilotData: CopilotTransaction = {
    date: '2023-10-26',
    name: 'Test Transaction',
    amount: '100.00',
    status: 'posted',
    category: 'Groceries',
    parent_category: 'Food & Dining',
    'parent category': 'Food & Dining',
    excluded: 'false',
    tags: 'tag1, tag2',
    type: 'regular',
    account: 'Checking',
    account_mask: '1234',
    'account mask': '1234',
    note: 'Test note',
    recurring: 'false',
  };
  const userId = 'test-user-id';

  it('should convert a positive expense correctly (make it negative)', () => {
    const data = { ...baseCopilotData, type: 'regular', amount: '123.45' };
    const result = convertCopilotTransaction(data, userId);
    expect(result.type).toBe('expense');
    expect(result.amount).toBe('-123.45');
    expect(result.description).toBe('Test Transaction');
    expect(result.date).toEqual(new Date('2023-10-26').toISOString());
    expect(result.category).toBe('Groceries');
    expect(result.parentCategory).toBe('Food & Dining');
    expect(result.excluded).toBe(false);
    expect(result.tags).toBe('tag1, tag2');
    expect(result.status).toBe('posted');
    expect(result.accountMask).toBe('1234');
    expect(result.note).toBe('Test note');
    expect(result.recurring).toBe(false);
    expect(result.userId).toBe(userId);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('should convert a negative income correctly (make it positive)', () => {
    const data = { ...baseCopilotData, type: 'income', amount: '-500.00' };
    const result = convertCopilotTransaction(data, userId);
    expect(result.type).toBe('income');
    expect(result.amount).toBe('500.00'); // Should be positive
  });

  it('should convert a positive transfer correctly (make it negative)', () => {
    const data = { ...baseCopilotData, type: 'internal transfer', amount: '75.50' };
    const result = convertCopilotTransaction(data, userId);
    expect(result.type).toBe('transfer');
    expect(result.amount).toBe('-75.50'); // Should be negative
  });

  it('should handle zero amount', () => {
    const data = { ...baseCopilotData, amount: '0.00' };
    const result = convertCopilotTransaction(data, userId);
    expect(result.amount).toBe('0.00');
  });

  it('should handle negative expense (keep it negative)', () => {
    // Although Copilot usually has positive expenses, test this edge case
    const data = { ...baseCopilotData, type: 'regular', amount: '-50.00' };
    const result = convertCopilotTransaction(data, userId);
    expect(result.type).toBe('expense');
    expect(result.amount).toBe('-50.00');
  });

  it('should handle positive income (keep it positive)', () => {
    // Although Copilot usually has negative income, test this edge case
    const data = { ...baseCopilotData, type: 'income', amount: '1000.00' };
    const result = convertCopilotTransaction(data, userId);
    expect(result.type).toBe('income');
    expect(result.amount).toBe('1000.00');
  });

  it('should handle excluded flag correctly', () => {
    const dataTrue = { ...baseCopilotData, excluded: 'true' };
    const resultTrue = convertCopilotTransaction(dataTrue, userId);
    expect(resultTrue.excluded).toBe(true);

    const dataFalse = { ...baseCopilotData, excluded: 'false' };
    const resultFalse = convertCopilotTransaction(dataFalse, userId);
    expect(resultFalse.excluded).toBe(false);
  });

  it('should handle missing optional fields', () => {
    const {
      parent_category: _parent_category,
      'parent category': _unusedParentCategory,
      account_mask: _account_mask,
      'account mask': _unusedAccountMask,
      ...data
    } = baseCopilotData;

    const result = convertCopilotTransaction(data as CopilotTransaction, userId);
    expect(result.parentCategory).toBe('');
    expect(result.accountMask).toBe('');
  });

  it('should throw error for invalid amount string', () => {
    const data = { ...baseCopilotData, amount: 'invalid-amount' };
    expect(() => convertCopilotTransaction(data, userId)).toThrow('Invalid amount');
  });
});
