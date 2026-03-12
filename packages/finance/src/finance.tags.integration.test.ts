import { db, sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
  tableExists,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createAccount,
  createTransaction,
  getTransactionTagIds,
  queryTransactionsByContract,
  replaceTransactionTags,
} from './finance';

async function _hasTaggingTables(): Promise<boolean> {
  const hasTagsTable = await tableExists('tags');
  const hasTaggedItemsTable = await tableExists('tagged_items');
  return hasTagsTable && hasTaggedItemsTable;
}

const nextUserId = createDeterministicIdFactory('finance.tags.integration');
const nextTagId = createDeterministicIdFactory('finance.tags.integration.tag');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

describeIntegration('finance tags integration', () => {
  let ownerId: string;
  let otherUserId: string;
  let ownerAccountId: string;
  let txOneId: string;
  let txTwoId: string;
  let ownerFoodTagId: string;
  let ownerTravelTagId: string;
  let otherTagId: string;

  const cleanupUser = async (userId: string): Promise<void> => {
    await db
      .execute(sql`
      delete from tagged_items
      where entity_type = ${'finance_transaction'}
        and entity_id in (select id from finance_transactions where user_id = ${userId})
    `)
      .catch(() => {});
    await db
      .execute(sql`delete from finance_transactions where user_id = ${userId}`)
      .catch(() => {});
    await db.execute(sql`delete from finance_accounts where user_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from tags where owner_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {});
  };

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();
    ownerFoodTagId = nextTagId();
    ownerTravelTagId = nextTagId();
    otherTagId = nextTagId();

    await cleanupUser(ownerId);
    await cleanupUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Tags User' },
      { id: otherUserId, name: 'Finance Tags User' },
    ]);

    await db.execute(sql`
      insert into tags (id, owner_id, name)
      values
        (${ownerFoodTagId}, ${ownerId}, ${'food'}),
        (${ownerTravelTagId}, ${ownerId}, ${'travel'}),
        (${otherTagId}, ${otherUserId}, ${'foreign-tag'})
    `);

    const account = await createAccount({
      userId: ownerId,
      name: 'Tag Checking',
      type: 'depository',
      balance: 1000,
    });
    ownerAccountId = account.id;

    const txOne = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -25,
      description: 'Lunch',
      date: '2026-03-01',
    });
    const txTwo = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -60,
      description: 'Flight',
      date: '2026-03-02',
    });
    txOneId = txOne.id;
    txTwoId = txTwo.id;
  });

  it('replaces transaction tags idempotently and filters transactions by tag', async () => {
    await replaceTransactionTags(txOneId, ownerId, [ownerFoodTagId]);
    await replaceTransactionTags(txTwoId, ownerId, [ownerTravelTagId]);

    const foodFiltered = await queryTransactionsByContract({
      userId: ownerId,
      tagIds: [ownerFoodTagId],
      limit: 10,
      offset: 0,
    });
    expect(foodFiltered).toHaveLength(1);
    expect(foodFiltered[0]?.id).toBe(txOneId);

    const travelFiltered = await queryTransactionsByContract({
      userId: ownerId,
      tagNames: ['travel'],
      limit: 10,
      offset: 0,
    });
    expect(travelFiltered).toHaveLength(1);
    expect(travelFiltered[0]?.id).toBe(txTwoId);

    await replaceTransactionTags(txOneId, ownerId, [ownerFoodTagId, ownerFoodTagId]);
    const txOneTags = await getTransactionTagIds(txOneId, ownerId);
    expect(txOneTags).toEqual([ownerFoodTagId]);
  });

  it('rejects cross-tenant tags on transaction tagging', async () => {
    await expect(replaceTransactionTags(txOneId, ownerId, [otherTagId])).rejects.toThrow(
      'One or more tags are invalid for this user',
    );
  });
});
