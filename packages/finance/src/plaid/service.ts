import crypto from 'node:crypto';

import { db } from '@hominem/db';

import type { PlaidItem } from '../lib/types';
import { toIsoStringOrNull } from '../lib/utils';

function rowToPlaidItem(row: {
  id: string;
  owner_user_id: string;
  provider_item_id: string;
  institution_id: string | null;
  cursor: string | null;
  access_token_encrypted: string | null;
  status: string | null;
  last_synced_at: Date | null;
}): PlaidItem {
  return {
    id: row.id,
    userId: row.owner_user_id,
    itemId: row.provider_item_id,
    institutionId: row.institution_id,
    transactionsCursor: row.cursor,
    accessToken: row.access_token_encrypted,
    status: row.status,
    lastSyncedAt: toIsoStringOrNull(row.last_synced_at),
  };
}

export async function listPlaidConnectionsForUser(userId: string): Promise<PlaidItem[]> {
  const result = await db
    .selectFrom('app.plaid_items')
    .selectAll()
    .where('owner_user_id', '=', userId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute();

  return result.map((row) =>
    rowToPlaidItem(
      row as {
        id: string;
        owner_user_id: string;
        provider_item_id: string;
        institution_id: string | null;
        cursor: string | null;
        access_token_encrypted: string | null;
        status: string | null;
        last_synced_at: Date | null;
      },
    ),
  );
}

export async function getPlaidItemByUserAndItemId(
  userId: string,
  itemId: string,
): Promise<PlaidItem | null> {
  const result = await db
    .selectFrom('app.plaid_items')
    .selectAll()
    .where('owner_user_id', '=', userId)
    .where('provider_item_id', '=', itemId)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    return null;
  }
  return rowToPlaidItem(
    row as {
      id: string;
      owner_user_id: string;
      provider_item_id: string;
      institution_id: string | null;
      cursor: string | null;
      access_token_encrypted: string | null;
      status: string | null;
      last_synced_at: Date | null;
    },
  );
}

export async function getPlaidItemById(id: string, userId?: string): Promise<PlaidItem | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.plaid_items')
      .selectAll()
      .where('id', '=', id)
      .where('owner_user_id', '=', userId)
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    if (!row) {
      return null;
    }
    return rowToPlaidItem(
      row as {
        id: string;
        owner_user_id: string;
        provider_item_id: string;
        institution_id: string | null;
        cursor: string | null;
        access_token_encrypted: string | null;
        status: string | null;
        last_synced_at: Date | null;
      },
    );
  }

  const result = await db
    .selectFrom('app.plaid_items')
    .selectAll()
    .where('id', '=', id)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    return null;
  }
  return rowToPlaidItem(
    row as {
      id: string;
      owner_user_id: string;
      provider_item_id: string;
      institution_id: string | null;
      cursor: string | null;
      access_token_encrypted: string | null;
      status: string | null;
      last_synced_at: Date | null;
    },
  );
}

export async function getPlaidItemByItemId(itemId: string): Promise<PlaidItem | null> {
  const result = await db
    .selectFrom('app.plaid_items')
    .selectAll()
    .where('provider_item_id', '=', itemId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    return null;
  }
  return rowToPlaidItem(
    row as {
      id: string;
      owner_user_id: string;
      provider_item_id: string;
      institution_id: string | null;
      cursor: string | null;
      access_token_encrypted: string | null;
      status: string | null;
      last_synced_at: Date | null;
    },
  );
}

export async function upsertPlaidItem(
  input: PlaidItem & { accessToken?: string | null },
): Promise<PlaidItem> {
  const existingResult = await db
    .selectFrom('app.plaid_items')
    .selectAll()
    .where('provider_item_id', '=', input.itemId)
    .where('owner_user_id', '=', input.userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;

  if (existing) {
    const updatedResult = await db
      .updateTable('app.plaid_items')
      .set({
        institution_id: input.institutionId ?? null,
        cursor: input.transactionsCursor ?? null,
        access_token_encrypted: input.accessToken ?? null,
        status: input.status ?? 'healthy',
        last_synced_at: input.lastSyncedAt ? new Date(input.lastSyncedAt) : null,
        updated_at: new Date(),
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();
    const updated = updatedResult ?? null;
    if (!updated) {
      throw new Error('Failed to update plaid item');
    }
    return rowToPlaidItem(
      updated as {
        id: string;
        owner_user_id: string;
        provider_item_id: string;
        institution_id: string | null;
        cursor: string | null;
        access_token_encrypted: string | null;
        status: string | null;
        last_synced_at: Date | null;
      },
    );
  }

  const createdResult = await db
    .insertInto('app.plaid_items')
    .values({
      id: input.id ?? crypto.randomUUID(),
      owner_user_id: input.userId,
      provider_item_id: input.itemId,
      institution_id: input.institutionId ?? null,
      cursor: input.transactionsCursor ?? null,
      access_token_encrypted: input.accessToken ?? null,
      status: input.status ?? 'healthy',
      last_synced_at: input.lastSyncedAt ? new Date(input.lastSyncedAt) : null,
    })
    .returningAll()
    .executeTakeFirst();
  const created = createdResult ?? null;
  if (!created) {
    throw new Error('Failed to create plaid item');
  }
  return rowToPlaidItem(
    created as {
      id: string;
      owner_user_id: string;
      provider_item_id: string;
      institution_id: string | null;
      cursor: string | null;
      access_token_encrypted: string | null;
      status: string | null;
      last_synced_at: Date | null;
    },
  );
}

export async function updatePlaidItemStatusByItemId(
  userId: string,
  itemId: string,
  status: string,
): Promise<boolean> {
  const result = await db
    .updateTable('app.plaid_items')
    .set({
      status,
      updated_at: new Date(),
    })
    .where('owner_user_id', '=', userId)
    .where('provider_item_id', '=', itemId)
    .executeTakeFirst();
  return (result?.numUpdatedRows ?? 0n) > 0n;
}

export async function updatePlaidItemStatusById(
  id: string,
  userId: string,
  status: string,
): Promise<boolean> {
  const result = await db
    .updateTable('app.plaid_items')
    .set({
      status,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();
  return (result?.numUpdatedRows ?? 0n) > 0n;
}

export async function updatePlaidItemCursor(id: string, cursor: string | null): Promise<boolean> {
  const result = await db
    .updateTable('app.plaid_items')
    .set({
      cursor,
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return (result?.numUpdatedRows ?? 0n) > 0n;
}

export async function updatePlaidItemSyncStatus(
  id: string,
  status: string,
  _error?: string | null,
): Promise<boolean> {
  const result = await db
    .updateTable('app.plaid_items')
    .set({
      status,
      last_synced_at: new Date(),
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return (result?.numUpdatedRows ?? 0n) > 0n;
}

export async function updatePlaidItemError(id: string, _error: string | null): Promise<boolean> {
  const result = await db
    .updateTable('app.plaid_items')
    .set({
      updated_at: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return (result?.numUpdatedRows ?? 0n) > 0n;
}

export async function deletePlaidItem(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('app.plaid_items')
      .where('id', '=', id)
      .where('owner_user_id', '=', userId)
      .executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  const result = await db.deleteFrom('app.plaid_items').where('id', '=', id).executeTakeFirst();
  return (result?.numDeletedRows ?? 0n) > 0n;
}
