import type {
  AppFinanceAccounts,
  AppFinanceCategories,
  AppFinanceStatementPeriods,
  AppFinanceTransactions,
} from '@hominem/db';
import { db, pool } from '@hominem/db';
import type { Insertable } from 'kysely';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

type NetWorthAccount = { name: string; balanceSource: string };
type NetWorthResult = { warnings: unknown[]; accounts: NetWorthAccount[]; totals: unknown[] };

type TransactionRow = {
  description: string;
  categoryName?: string;
  amountCents?: number;
  excluded?: boolean;
};
type RecentTransactionsResult = { count: number; transactions: TransactionRow[] };

type CategorySpend = {
  categoryId: string;
  categoryName: string;
  spentCents: number;
  transactionCount: number;
};
type SpendingByCategoryResult = {
  currencyCode: string;
  warnings: unknown[];
  categories: CategorySpend[];
};

const userId = 'cf8f3ada-d5ed-45c8-b044-0ca80f60611f';

const checkingId = 'f1000003-0000-4000-8000-000000000001';

function resultContent<T = Record<string, unknown>>(res: McpToolResult): T {
  return res.structuredContent as T;
}
const savingsId = 'f1000003-0000-4000-8000-000000000002';
const excludedCardId = 'f1000003-0000-4000-8000-000000000003';
const foodId = 'f1000002-0000-4000-8000-000000000101';
const transportId = 'f1000002-0000-4000-8000-000000000102';
const statementId = 'f1000006-0000-4000-8000-000000000001';

