import crypto from 'node:crypto';

import { db } from '@hominem/db/core';
import { sql } from '@hominem/db/core';
import { ensureIntegrationUsers, isIntegrationDatabaseAvailable } from '@hominem/db/test/utils';
import { createDeterministicIdFactory } from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { findTransferPairs, getValidationGates } from './diagnostics';
import { createAccount } from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.diagnostics.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance diagnostics integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let checkingId: string;
  let savingsId: string;

  async function seedTransaction(input: {
    accountId: string;
    userId?: string;
    amount: number;
    transactionType: string;
    description: string | null;
    postedOn: string;
    categoryId?: string | null;
  }): Promise<void> {
    await sql`
      insert into app.finance_transactions (
        id, user_id, account_id, amount, transaction_type, description, posted_on, category_id
      )
      values (
        ${crypto.randomUUID()},
        ${input.userId ?? ownerId},
        ${input.accountId},
        ${input.amount},
        ${input.transactionType},
        ${input.description},
        ${input.postedOn},
        ${input.categoryId ?? null}
      )
    `.execute(db);
  }

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Diagnostics User' },
      { id: otherUserId, name: 'Finance Diagnostics User' },
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
    savingsId = savings.id;
    await createAccount({ userId: ownerId, name: 'Empty', accountType: 'cash' });
  });

  it('finds cross-account transfer pairs and excludes lookalikes', async () => {
    await seedTransaction({
      accountId: checkingId,
      amount: -500,
      transactionType: 'transfer',
      description: 'Transfer to savings',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: savingsId,
      amount: 500,
      transactionType: 'transfer',
      description: 'Transfer from checking',
      postedOn: '2026-03-02',
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -500,
      transactionType: 'debit',
      description: 'Big purchase',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -20,
      transactionType: 'transfer',
      description: 'Small hop',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: savingsId,
      amount: 20,
      transactionType: 'transfer',
      description: 'Small hop back',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -700,
      transactionType: 'transfer',
      description: 'Far leg out',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: savingsId,
      amount: 700,
      transactionType: 'transfer',
      description: 'Far leg in',
      postedOn: '2026-03-10',
    });

    const pairs = await findTransferPairs({ userId: ownerId });
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.absoluteAmount).toBe(500);
    expect(pairs[0]?.first).toMatchObject({
      accountName: 'Checking',
      postedOn: '2026-03-01',
      amount: -500,
    });
    expect(pairs[0]?.second).toMatchObject({
      accountName: 'Savings',
      postedOn: '2026-03-02',
      amount: 500,
    });

    const small = await findTransferPairs({ userId: ownerId, minAmount: 10 });
    expect(small.map((pair) => pair.absoluteAmount)).toEqual([500, 20]);

    await expect(findTransferPairs({ userId: ownerId, windowDays: -1 })).rejects.toThrow(
      /windowDays/,
    );
  });

  it('reports duplicates, sign violations, empty accounts, and coverage', async () => {
    await seedTransaction({
      accountId: checkingId,
      amount: -4.5,
      transactionType: 'debit',
      description: 'Coffee',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: checkingId,
      amount: -4.5,
      transactionType: 'debit',
      description: 'COFFEE',
      postedOn: '2026-03-01',
    });
    await seedTransaction({
      accountId: checkingId,
      amount: 50,
      transactionType: 'debit',
      description: 'Mis-signed',
      postedOn: '2026-03-02',
    });
    await seedTransaction({
      accountId: savingsId,
      amount: -25,
      transactionType: 'credit',
      description: 'Also mis-signed',
      postedOn: '2026-03-02',
    });
    await seedTransaction({
      accountId: savingsId,
      amount: -10,
      transactionType: 'debit',
      description: 'Clean',
      postedOn: '2026-03-03',
    });

    const gates = await getValidationGates(ownerId);
    expect(gates.totalTransactions).toBe(5);
    expect(gates.orphanTransactions).toBe(0);
    expect(gates.accountsWithNoTransactions).toEqual([
      { accountId: expect.any(String), accountName: 'Empty' },
    ]);
    expect(gates.duplicateGroupCount).toBe(1);
    expect(gates.duplicateGroups).toEqual([
      {
        accountId: checkingId,
        accountName: 'Checking',
        postedOn: '2026-03-01',
        absoluteAmount: 4.5,
        description: 'coffee',
        count: 2,
      },
    ]);
    expect(gates.signViolationCount).toBe(2);
    expect(gates.signViolations.map((entry) => entry.amount)).toEqual([50, -25]);
    expect(gates.uncategorizedTransactions).toBe(5);
  });

  it('scopes gates and pairs to the current user', async () => {
    await seedTransaction({
      accountId: checkingId,
      amount: 50,
      transactionType: 'debit',
      description: 'Mis-signed',
      postedOn: '2026-03-02',
    });
    const stranger = await createAccount({
      userId: otherUserId,
      name: 'Stranger',
      accountType: 'checking',
    });
    await seedTransaction({
      accountId: stranger.id,
      userId: otherUserId,
      amount: -25,
      transactionType: 'credit',
      description: 'Stranger violation',
      postedOn: '2026-03-02',
    });

    const ownerGates = await getValidationGates(ownerId);
    expect(ownerGates.signViolationCount).toBe(1);
    expect(ownerGates.signViolations.map((entry) => entry.amount)).toEqual([50]);

    const gates = await getValidationGates(otherUserId);
    expect(gates.totalTransactions).toBe(1);
    expect(gates.signViolationCount).toBe(1);
    expect(gates.signViolations.map((entry) => entry.amount)).toEqual([-25]);
    expect(await findTransferPairs({ userId: otherUserId })).toEqual([]);
  });
});
