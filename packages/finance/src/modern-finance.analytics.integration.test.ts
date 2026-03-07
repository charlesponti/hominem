import { db, sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
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
} from './modern-finance';

async function hasTaggingTables(): Promise<boolean> {
  const result = await db.execute(sql`
    select
      to_regclass('public.tags') as tags_table,
      to_regclass('public.tagged_items') as tagged_items_table
  `);
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result
      ? ((
          result as {
            rows?: Array<{ tags_table: string | null; tagged_items_table: string | null }>;
          }
        ).rows ?? [])
      : [];
  return Boolean(rows[0]?.tags_table && rows[0]?.tagged_items_table);
}

const dbAvailable = await isIntegrationDatabaseAvailable();
const taggingTablesAvailable = dbAvailable ? await hasTaggingTables() : false;
const nextUserId = createDeterministicIdFactory('finance.analytics.integration');
const nextTagId = createDeterministicIdFactory('finance.analytics.integration.tag');

describe.skipIf(!dbAvailable || !taggingTablesAvailable)(
  'modern-finance analytics integration',
  () => {
    let ownerId: string;
    let accountId: string;
    let foodTagId: string;
    let travelTagId: string;

    const cleanupUser = async (userId: string): Promise<void> => {
      await db
        .execute(sql`
      delete from tagged_items
      where entity_type = ${'finance_transaction'}
        and entity_id in (select id from finance_transactions where user_id = ${userId})
    `)
        .catch(() => {});
      await db
        .execute(sql`delete from finance_transactions where user_id = ${userId}`)
        .catch(() => {});
      await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {});
      await db.execute(sql`delete from tags where owner_id = ${userId}`).catch(() => {});
      await db.execute(sql`delete from users where id = ${userId}`).catch(() => {});
    };

    beforeEach(async () => {
      ownerId = nextUserId();
      accountId = '';
      foodTagId = nextTagId();
      travelTagId = nextTagId();

      await cleanupUser(ownerId);
      await ensureIntegrationUsers([{ id: ownerId, name: 'Finance Analytics User' }]);

      await db.execute(sql`
      insert into tags (id, owner_id, name)
      values
        (${foodTagId}, ${ownerId}, ${'food'}),
        (${travelTagId}, ${ownerId}, ${'travel'})
    `);

      const account = await createAccount({
        userId: ownerId,
        name: 'Analytics Checking',
        type: 'depository',
        balance: 1000,
      });
      accountId = account.id;
    });

    it('uses tag classification for tag breakdown and merchant aggregates', async () => {
      const lunch = await createTransaction({
        userId: ownerId,
        accountId,
        amount: -45,
        description: 'Lunch',
        date: '2026-02-10',
        category: 'LegacyCategory',
        merchantName: 'Cafe One',
      });
      const travel = await createTransaction({
        userId: ownerId,
        accountId,
        amount: -70,
        description: 'Train',
        date: '2026-02-11',
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
        date: '2026-01-01',
        merchantName: null,
      });
      const groceries = await createTransaction({
        userId: ownerId,
        accountId,
        amount: -120,
        description: 'Groceries',
        date: '2026-01-05',
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
  },
);
