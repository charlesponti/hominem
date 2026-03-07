import crypto from 'node:crypto';

import { db, sql } from '@hominem/db';
import {
  createDeterministicIdFactory,
  ensureIntegrationUsers,
  isIntegrationDatabaseAvailable,
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
} from './finance';

const dbAvailable = await isIntegrationDatabaseAvailable();
const nextUserId = createDeterministicIdFactory('finance.plaid.integration');

async function hasPlaidItemsTable(): Promise<boolean> {
  const result = await db.execute(sql`
    select to_regclass('public.plaid_items') as relation_name
  `);
  const rows = Array.isArray(result)
    ? result
    : result && typeof result === 'object' && 'rows' in result
      ? ((result as { rows?: Array<{ relation_name: string | null }> }).rows ?? [])
      : [];
  return Boolean(rows[0]?.relation_name);
}

describe.skipIf(!dbAvailable)('finance plaid integration', () => {
  let ownerId: string;
  let otherUserId: string;

  const cleanupUser = async (userId: string): Promise<void> => {
    await db.execute(sql`delete from plaid_items where user_id = ${userId}`).catch(() => {});
    await db.execute(sql`delete from users where id = ${userId}`).catch(() => {});
  };

  beforeEach(async () => {
    expect(await hasPlaidItemsTable()).toBe(true);

    ownerId = nextUserId();
    otherUserId = nextUserId();

    await cleanupUser(ownerId);
    await cleanupUser(otherUserId);
    await ensureIntegrationUsers([
      { id: ownerId, name: 'Finance Plaid User' },
      { id: otherUserId, name: 'Finance Plaid User' },
    ]);
  });

  it('upserts and fetches plaid items by all lookup keys', async () => {
    const itemId = `item-${crypto.randomUUID()}`;

    const created = await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      itemId,
      institutionId: null,
      transactionsCursor: 'cursor-1',
      accessToken: 'token-1',
    });

    const byUserItem = await getPlaidItemByUserAndItemId(ownerId, itemId);
    expect(byUserItem?.id).toBe(created.id);
    expect(byUserItem?.transactionsCursor).toBe('cursor-1');

    const byId = await getPlaidItemById(created.id, ownerId);
    expect(byId?.itemId).toBe(itemId);

    const byItemId = await getPlaidItemByItemId(itemId);
    expect(byItemId?.id).toBe(created.id);

    const updated = await upsertPlaidItem({
      id: created.id,
      userId: ownerId,
      itemId,
      institutionId: null,
      transactionsCursor: 'cursor-2',
      accessToken: 'token-2',
    });
    expect(updated.id).toBe(created.id);
    expect(updated.transactionsCursor).toBe('cursor-2');
  });

  it('enforces owner guard and updates plaid status fields', async () => {
    const created = await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      itemId: 'item-guarded',
      institutionId: null,
      transactionsCursor: null,
      accessToken: null,
    });

    const deniedOwnerStatus = await updatePlaidItemStatusById(created.id, otherUserId, 'syncing');
    expect(deniedOwnerStatus).toBe(false);

    const allowedStatusById = await updatePlaidItemStatusById(created.id, ownerId, 'syncing');
    expect(allowedStatusById).toBe(true);

    const allowedStatusByItem = await updatePlaidItemStatusByItemId(
      ownerId,
      'item-guarded',
      'healthy',
    );
    expect(allowedStatusByItem).toBe(true);

    const cursorUpdated = await updatePlaidItemCursor(created.id, 'cursor-next');
    expect(cursorUpdated).toBe(true);

    const syncUpdated = await updatePlaidItemSyncStatus(created.id, 'success', null);
    expect(syncUpdated).toBe(true);

    const errorUpdated = await updatePlaidItemError(created.id, 'none');
    expect(errorUpdated).toBe(true);

    const fetched = await getPlaidItemById(created.id, ownerId);
    expect(fetched?.transactionsCursor).toBe('cursor-next');
  });

  it('deletes plaid items with owner scope and idempotent behavior', async () => {
    const created = await upsertPlaidItem({
      id: crypto.randomUUID(),
      userId: ownerId,
      itemId: 'item-delete',
      institutionId: null,
      transactionsCursor: null,
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
