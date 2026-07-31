import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  checkBudgetCategoryNameExists,
  createAccount,
  createBudgetCategory,
  createTransaction,
  deleteBudgetCategory,
  deleteUserFinanceData,
  getBudgetCategoriesWithSpending,
  getBudgetCategoryById,
  getBudgetTrackingData,
  getSpendingCategories,
  getTransactionTagAnalysis,
  queryTransactionsByContract,
  replaceTransactionTags,
  updateBudgetCategory,
} from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.budget.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance budget integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerAccountId: string;

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Budget User' },
      { id: otherUserId, name: 'Finance Budget User' },
    ]);

    const account = await createAccount({
      userId: ownerId,
      name: 'Budget Checking',
      accountType: 'depository',
      currentBalance: 4000,
    });
    ownerAccountId = account.id;
  });

  it('creates, updates, lists and deletes budget categories with owner guards', async () => {
    const created = await createBudgetCategory({
      ownerUserid: ownerId,
      name: 'Food',
    });

    expect(created.ownerUserid).toBe(ownerId);
    expect(created.name).toBe('Food');

    const exists = await checkBudgetCategoryNameExists(ownerId, 'Food');
    expect(exists).toBe(true);

    const listed = await getSpendingCategories(ownerId);
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
      ownerUserid: ownerId,
      name: 'Food',
    });
    const travelTag = await createBudgetCategory({
      ownerUserid: ownerId,
      name: 'Travel',
    });

    const txFood = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -120,
      description: 'Groceries',
      postedOn: '2026-03-01',
      merchantName: 'Market',
    });
    const txTravel = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -80,
      description: 'Trip',
      postedOn: '2026-03-02',
      merchantName: 'Airline',
    });
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: 200,
      description: 'Paycheck',
      postedOn: '2026-03-03',
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
    expect(tracking.totalBudget).toBe(0);
    expect(tracking.totalSpent).toBe(200);
  });

  it('creates missing categories from transactions and returns analysis aggregates', async () => {
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -25,
      description: 'Lunch',
      postedOn: '2026-03-01',
      merchantName: 'Cafe',
    });
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -75,
      description: 'Dinner',
      postedOn: '2026-03-02',
      merchantName: 'Bistro',
    });
    await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -60,
      description: 'Train',
      postedOn: '2026-03-03',
      merchantName: 'Transit',
    });

    const foodTag = await createBudgetCategory({
      ownerUserid: ownerId,
      name: 'Food',
    });
    const transitTag = await createBudgetCategory({
      ownerUserid: ownerId,
      name: 'Transit',
    });

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

    await deleteUserFinanceData(ownerId);
    const afterDelete = await queryTransactionsByContract({
      userId: ownerId,
      limit: 50,
      offset: 0,
    });
    expect(afterDelete).toHaveLength(0);
  });
});
