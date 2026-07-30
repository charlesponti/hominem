import { describe, expect, it, vi } from 'vitest';

const repositories = vi.hoisted(() => ({
  listMonthlyTransactions: vi.fn(),
}));

vi.mock('@hominem/db', () => ({
  db: {},
  FinanceQueryRepository: {
    listMonthlyTransactions: repositories.listMonthlyTransactions,
  },
  ValidationError: class ValidationError extends Error {},
}));

import { getMonthlySummary } from './monthly-summary';

const userId = '11111111-1111-4111-8111-111111111111';

describe('getMonthlySummary', () => {
  it('builds the public summary from monthly transaction records', async () => {
    repositories.listMonthlyTransactions.mockResolvedValueOnce([
      {
        transactionId: '22222222-2222-4222-8222-222222222222',
        accountId: '33333333-3333-4333-8333-333333333333',
        accountName: 'Personal Checking',
        currencyCode: 'USD',
        institutionName: 'Test Bank',
        postedOn: '2026-03-09',
        amount: -120,
        transactionType: 'debit',
        merchantName: 'Nashville Hotel',
      },
      {
        transactionId: '44444444-4444-4444-8444-444444444444',
        accountId: '33333333-3333-4333-8333-333333333333',
        accountName: 'Personal Checking',
        currencyCode: 'USD',
        institutionName: 'Test Bank',
        postedOn: '2026-03-10',
        amount: 2000,
        transactionType: 'credit',
        merchantName: null,
      },
    ]);

    const result = await getMonthlySummary({ ownerUserId: userId, month: '2026-03', limit: 25 });

    expect(repositories.listMonthlyTransactions).toHaveBeenCalledWith({}, userId, {
      startsOn: '2026-03-01',
      endsBefore: '2026-04-01',
    });
    expect(result).toMatchObject({
      currencyCode: 'USD',
      totalSpent: 120,
      totalIncome: 2000,
      transactionCount: 2,
      topMerchants: [{ merchantName: 'Nashville Hotel', totalSpent: 120, transactionCount: 1 }],
    });
    expect(JSON.stringify(result)).not.toContain('providerPayload');
  });

  it('rejects invalid month input before querying the database', async () => {
    repositories.listMonthlyTransactions.mockClear();

    await expect(getMonthlySummary({ ownerUserId: userId, month: '2026-13' })).rejects.toThrow(
      'month must use YYYY-MM format.',
    );
    expect(repositories.listMonthlyTransactions).not.toHaveBeenCalled();
  });
});
