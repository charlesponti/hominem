import { db, sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  _isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createAccount,
  deleteAccount,
  getAccountById,
  getAccountByPlaidId,
  listAccounts,
  updateAccount,
  upsertAccount,
} from './finance';

const nextUserId = createDeterministicIdFactory('finance.accounts.integration');

describe('finance accounts integration', () => {
  let ownerId: string;
  let otherUserId: string;

  const cleanupUser = async (userId: string): Promise<void> => {
    await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {});
  };

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupUser(ownerId);
    await cleanupUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance User' },
      { id: otherUserId, name: 'Finance User' },
    ]);
  });

  it('creates, lists, and fetches accounts for owner', async () => {
    const created = await createAccount({
      userId: ownerId,
      name: 'Checking',
      type: 'depository',
      balance: 2500.55,
    });

    expect(created.userId).toBe(ownerId);
    expect(created.name).toBe('Checking');
    expect(created.type).toBe('depository');
    expect(created.balance).toBe(2500.55);

    const listed = await listAccounts(ownerId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);

    const fetched = await getAccountById(created.id, ownerId);
    expect(fetched?.id).toBe(created.id);
  });

  it('enforces owner scope for update and delete', async () => {
    const created = await createAccount({
      userId: ownerId,
      name: 'Protected',
      type: 'depository',
      balance: 100,
    });

    const deniedUpdate = await updateAccount({
      id: created.id,
      userId: otherUserId,
      name: 'Hijacked',
    });
    expect(deniedUpdate).toBeNull();

    const deniedDelete = await deleteAccount(created.id, otherUserId);
    expect(deniedDelete).toBe(false);

    const stillExists = await getAccountById(created.id, ownerId);
    expect(stillExists?.name).toBe('Protected');
  });

  it('upserts by plaidAccountId idempotently for same owner', async () => {
    const first = await upsertAccount({
      userId: ownerId,
      name: 'Plaid Account',
      type: 'credit',
      balance: 10,
      plaidAccountId: 'plaid-acc-1',
    });

    const second = await upsertAccount({
      userId: ownerId,
      name: 'Plaid Account Updated',
      type: 'credit',
      balance: 20,
      plaidAccountId: 'plaid-acc-1',
    });

    expect(first.id).toBe(second.id);
    expect(second.name).toBe('Plaid Account Updated');
    expect(second.balance).toBe(20);

    const byPlaid = await getAccountByPlaidId('plaid-acc-1', ownerId);
    expect(byPlaid?.id).toBe(first.id);
  });
});
