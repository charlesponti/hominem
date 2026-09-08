import { ensureIntegrationUsers, isIntegrationDatabaseAvailable } from '@hominem/db/test/utils';
import { createDeterministicIdFactory } from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { createAccount, insertTransaction } from './index';
import {
  getAccountLedgerBreakdown,
  getReconciliationStaleness,
  postReconciliationAdjustment,
} from './reconcile';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.reconcile.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance reconcile integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerAccountId: string;

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Reconcile User' },
      { id: otherUserId, name: 'Finance Reconcile User' },
    ]);

    const account = await createAccount({
      userId: ownerId,
      name: 'Checking',
      accountType: 'checking',
    });
    ownerAccountId = account.id;

    await insertTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -100,
      description: 'Groceries',
      postedOn: '2026-01-10',
    });
  });

  it('posts a plug that closes the gap exactly, then reports reconciled', async () => {
    const posted = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -90,
      date: '2026-02-01',
    });

    expect(posted.ledgerSumBefore).toBe(-100);
    expect(posted.plug).toBe(10);
    expect(posted.alreadyReconciled).toBe(false);
    expect(posted.committed).toBe(true);
    expect(posted.transactionId).not.toBeNull();

    const again = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -90,
      date: '2026-02-02',
    });
    expect(again.alreadyReconciled).toBe(true);
    expect(again.committed).toBe(false);
    expect(again.plug).toBe(0);
  });

  it('rejects a second same-day adjustment without force', async () => {
    await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -90,
      date: '2026-02-01',
    });

    await expect(
      postReconciliationAdjustment({
        userId: ownerId,
        accountId: ownerAccountId,
        targetBalance: -80,
        date: '2026-02-01',
      }),
    ).rejects.toThrow(/already exists/);

    const forced = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -80,
      date: '2026-02-01',
      force: true,
    });
    expect(forced.committed).toBe(true);
    expect(forced.plug).toBe(10);
  });

  it('measures the plug as of the reading date, ignoring later rows', async () => {
    // Ledger: -100 on 01-10. Reading on 02-01 says -90, so the plug is +10.
    const posted = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -90,
      date: '2026-02-01',
    });
    expect(posted.plug).toBe(10);
    expect(posted.committed).toBe(true);

    // A transaction after the reading date must not change the 02-01 gap.
    await insertTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -50,
      description: 'Later spend',
      postedOn: '2026-03-01',
    });

    const current = await getAccountLedgerBreakdown(ownerId, ownerAccountId);
    expect(current?.balance).toBe(-140);

    // Same reading again on 02-01 is already reconciled — no second plug.
    const again = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -90,
      date: '2026-02-01',
    });
    expect(again.alreadyReconciled).toBe(true);
    expect(again.committed).toBe(false);

    // A fresh reading on 03-15 plugs only the post-02-01 delta.
    const fresh = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -140,
      date: '2026-03-15',
    });
    expect(fresh.alreadyReconciled).toBe(true);
  });

  it('lists never-reconciled accounts first with ledger balances', async () => {
    const stale = await createAccount({
      userId: ownerId,
      name: 'Savings',
      accountType: 'savings',
    });

    await postReconciliationAdjustment({
      userId: ownerId,
      accountId: ownerAccountId,
      targetBalance: -90,
      date: '2026-02-01',
    });

    const staleness = await getReconciliationStaleness(ownerId);
    expect(staleness.map((entry) => entry.accountName)).toEqual(['Savings', 'Checking']);
    expect(staleness[0]).toMatchObject({
      accountId: stale.id,
      balance: 0,
      lastReconciled: null,
    });
    expect(staleness[1]).toMatchObject({
      accountId: ownerAccountId,
      balance: -90,
      lastReconciled: '2026-02-01',
    });
  });

  it('breaks one account down by description with sign splits', async () => {
    await insertTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: 40,
      description: 'Refund',
      postedOn: '2026-01-12',
    });
    await insertTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -25,
      description: 'Groceries',
      postedOn: '2026-01-13',
    });

    const breakdown = await getAccountLedgerBreakdown(ownerId, ownerAccountId);
    expect(breakdown?.accountName).toBe('Checking');
    expect(breakdown?.balance).toBe(-85);
    expect(breakdown?.rows).toEqual([
      {
        description: 'Groceries',
        count: 2,
        positiveCount: 0,
        negativeCount: 2,
        signedSum: -125,
        absSum: 125,
      },
      {
        description: 'Refund',
        count: 1,
        positiveCount: 1,
        negativeCount: 0,
        signedSum: 40,
        absSum: 40,
      },
    ]);
  });

  it('rejects accounts outside the current user', async () => {
    await expect(
      postReconciliationAdjustment({
        userId: otherUserId,
        accountId: ownerAccountId,
        targetBalance: 0,
      }),
    ).rejects.toThrow(/not found/);

    expect(await getAccountLedgerBreakdown(otherUserId, ownerAccountId)).toBeNull();
    expect(await getReconciliationStaleness(otherUserId)).toEqual([]);
  });

  it('warns when a credit card target uses the displayed sign', async () => {
    const card = await createAccount({
      userId: ownerId,
      name: 'Card',
      accountType: 'credit_card',
    });

    const result = await postReconciliationAdjustment({
      userId: ownerId,
      accountId: card.id,
      targetBalance: 500,
      date: '2026-02-01',
    });

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('money-out-negative');
    expect(result.plug).toBe(500);
  });

  it('rejects malformed dates', async () => {
    await expect(
      postReconciliationAdjustment({
        userId: ownerId,
        accountId: ownerAccountId,
        targetBalance: 0,
        date: '02/01/2026',
      }),
    ).rejects.toThrow(/YYYY-MM-DD/);
  });
});
