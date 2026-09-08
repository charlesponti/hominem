import crypto from 'node:crypto';

import { db } from '@hominem/db/core';
import { sql } from '@hominem/db/core';
import { ensureIntegrationUsers, isIntegrationDatabaseAvailable } from '@hominem/db/test/utils';
import { createDeterministicIdFactory } from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { createAccount } from './index';
import { computeLedgerRunway } from './runway';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.runway.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance runway integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let checkingId: string;

  async function seedTransaction(input: {
    accountId: string;
    userId?: string;
    amount: number;
    transactionType: string;
    description: string;
    postedOn: string;
    recurring?: boolean;
    excluded?: boolean;
  }): Promise<void> {
    await sql`
      insert into app.finance_transactions (
        id, user_id, account_id, amount, transaction_type, description, posted_on, recurring, excluded
      )
      values (
        ${crypto.randomUUID()},
        ${input.userId ?? ownerId},
        ${input.accountId},
        ${input.amount},
        ${input.transactionType},
        ${input.description},
        ${input.postedOn},
        ${input.recurring ?? false},
        ${input.excluded ?? false}
      )
    `.execute(db);
  }

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Runway User' },
      { id: otherUserId, name: 'Finance Runway User' },
    ]);

    const checking = await createAccount({
      userId: ownerId,
      name: 'Checking',
      accountType: 'checking',
    });
    checkingId = checking.id;
    const savings = await createAccount({
      userId: ownerId,
      name: 'Savings',
      accountType: 'savings',
    });
    const card = await createAccount({
      userId: ownerId,
      name: 'Card',
      accountType: 'credit_card',
    });

    await seedTransaction({
      accountId: checkingId,
      amount: 2000,
      transactionType: 'credit',
      description: 'Paycheck',
      postedOn: '2026-03-15',
    });
    await seedTransaction({
      accountId: savings.id,
      amount: 500,
      transactionType: 'credit',
      description: 'Transfer in',
      postedOn: '2026-02-01',
    });
    await seedTransaction({
      accountId: card.id,
      amount: -300,
      transactionType: 'debit',
      description: 'Spending',
      postedOn: '2026-03-01',
    });

    await seedTransaction({
      accountId: checkingId,
      amount: -100,
      transactionType: 'debit',
      description: 'StreamCo',
      postedOn: '2026-01-05',
      recurring: true,
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -70,
      transactionType: 'debit',
      description: 'StreamCo',
      postedOn: '2026-02-05',
      recurring: true,
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -70,
      transactionType: 'debit',
      description: 'StreamCo',
      postedOn: '2026-03-05',
      recurring: true,
    });
  });

  it('sums starting cash over liquid types and projects weekly burn', async () => {
    const result = await computeLedgerRunway({
      userId: ownerId,
      monthlyBudgets: [
        { category: 'Groceries', amount: 200 },
        { category: 'Dining', amount: 100, note: 'cap' },
      ],
      projectionWeeks: 2,
      asOf: '2026-04-01',
    });

    expect(result.asOfDate).toBe('2026-04-01');
    expect(result.liquidAccounts).toEqual([
      { accountName: 'Checking', balance: 1760 },
      { accountName: 'Savings', balance: 500 },
    ]);
    expect(result.startingCash).toBe(2260);
    expect(result.weeklyRecurringOutflow).toBe(18.4);
    expect(result.recurringTxnCount).toBe(3);
    expect(result.weeklyVariableAllowance).toBe(68.99);
    expect(result.weeks).toHaveLength(2);
    expect(result.weeks[0]).toMatchObject({
      week: 1,
      weekStart: '2026-04-01',
      weekEnd: '2026-04-07',
      beginningCash: 2260,
      recurringOutflows: 18.4,
      variableAllowance: 68.99,
      netChange: -87.39,
      endingCash: 2172.61,
    });
    expect(result.weeks[1]).toMatchObject({
      week: 2,
      weekStart: '2026-04-08',
      weekEnd: '2026-04-14',
      beginningCash: 2172.61,
      endingCash: 2085.22,
    });
  });

  it('ignores adjustments, credits, out-of-window, and excluded rows in the recurring average', async () => {
    await seedTransaction({
      accountId: checkingId,
      amount: -50,
      transactionType: 'adjustment',
      description: 'Balance reconciliation adjustment',
      postedOn: '2026-02-10',
      recurring: true,
    });
    await seedTransaction({
      accountId: checkingId,
      amount: 30,
      transactionType: 'credit',
      description: 'Refund',
      postedOn: '2026-02-12',
      recurring: true,
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -60,
      transactionType: 'debit',
      description: 'StreamCo',
      postedOn: '2025-12-01',
      recurring: true,
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -60,
      transactionType: 'debit',
      description: 'StreamCo',
      postedOn: '2026-03-20',
      recurring: true,
      excluded: true,
    });

    const result = await computeLedgerRunway({
      userId: ownerId,
      monthlyBudgets: [],
      asOf: '2026-04-01',
    });

    expect(result.recurringTxnCount).toBe(3);
    expect(result.weeklyRecurringOutflow).toBe(18.4);
    expect(result.weeklyVariableAllowance).toBe(0);
  });

  it('scopes every input to the current user', async () => {
    const result = await computeLedgerRunway({
      userId: otherUserId,
      monthlyBudgets: [{ category: 'Groceries', amount: 200 }],
      projectionWeeks: 1,
      asOf: '2026-04-01',
    });

    expect(result.startingCash).toBe(0);
    expect(result.liquidAccounts).toEqual([]);
    expect(result.recurringTxnCount).toBe(0);
    expect(result.weeklyVariableAllowance).toBe(46);
    expect(result.weeks[0]?.endingCash).toBe(-46);
  });

  it('rejects invalid projection inputs', async () => {
    await expect(
      computeLedgerRunway({ userId: ownerId, monthlyBudgets: [], asOf: '04/01/2026' }),
    ).rejects.toThrow(/YYYY-MM-DD/);
    await expect(
      computeLedgerRunway({ userId: ownerId, monthlyBudgets: [], projectionWeeks: 0 }),
    ).rejects.toThrow(/positive integer/);
    await expect(
      computeLedgerRunway({
        userId: ownerId,
        monthlyBudgets: [{ category: 'Groceries', amount: -5 }],
      }),
    ).rejects.toThrow(/non-negative/);
  });
});
