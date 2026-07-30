import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { afterEach, describe, expect, it } from 'vitest';

import { createAccount, createTransaction, getMonthlySummary } from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.monthly-summary.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance monthly summary integration', () => {
  const userIds: string[] = [];

  afterEach(async () => {
    for (const userId of userIds.splice(0)) {
      await cleanupIntegrationFinanceUser(userId);
    }
  });

  it('calculates a capped monthly summary without exposing transaction details', async () => {
    const ownerUserId = nextUserId();
    userIds.push(ownerUserId);
    await ensureIntegrationUsers([{ id: ownerUserId, name: 'Monthly Summary User' }]);
    const account = await createAccount({
      userId: ownerUserId,
      name: 'Personal Checking',
      accountType: 'checking',
      currentBalance: 0,
    });

    await Promise.all([
      createTransaction({
        userId: ownerUserId,
        accountId: account.id,
        amount: -10,
        description: 'Morning coffee',
        postedOn: '2026-03-01',
        merchantName: 'Coffee',
      }),
      createTransaction({
        userId: ownerUserId,
        accountId: account.id,
        amount: -20,
        description: 'Lunch',
        postedOn: '2026-03-02',
        merchantName: 'Lunch',
      }),
      createTransaction({
        userId: ownerUserId,
        accountId: account.id,
        amount: 100,
        description: 'Invoice',
        postedOn: '2026-03-03',
        merchantName: 'Client',
      }),
      createTransaction({
        userId: ownerUserId,
        accountId: account.id,
        amount: -999,
        description: 'Out of range',
        postedOn: '2026-04-01',
        merchantName: 'April',
      }),
    ]);

    const summary = await getMonthlySummary({ ownerUserId, month: '2026-03', limit: 2 });

    expect(summary).toMatchObject({
      month: '2026-03',
      startsOn: '2026-03-01',
      endsBefore: '2026-04-01',
      totalSpent: 30,
      totalIncome: 100,
      transactionCount: 3,
    });
    expect(summary.transactions).toHaveLength(2);
    expect(summary.topMerchants.map((merchant) => merchant.merchantName)).toEqual([
      'Lunch',
      'Coffee',
    ]);
    expect(JSON.stringify(summary)).not.toContain('Out of range');
    expect(JSON.stringify(summary)).not.toContain('providerPayload');
  });
});
