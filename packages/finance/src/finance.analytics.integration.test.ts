import { db, sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
  tableExists,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createAccount,
  createTransaction,
  getTagBreakdownByContract,
  getMonthlyStatsByContract,
  getSpendingTimeSeriesByContract,
  getTopMerchantsByContract,
  replaceTransactionTags,
} from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

async function _hasTaggingTables(): Promise<boolean> {
  const hasTagsTable = await tableExists('app.tags');
  const hasTaggedItemsTable = await tableExists('app.tag_assignments');
  return hasTagsTable && hasTaggedItemsTable;
}

const nextUserId = createDeterministicIdFactory('finance.analytics.integration');
const nextTagId = createDeterministicIdFactory('finance.analytics.integration.tag');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance analytics integration', () => {
  let ownerId: string;
  let accountId: string;
  let foodTagId: string;
  let travelTagId: string;

  beforeEach(async () => {
    ownerId = nextUserId();
    accountId = '';
    foodTagId = nextTagId();
    travelTagId = nextTagId();

    await cleanupIntegrationFinanceUser(ownerId);
    await ensureIntegrationUsers([{ id: ownerId, name: 'Finance Analytics User' }]);

    await sql`
      insert into app.tags (id, owner_userid, name, slug, path)
      values
        (${foodTagId}, ${ownerId}, ${'food'}, ${'food'}, ${'food'}),
        (${travelTagId}, ${ownerId}, ${'travel'}, ${'travel'}, ${'travel'})
    `.execute(db);

    const account = await createAccount({
      userId: ownerId,
      name: 'Analytics Checking',
      accountType: 'depository',
      currentBalance: 1000,
    });
    accountId = account.id;
  });

  it('uses tag classification for tag breakdown and merchant aggregates', async () => {
    const lunch = await createTransaction({
      userId: ownerId,
      accountId,
      amount: -45,
      description: 'Lunch',
      postedOn: '2026-02-10',
      merchantName: 'Cafe One',
    });
    const travel = await createTransaction({
      userId: ownerId,
      accountId,
      amount: -70,
      description: 'Train',
      postedOn: '2026-02-11',
      merchantName: 'Rail Co',
    });

    await replaceTransactionTags(lunch.id, ownerId, [foodTagId]);
    await replaceTransactionTags(travel.id, ownerId, [travelTagId]);

    const breakdown = await getTagBreakdownByContract({
      userId: ownerId,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
      limit: 10,
    });
    expect(breakdown).toEqual([
      { tag: 'travel', amount: 70, transactionCount: 1 },
      { tag: 'food', amount: 45, transactionCount: 1 },
    ]);

    const merchants = await getTopMerchantsByContract({
      userId: ownerId,
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
      limit: 2,
    });
    expect(merchants).toEqual([
      { name: 'Rail Co', totalSpent: 70, transactionCount: 1 },
      { name: 'Cafe One', totalSpent: 45, transactionCount: 1 },
    ]);
  });

  it('returns monthly stats and time series from shared analytics dataset', async () => {
    await createTransaction({
      userId: ownerId,
      accountId,
      amount: 3000,
      description: 'Paycheck',
      postedOn: '2026-01-01',
      merchantName: null,
    });
    const groceries = await createTransaction({
      userId: ownerId,
      accountId,
      amount: -120,
      description: 'Groceries',
      postedOn: '2026-01-05',
      merchantName: 'Store',
    });
    await replaceTransactionTags(groceries.id, ownerId, [foodTagId]);

    const monthly = await getMonthlyStatsByContract({
      userId: ownerId,
      month: '2026-01',
    });
    expect(monthly.income).toBe(3000);
    expect(monthly.expenses).toBe(120);
    expect(monthly.topTag).toBe('food');
    expect(monthly.topMerchant).toBe('Store');
    expect(monthly.tagSpending).toEqual([{ name: 'food', amount: 120 }]);

    const series = await getSpendingTimeSeriesByContract({
      userId: ownerId,
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      groupBy: 'month',
      includeStats: true,
      limit: 5,
    });
    expect(series.data).toHaveLength(1);
    expect(series.data[0]?.date).toBe('2026-01');
    expect(series.data[0]?.income).toBe(3000);
    expect(series.data[0]?.expenses).toBe(120);
    expect(series.stats?.totalIncome).toBe(3000);
    expect(series.stats?.totalExpenses).toBe(120);
  });
});
