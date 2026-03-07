import crypto from 'node:crypto';

import { db, sql } from '@hominem/db';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  assertErrorResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '@/test/api-test-utils';
import {
  cleanupFinanceUserData,
  createFinanceAccountFixture,
  createFinanceUser,
} from '@/test/finance-test-harness';

interface TransactionListBody {
  data: Array<{
    id: string;
    accountId: string;
    amount: number;
    description: string;
    date: string;
    type: 'income' | 'expense' | 'transfer';
  }>;
  filteredCount: number;
  totalUserCount: number;
}

interface TransactionCreateBody {
  id: string;
  accountId: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
}

interface TransactionDeleteBody {
  success: boolean;
  message?: string;
}

interface TagBreakdownBody {
  breakdown: Array<{
    tag: string;
    amount: number;
    percentage: number;
    transactionCount: number;
  }>;
  totalSpending: number;
  averagePerDay: number;
}

interface TopMerchantsBody {
  merchants: Array<{
    name: string;
    totalSpent: number;
    transactionCount: number;
  }>;
}

interface TimeSeriesBody {
  data: Array<{
    date: string;
    amount: number;
    expenses: number;
    income: number;
    count: number;
    average: number;
  }>;
  stats?: {
    total: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
    changePercentage: number;
    totalIncome?: number;
    totalExpenses?: number;
    averageIncome?: number;
    averageExpenses?: number;
    count?: number;
    periodCovered?: string;
  };
}

describe('Finance Transactions Router', () => {
  const { getServer } = useApiTestLifecycle();

  let testUserId: string;
  let testAccountId: string;
  let testInstitutionId: string;
  let foodTagId: string;
  let travelTagId: string;

  beforeAll(async () => {
    testUserId = await createFinanceUser('test');
    testAccountId = crypto.randomUUID();
    testInstitutionId = crypto.randomUUID();
    foodTagId = crypto.randomUUID();
    travelTagId = crypto.randomUUID();
    await createFinanceAccountFixture({
      id: testAccountId,
      userId: testUserId,
      name: `Test Account ${testAccountId.slice(0, 8)}`,
      institutionId: testInstitutionId,
      institutionName: testInstitutionId,
      balance: '5000.00',
    });

    await db.execute(sql`
      insert into tags (id, owner_id, name)
      values
        (${foodTagId}, ${testUserId}, 'Food'),
        (${travelTagId}, ${testUserId}, 'Travel')
    `);
  });

  afterAll(async () => {
    await cleanupFinanceUserData({
      userIds: [testUserId],
      accountIds: [testAccountId],
      tagIds: [foodTagId, travelTagId],
    });
  });

  test('creates transaction with tags and lists by tag filter', async () => {
    const createResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/create',
      payload: {
        accountId: testAccountId,
        amount: -55.25,
        description: 'Dinner',
        date: '2026-03-01',
        tagIds: [foodTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as TransactionCreateBody;
    expect(created.accountId).toBe(testAccountId);
    expect(created.amount).toBe(-55.25);
    expect(created.type).toBe('expense');

    const listResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/list',
      payload: {
        tagIds: [foodTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as TransactionListBody;
    expect(listed.filteredCount).toBeGreaterThanOrEqual(1);
    expect(listed.data.some((tx) => tx.id === created.id)).toBe(true);
  });

  test('lists finance tags from tags taxonomy route', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'GET',
      url: '/api/finance/tags',
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<{ id: string; name: string }>;
    expect(body.some((tag) => tag.id === foodTagId && tag.name === 'Food')).toBe(true);
    expect(body.some((tag) => tag.id === travelTagId && tag.name === 'Travel')).toBe(true);
  });

  test('updates tags via update and removes deleted transaction', async () => {
    const createResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/create',
      payload: {
        accountId: testAccountId,
        amount: -20.0,
        description: 'Coffee',
        date: '2026-03-02',
        tagIds: [foodTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as TransactionCreateBody;

    const updateResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/update',
      payload: {
        id: created.id,
        data: {
          amount: -22.5,
          tagIds: [travelTagId],
        },
      },
      headers: {
        'x-user-id': testUserId,
      },
    });

    expect(updateResponse.status).toBe(200);
    const updated = (await updateResponse.json()) as TransactionCreateBody;
    expect(updated.amount).toBe(-22.5);

    const oldTagListResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/list',
      payload: {
        tagIds: [foodTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(oldTagListResponse.status).toBe(200);
    const oldTagList = (await oldTagListResponse.json()) as TransactionListBody;
    expect(oldTagList.data.some((tx) => tx.id === created.id)).toBe(false);

    const deleteResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/delete',
      payload: {
        id: created.id,
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(deleteResponse.status).toBe(200);
    const deleted = (await deleteResponse.json()) as TransactionDeleteBody;
    expect(deleted.success).toBe(true);
  });

  test('returns filtered tag breakdown for tag-scoped transactions', async () => {
    const foodCreate = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/create',
      payload: {
        accountId: testAccountId,
        amount: -30.0,
        description: 'Lunch',
        date: '2026-02-10',
        tagIds: [foodTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(foodCreate.status).toBe(201);

    const travelCreate = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/create',
      payload: {
        accountId: testAccountId,
        amount: -70.0,
        description: 'Train',
        date: '2026-02-11',
        tagIds: [travelTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(travelCreate.status).toBe(201);

    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/analyze/tag-breakdown',
      payload: {
        from: '2026-02-01',
        to: '2026-02-28',
        tag: foodTagId,
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as TagBreakdownBody;
    expect(body.totalSpending).toBeCloseTo(30.0, 2);
    expect(body.breakdown.length).toBeGreaterThan(0);
  });

  test('returns top merchants and time series stats', async () => {
    const create = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/create',
      payload: {
        accountId: testAccountId,
        amount: -120.0,
        description: 'Flight',
        date: '2026-01-15',
        tagIds: [travelTagId],
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as TransactionCreateBody;

    const update = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/update',
      payload: {
        id: created.id,
        data: {
          merchantName: 'SkyAir',
          tagIds: [travelTagId],
        },
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(update.status).toBe(200);

    const merchantsRes = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/analyze/top-merchants',
      payload: {
        from: '2026-01-01',
        to: '2026-01-31',
        tag: travelTagId,
        limit: 1,
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(merchantsRes.status).toBe(200);
    const merchants = (await merchantsRes.json()) as TopMerchantsBody;
    expect(merchants.merchants.length).toBe(1);
    expect(merchants.merchants[0]?.name).toBe('SkyAir');
    expect(merchants.merchants[0]?.totalSpent).toBeCloseTo(120.0, 2);

    const seriesRes = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/analyze/spending-time-series',
      payload: {
        from: '2026-01-01',
        to: '2026-01-31',
        tag: travelTagId,
        includeStats: true,
        groupBy: 'month',
      },
      headers: {
        'x-user-id': testUserId,
      },
    });
    expect(seriesRes.status).toBe(200);
    const series = (await seriesRes.json()) as TimeSeriesBody;
    expect(series.data.length).toBeGreaterThan(0);
    expect(series.stats).toBeDefined();
    expect(series.stats?.totalExpenses).toBeGreaterThan(0);
    expect(series.stats?.count).toBeGreaterThan(0);
  });

  test('rejects transaction create without auth', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions/create',
      payload: {
        accountId: testAccountId,
        amount: -10,
        description: 'Unauthorized',
        date: '2026-03-03',
      },
      headers: {
        'x-user-id': null,
      },
    });

    await assertErrorResponse(response, 401);
  });
});
