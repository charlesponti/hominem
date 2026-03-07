import crypto from 'node:crypto';

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
  deletePlaidTransaction,
  deleteTransaction,
  getTransactionByPlaidId,
  queryTransactions,
  updateTransaction,
} from './finance';

const dbAvailable = await isIntegrationDatabaseAvailable();
const nextUserId = createDeterministicIdFactory('finance.transactions.integration');

describe.skipIf(!dbAvailable)('modern-finance transactions integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerAccountId: string;

  const cleanupUser = async (userId: string): Promise<void> => {
    await db
      .execute(sql`delete from finance_transactions where user_id = ${userId}`)
      .catch(() => {});
    await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {});
  };

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupUser(ownerId);
    await cleanupUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Tx User' },
      { id: otherUserId, name: 'Finance Tx User' },
    ]);

    const account = await createAccount({
      userId: ownerId,
      name: 'Checking',
      type: 'depository',
      balance: 1000,
    });
    ownerAccountId = account.id;
  });

  it('creates and queries transactions with stable sort', async () => {
    const first = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: 20,
      description: 'Older',
      date: '2026-01-01',
    });

    const second = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: 10,
      description: 'Newer',
      date: '2026-02-01',
    });

    const ordered = await queryTransactions(ownerId);
    expect(ordered).toHaveLength(2);
    expect(ordered[0]?.id).toBe(second.id);
    expect(ordered[1]?.id).toBe(first.id);
  });

  it('enforces owner scope on update/delete', async () => {
    const created = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: 42,
      description: 'Protected tx',
      date: '2026-01-10',
    });

    const deniedUpdate = await updateTransaction(created.id, otherUserId, {
      description: 'hijacked',
    });
    expect(deniedUpdate).toBeNull();

    const deniedDelete = await deleteTransaction(created.id, otherUserId);
    expect(deniedDelete).toBe(false);

    const stillOwned = await queryTransactions(ownerId);
    expect(stillOwned).toHaveLength(1);
    expect(stillOwned[0]?.description).toBe('Protected tx');
  });

  it('supports plaid external id lookup and delete', async () => {
    await db.execute(sql`
      insert into finance_transactions (
        id, user_id, account_id, amount, transaction_type, description, date, external_id
      )
      values (
        ${crypto.randomUUID()},
        ${ownerId},
        ${ownerAccountId},
        ${15.25},
        ${'income'},
        ${'Plaid tx'},
        ${'2026-02-10'},
        ${'plaid-ext-1'}
      )
    `);

    const byPlaid = await getTransactionByPlaidId('plaid-ext-1', ownerId);
    expect(byPlaid).not.toBeNull();
    expect(byPlaid?.description).toBe('Plaid tx');

    const deleted = await deletePlaidTransaction('plaid-ext-1');
    expect(deleted).toBe(true);

    const afterDelete = await getTransactionByPlaidId('plaid-ext-1', ownerId);
    expect(afterDelete).toBeNull();
  });
});
