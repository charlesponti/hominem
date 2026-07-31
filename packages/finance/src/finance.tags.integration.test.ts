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
} from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

async function _hasTaggingTables(): Promise<boolean> {
  const hasTagsTable = await tableExists('app.tags');
  const hasTaggedItemsTable = await tableExists('app.tag_assignments');
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

  beforeEach(async () => {
    ownerId = nextUserId();
    otherUserId = nextUserId();
    ownerFoodTagId = nextTagId();
    ownerTravelTagId = nextTagId();
    otherTagId = nextTagId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Tags User' },
      { id: otherUserId, name: 'Finance Tags User' },
    ]);

    await sql`
      insert into app.tags (id, owner_userid, name, slug, path)
      values
        (${ownerFoodTagId}, ${ownerId}, ${'food'}, ${'food'}, ${'food'}),
        (${ownerTravelTagId}, ${ownerId}, ${'travel'}, ${'travel'}, ${'travel'}),
        (${otherTagId}, ${otherUserId}, ${'foreign-tag'}, ${'foreign-tag'}, ${'foreign-tag'})
    `.execute(db);

    const account = await createAccount({
      userId: ownerId,
      name: 'Tag Checking',
      accountType: 'depository',
      currentBalance: 1000,
    });
    ownerAccountId = account.id;

    const txOne = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -25,
      description: 'Lunch',
      postedOn: '2026-03-01',
    });
    const txTwo = await createTransaction({
      userId: ownerId,
      accountId: ownerAccountId,
      amount: -60,
      description: 'Flight',
      postedOn: '2026-03-02',
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