beforeAll(async () => {
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
    [userId, 'Test User', 'test@hominem.dev', true],
  );

  await db
    .insertInto('app.financeAccounts')
    .values([
      {
        id: checkingId,
        userId,
        name: 'Checking',
        accountType: 'checking',
        currencyCode: 'USD',
        lifecycleStatus: 'open',
        includeInNetWorth: true,
        isActive: true,
        metadata: {},
      },
      {
        id: savingsId,
        userId,
        name: 'Old Savings',
        accountType: 'savings',
        currencyCode: 'USD',
        lifecycleStatus: 'closed',
        includeInNetWorth: true,
        isActive: false,
        metadata: {},
      },
      {
        id: excludedCardId,
        userId,
        name: 'Excluded Card',
        accountType: 'credit_card',
        currencyCode: 'USD',
        lifecycleStatus: 'open',
        includeInNetWorth: false,
        isActive: true,
        metadata: {},
      },
    ] satisfies Insertable<AppFinanceAccounts>[])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.financeCategories')
    .values([
      { id: foodId, userId, name: 'Food & Drink' },
      { id: transportId, userId, name: 'Transport' },
    ] satisfies Insertable<AppFinanceCategories>[])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  await db
    .insertInto('app.financeStatementPeriods')
    .values([
      {
        id: statementId,
        userId,
        accountId: checkingId,
        periodStartOn: '0001-01-01',
        periodEndOn: '2026-06-30',
        openingBalance: 0,
        closingBalance: 1000.0,
        certificationStatus: 'uncertified',
      },
    ] satisfies Insertable<AppFinanceStatementPeriods>[])
    .onConflict((oc) => oc.column('id').doNothing())
    .execute();

  const entries: Array<
    [string, string, string, number, string, string, string | null, boolean]
  > = [
    [checkingId, '2026-07-01', 'Grocery Store', -50.0, 'debit', 'fp-1', foodId, false],
    [checkingId, '2026-07-05', 'Gas Station', -25.0, 'debit', 'fp-2', transportId, false],
    [checkingId, '2026-07-10', 'Paycheck', 2000.0, 'credit', 'fp-3', null, false],
    [checkingId, '2026-07-11', 'Transfer to Savings', -100.0, 'transfer', 'fp-4', null, false],
    [checkingId, '2026-07-12', 'Pending Coffee', -4.5, 'debit', 'fp-5', foodId, false],
    [checkingId, '2026-07-13', 'Excluded Reimbursement', -10.0, 'adjustment', 'fp-6', foodId, true],
  ];

  for (let i = 0; i < entries.length; i++) {
    const [acctId, postedOn, desc, amount, txType, extId, catId, excl] = entries[i];
    await db
      .insertInto('app.financeTransactions')
      .values({
        id: `f1000004-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
        userId,
        accountId: acctId,
        postedOn,
        description: desc,
        amount,
        currencyCode: 'USD',
        transactionType: txType,
        pending: desc === 'Pending Coffee',
        externalId: extId,
        categoryId: catId,
        categoryAssignmentSource: 'source',
        excluded: excl,
        providerPayload: {},
      } satisfies Insertable<AppFinanceTransactions>)
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();
  }
});

describe('finance_net_worth', () => {
  it('adds posted transaction activity since the latest statement to compute balances', async () => {
    await import('./finance');
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'finance_net_worth', {
      includeClosed: false,
    });

    expect(result.structuredContent).toBeTruthy();
    const data = resultContent<NetWorthResult>(result);

    expect(data.warnings).toEqual([]);
    expect(data.accounts).toHaveLength(1);
    expect(data.accounts[0]).toMatchObject({
      name: 'Checking',
      balanceSource: 'statement+ledger',
    });
    expect(data.totals).toEqual([
      { currencyCode: 'USD', totalCents: expect.any(Number), accountCount: 1 },
    ]);
  });

  it('excludes closed accounts unless requested', async () => {
    const { callTool } = await import('../tools');

    const withoutClosed = await callTool(userId, 'finance_net_worth', {
      includeClosed: false,
    });
    expect(resultContent<NetWorthResult>(withoutClosed).accounts.map((a) => a.name)).toEqual([
      'Checking',
    ]);

    const withClosed = await callTool(userId, 'finance_net_worth', {
      includeClosed: true,
    });
    const names = resultContent<NetWorthResult>(withClosed)
      .accounts.map((a) => a.name)
      .sort();
    expect(names).toEqual(['Checking', 'Old Savings']);
  });
});

describe('finance_recent_transactions', () => {
  it('returns posted transactions only, newest first, with category names', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'finance_recent_transactions', {
      limit: 20,
    });

    expect(resultContent<RecentTransactionsResult>(result).count).toBe(5);
    const descriptions = resultContent<RecentTransactionsResult>(result).transactions.map(
      (t) => t.description,
    );
    expect(descriptions).toEqual([
      'Excluded Reimbursement',
      'Transfer to Savings',
      'Paycheck',
      'Gas Station',
      'Grocery Store',
    ]);

    const grocery = resultContent<RecentTransactionsResult>(result).transactions.find(
      (t) => t.description === 'Grocery Store',
    );
    expect(grocery).toMatchObject({
      categoryName: 'Food & Drink',
      amountCents: -5000,
      excluded: false,
    });

    const pending = resultContent<RecentTransactionsResult>(result).transactions.find(
      (t) => t.description === 'Pending Coffee',
    );
    expect(pending).toBeUndefined();
  });
});

describe('finance_spending_by_category', () => {
  it('sums posted, non-excluded, non-transfer spending by category', async () => {
    const { callTool } = await import('../tools');

    const result = await callTool(userId, 'finance_spending_by_category', {
      from: '2026-06-30',
      to: '2026-07-20',
    });

    expect(resultContent<SpendingByCategoryResult>(result).currencyCode).toBe('USD');
    expect(resultContent<SpendingByCategoryResult>(result).warnings).toEqual([]);
    expect(resultContent<SpendingByCategoryResult>(result).categories).toHaveLength(2);
    expect(resultContent<SpendingByCategoryResult>(result).categories[0]).toEqual({
      categoryId: foodId,
      categoryName: 'Food & Drink',
      spentCents: 5000,
      transactionCount: 1,
    });
    expect(resultContent<SpendingByCategoryResult>(result).categories[1]).toEqual({
      categoryId: transportId,
      categoryName: 'Transport',
      spentCents: 2500,
      transactionCount: 1,
    });
  });
});
