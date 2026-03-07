import crypto from 'node:crypto';

import { db, sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  bulkCreateBudgetCategoriesFromTransactions,
  checkBudgetCategoryNameExists,
  createAccount,
  createBudgetCategory,
  createTransaction,
  deleteAllFinanceData,
  deleteBudgetCategory,
  getAllBudgetCategories,
  getBudgetCategoriesWithSpending,
  getBudgetCategoryById,
  getBudgetTrackingData,
  getTransactionTagAnalysis,
  queryTransactionsByContract,
  replaceTransactionTags,
  updateBudgetCategory,
} from './modern-finance';

const dbAvailable = await isIntegrationDatabaseAvailable();
const nextUserId = createDeterministicIdFactory('finance.budget.integration');

async function hasBudgetGoalsTable(): Promise<boolean> {
  const result = await db.execute(sql`
    select to_regclass('public.budget_goals') as relation_name
  `);
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result
      ? ((result as { rows?: Array<{ relation_name: string | null }> }).rows ?? [])
      : [];
  return Boolean(rows[0]?.relation_name);
}

describe.skipIf(!dbAvailable)('modern-finance budget integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerAccountId: string;

  const cleanupUser = async (userId: string): Promise<void> => {
    await db
      .execute(sql`
      delete from tagged_items
      where entity_type = ${'finance_transaction'}
        and entity_id in (select id from finance_transactions where user_id = ${userId})
    `)
      .catch(() => {});
    await db.execute(sql`delete from plaid_items where user_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from budget_goals where user_id = ${userId}`).catch(() => {});
    await db
      .execute(sql`delete from finance_transactions where user_id = ${userId}`)
      .catch(() => {});
    await db.execute(sql`delete from tags where owner_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {});
  };

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupUser(ownerId);
    await cleanupUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Budget User' },
      { id: otherUserId, name: 'Finance Budget User' },
    ]);

    const account = await createAccount({
      userId: ownerId,
      name: 'Budget Checking',
      type: 'depository',
      balance: 4000,
    });
    ownerAccountId = account.id;
  });

  it('creates, updates, lists and deletes budget categories with owner guards', async () => {
    const created = await createBudgetCategory({
      userId: ownerId,
      name: 'Food',
      color: '#00AAFF',
    });

    expect(created.userId).toBe(ownerId);
    expect(created.name).toBe('Food');
    expect(created.color).toBe('#00AAFF');

    const exists = await checkBudgetCategoryNameExists(ownerId, 'Food');
    expect(exists).toBe(true);

    const listed = await getAllBudgetCategories(ownerId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);

    const deniedUpdate = await updateBudgetCategory(created.id, otherUserId, {
      name: 'Hijacked',
    });
    expect(deniedUpdate).toBeNull();

    const updated = await updateBudgetCategory(created.id, ownerId, {
      name: 'Groceries',
    });
    expect(updated?.name).toBe('Groceries');

    const fetched = await getBudgetCategoryById(created.id, ownerId);
    expect(fetched?.name).toBe('Groceries');

    const deniedDelete = await deleteBudgetCategory(created.id, otherUserId);
    expect(deniedDelete).toBe(false);

    const allowedDelete = await deleteBudgetCategory(created.id, ownerId);
    expect(allowedDelete).toBe(true);
  });

  it('computes category spending and tracking totals deterministically', async () => {
    const foodTag = await createBudgetCategory({
      userId: ownerId,
      name: 'Food',
    });
    const travelTag = await createBudgetCategory({
      userId: ownerId,
      name: 'Travel',
    });

    const budgetGoalsExists = await hasBudgetGoalsTable();
    if (budgetGoalsExists) {
      await db.execute(sql`
        insert into budget_goals (id, user_id, category_id, target_amount, target_period)
        values (${crypto.randomUUID()}, ${ownerId}, ${null}, ${500}, ${'monthly'})
      `);
    }

    const txFood = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -120,
      description: 'Groceries',
      date: '2026-03-01',
      category: 'Food',
      merchantName: 'Market',
    });
    const txTravel = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -80,
      description: 'Trip',
      date: '2026-03-02',
      category: 'Travel',
      merchantName: 'Airline',
    });
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: 200,
      description: 'Paycheck',
      date: '2026-03-03',
      category: 'Income',
      merchantName: 'Employer',
    });

    await replaceTransactionTags(txFood.id, ownerId, [foodTag.id]);
    await replaceTransactionTags(txTravel.id, ownerId, [travelTag.id]);

    const spending = await getBudgetCategoriesWithSpending(ownerId);
    expect(spending).toHaveLength(2);
    expect(spending[0]?.name).toBe('Food');
    expect(spending[0]?.spent).toBe(120);
    expect(spending[1]?.name).toBe('Travel');
    expect(spending[1]?.spent).toBe(80);

    const tracking = await getBudgetTrackingData(ownerId);
    expect(tracking.totalBudget).toBe(budgetGoalsExists ? 500 : 0);
    expect(tracking.totalSpent).toBe(200);
  });

  it('creates missing categories from transactions and returns analysis aggregates', async () => {
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -25,
      description: 'Lunch',
      date: '2026-03-01',
      category: 'Food',
      merchantName: 'Cafe',
    });
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -75,
      description: 'Dinner',
      date: '2026-03-02',
      category: 'Food',
      merchantName: 'Bistro',
    });
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -60,
      description: 'Train',
      date: '2026-03-03',
      category: 'Transit',
      merchantName: 'Transit',
    });

    const created = await bulkCreateBudgetCategoriesFromTransactions(ownerId);
    expect(created).toHaveLength(2);
    expect(created.map((item) => item.name)).toEqual(['Food', 'Transit']);

    const categories = await getAllBudgetCategories(ownerId);
    expect(categories).toHaveLength(2);
    const foodTag = categories.find((item) => item.name === 'Food');
    const transitTag = categories.find((item) => item.name === 'Transit');
    expect(foodTag?.id).toBeDefined();
    expect(transitTag?.id).toBeDefined();

    const transactions = await queryTransactionsByContract({
      userId: ownerId,
      limit: 50,
      offset: 0,
    });
    const txByDescription = new Map(transactions.map((item) => [item.description, item.id]));

    const lunchId = txByDescription.get('Lunch');
    const dinnerId = txByDescription.get('Dinner');
    const trainId = txByDescription.get('Train');
    expect(lunchId).toBeDefined();
    expect(dinnerId).toBeDefined();
    expect(trainId).toBeDefined();

    await replaceTransactionTags(lunchId!, ownerId, [foodTag!.id]);
    await replaceTransactionTags(dinnerId!, ownerId, [foodTag!.id]);
    await replaceTransactionTags(trainId!, ownerId, [transitTag!.id]);

    const analysis = await getTransactionTagAnalysis(ownerId);
    expect(analysis).toEqual([
      { tag: 'Food', total: 100 },
      { tag: 'Transit', total: 60 },
    ]);

    await deleteAllFinanceData(ownerId);
    const afterDelete = await queryTransactionsByContract({
      userId: ownerId,
      limit: 50,
      offset: 0,
    });
    expect(afterDelete).toHaveLength(0);
  });
});
