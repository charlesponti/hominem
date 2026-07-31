import crypto from 'node:crypto';

import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
  tableExists,
} from '@hominem/db/test/utils';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  deletePlaidItem,
  getPlaidItemById,
  getPlaidItemByItemId,
  getPlaidItemByUserAndItemId,
  upsertPlaidItem,
  updatePlaidItemCursor,
  updatePlaidItemError,
  updatePlaidItemStatusById,
  updatePlaidItemStatusByItemId,
  updatePlaidItemSyncStatus,
} from './index';
import { cleanupIntegrationFinanceUser } from './test-utils';

const nextUserId = createDeterministicIdFactory('finance.plaid.integration');
const describeIntegration = (await isIntegrationDatabaseAvailable()) ? describe : describe.skip;

async function hasPlaidItemsTable(): Promise<boolean> {
  return await tableExists('app.plaid_items');
}

describeIntegration('finance plaid integration', () => {
  let ownerId: string;
  let otherUserId: string;

  beforeEach(async () => {
    expect(await hasPlaidItemsTable()).toBe(true);

    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupIntegrationFinanceUser(ownerId);
    await cleanupIntegrationFinanceUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Plaid User' },
      { id: otherUserId, name: 'Finance Plaid User' },
    ]);
  });

  it('upserts and fetches plaid items by all lookup keys', async () => {
    const providerItemId = `item-${crypto.randomUUID()}`;

    const created = await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      providerItemId,
      institutionId: null,
      cursor: 'cursor-1',
      accessToken: 'token-1',
    });

    const byUserItem = await getPlaidItemByUserAndItemId(ownerId, providerItemId);
    expect(byUserItem?.id).toBe(created.id);
    expect(byUserItem?.cursor).toBe('cursor-1');

    const byId = await getPlaidItemById(created.id, ownerId);
    expect(byId?.providerItemId).toBe(providerItemId);

    const byItemId = await getPlaidItemByItemId(providerItemId);
    expect(byItemId?.id).toBe(created.id);

    const updated = await upsertPlaidItem({
      id: created.id,
      userId: ownerId,
      providerItemId,
      institutionId: null,
      cursor: 'cursor-2',
      accessToken: 'token-2',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.cursor).toBe('cursor-2');
  });

  it('enforces owner guard and updates plaid status fields', async () => {
    const providerItemId = `item-guarded-${crypto.randomUUID()}`;
    const created = await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      providerItemId,
      institutionId: null,
      cursor: null,
      accessToken: null,
    });

    const deniedOwnerStatus = await updatePlaidItemStatusById(
      created.id,
      otherUserId,
      'needs_attention',
    );
    expect(deniedOwnerStatus).toBe(false);

    const allowedStatusById = await updatePlaidItemStatusById(
      created.id,
      ownerId,
      'needs_attention',
    );
    expect(allowedStatusById).toBe(true);

    const allowedStatusByItem = await updatePlaidItemStatusByItemId(
      ownerId,
      providerItemId,
      'healthy',
    );
    expect(allowedStatusByItem).toBe(true);

    const cursorUpdated = await updatePlaidItemCursor(created.id, 'cursor-next');
    expect(cursorUpdated).toBe(true);

    const syncUpdated = await updatePlaidItemSyncStatus(created.id, 'healthy', null);
    expect(syncUpdated).toBe(true);

    const errorUpdated = await updatePlaidItemError(created.id, 'none');
    expect(errorUpdated).toBe(true);

    const fetched = await getPlaidItemById(created.id, ownerId);
    expect(fetched?.cursor).toBe('cursor-next');
  });

  it('deletes plaid items with owner scope and idempotent behavior', async () => {
    const providerItemId = `item-delete-${crypto.randomUUID()}`;
    const created = await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      providerItemId,
      institutionId: null,
      cursor: null,
      accessToken: null,
    });

    const deniedDelete = await deletePlaidItem(created.id, otherUserId);
    expect(deniedDelete).toBe(false);

    const allowedDelete = await deletePlaidItem(created.id, ownerId);
    expect(allowedDelete).toBe(true);

    const secondDelete = await deletePlaidItem(created.id, ownerId);
    expect(secondDelete).toBe(false);
  });
});
