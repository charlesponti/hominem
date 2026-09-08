import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  countOwnedAccounts,
  createAccount,
  createTransaction,
  deleteAccount,
  getAccountById,
  getAccountByPlaidId,
  listAccounts,
  listImportAccountSnapshots,
  updateAccount,
  upsertAccount,
} from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.accounts.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance accounts integration', () => {
  let ownerId: string;
  let otherUserId: string;

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance User' },
      { id: otherUserId, name: 'Finance User' },
    ]);
  });

  it('lists import snapshots with the resolution fields and counts owned accounts', async () => {
    const checking = await createAccount({
      userId: ownerId,
      name: 'Checking',
      accountType: 'depository',
      metadata: {},
    });
    const stranger = await createAccount({
      userId: otherUserId,
      name: 'Stranger',
      accountType: 'depository',
      metadata: {},
    });

    const snapshots = await listImportAccountSnapshots(ownerId);
    expect(snapshots).toEqual([
      {
        id: checking.id,
        name: 'Checking',
        mask: null,
        csvImportKey: null,
      },
    ]);

    expect(await countOwnedAccounts(ownerId, [checking.id])).toBe(1);
    expect(await countOwnedAccounts(ownerId, [checking.id, stranger.id])).toBe(1);
    expect(await countOwnedAccounts(ownerId, [])).toBe(0);
  });

  it('creates, lists, and fetches accounts, deriving balance from posted transactions', async () => {
    const created = await createAccount({
      userId: ownerId,
      name: 'Checking',
      accountType: 'depository',
    });

    expect(created.userId).toBe(ownerId);
    expect(created.name).toBe('Checking');
    expect(created.accountType).toBe('depository');
    expect(created.currentBalance).toBe(0);

    await createTransaction({
      userId: ownerId,
      accountId: created.id,
      amount: 2500.55,
    });

    const listed = await listAccounts(ownerId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(created.id);
    expect(Number(listed[0]?.currentBalance)).toBe(2500.55);

    const fetched = await getAccountById(created.id, ownerId);
    expect(fetched?.id).toBe(created.id);
    expect(Number(fetched?.currentBalance)).toBe(2500.55);
  });

  it('enforces owner scope for update and delete', async () => {
    const created = await createAccount({
      userId: ownerId,
      name: 'Protected',
      accountType: 'depository',
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
      accountType: 'credit',
      plaidAccountId: 'plaid-acc-1',
    });

    const second = await upsertAccount({
      userId: ownerId,
      name: 'Plaid Account Updated',
      accountType: 'credit',
      plaidAccountId: 'plaid-acc-1',
    });

    expect(first.id).toBe(second.id);
    expect(second.name).toBe('Plaid Account Updated');

    await createTransaction({
      userId: ownerId,
      accountId: second.id,
      amount: 20,
    });

    const byPlaid = await getAccountByPlaidId('plaid-acc-1', ownerId);
    expect(byPlaid?.id).toBe(first.id);
    expect(Number(byPlaid?.currentBalance)).toBe(20);
  });
});
