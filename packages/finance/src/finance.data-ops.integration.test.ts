import crypto from 'node:crypto';

import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createAccount,
  createBudgetCategory,
  createTransaction,
  deleteUserFinanceData,
  exportFinanceData,
  replaceTransactionTags,
  upsertPlaidItem,
} from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.data-ops.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance data ops integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerAccountId: string;
  let otherAccountId: string;

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance DataOps User' },
      { id: otherUserId, name: 'Finance DataOps User' },
    ]);

    const ownerAccount = await createAccount({
      userId: ownerId,
      name: 'Owner Checking',
      accountType: 'depository',
      currentBalance: 1500,
    });
    ownerAccountId = ownerAccount.id;

    const otherAccount = await createAccount({
      userId: otherUserId,
      name: 'Other Checking',
      accountType: 'depository',
      currentBalance: 2000,
    });
    otherAccountId = otherAccount.id;
  });

  it('exports only caller-scoped finance data', async () => {
    const ownerTag = await createBudgetCategory({
      ownerUserid: ownerId,
      name: `Food-${crypto.randomUUID().slice(0, 8)}`,
    });
    const ownerTx = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -42,
      description: 'Dinner',
      postedOn: '2026-03-03',
      merchantName: 'Cafe',
    });
    await replaceTransactionTags(ownerTx.id, ownerId, [ownerTag.id]);

    await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      providerItemId: `item-${crypto.randomUUID()}`,
      institutionId: null,
      cursor: 'cursor-1',
      accessToken: 'token-1',
    });

    await createTransaction({
      userId: otherUserId,
      accountId: otherAccountId,
      amount: -99,
      description: 'Other User Spend',
      postedOn: '2026-03-04',
      merchantName: 'Other',
    });

    const exported = await exportFinanceData(ownerId);

    expect(exported.accounts.length).toBe(1);
    expect(exported.accounts[0]?.userId).toBe(ownerId);
    expect(exported.transactions.length).toBe(1);
    expect(exported.transactions[0]?.userId).toBe(ownerId);
    expect(exported.tags.length).toBe(1);
    expect(exported.tags[0]?.ownerUserid).toBe(ownerId);
    expect(exported.plaidItems.length).toBe(1);
    expect(exported.plaidItems[0]?.userId).toBe(ownerId);
  });

  it('delete-all summary removes only caller-scoped data', async () => {
    const ownerTag = await createBudgetCategory({
      ownerUserid: ownerId,
      name: `Transit-${crypto.randomUUID().slice(0, 8)}`,
    });
    const ownerTx = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -30,
      description: 'Metro',
      postedOn: '2026-03-05',
      merchantName: 'Transit',
    });
    await replaceTransactionTags(ownerTx.id, ownerId, [ownerTag.id]);

    await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      providerItemId: `item-${crypto.randomUUID()}`,
      institutionId: null,
      cursor: null,
      accessToken: null,
    });

    await createTransaction({
      userId: otherUserId,
      accountId: otherAccountId,
      amount: -45,
      description: 'Other User Keep',
      postedOn: '2026-03-05',
      merchantName: 'Keep',
    });

    const summary = await deleteUserFinanceData(ownerId);
    expect(summary.deletedTransactions).toBeGreaterThanOrEqual(1);
    expect(summary.deletedAccounts).toBeGreaterThanOrEqual(1);
    expect(summary.deletedTaggedItems).toBeGreaterThanOrEqual(1);

    const ownerExport = await exportFinanceData(ownerId);
    expect(ownerExport.accounts).toHaveLength(0);
    expect(ownerExport.transactions).toHaveLength(0);
    expect(ownerExport.tags.length).toBeGreaterThanOrEqual(1);
    expect(ownerExport.plaidItems).toHaveLength(0);

    const otherExport = await exportFinanceData(otherUserId);
    expect(otherExport.accounts.length).toBeGreaterThanOrEqual(1);
    expect(otherExport.transactions.length).toBeGreaterThanOrEqual(1);
  });
});
