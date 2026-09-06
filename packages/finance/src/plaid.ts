import crypto from 'node:crypto';

import { db } from '@hominem/db/core';
import type { Selectable } from '@hominem/db/core';
import type { AppPlaidItems } from '@hominem/db/types';

import { getAffectedRows } from './utils';

type PlaidItemRow = Selectable<AppPlaidItems>;

export async function listPlaidConnectionsForUser(userId: string): Promise<PlaidItemRow[]> {
  return db
    .selectFrom('app.plaidItems')
    .selectAll()
    .where('userId', '=', userId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'asc')
    .execute();
}

export async function getPlaidItemByUserAndItemId(
  userId: string,
  providerItemId: string,
): Promise<PlaidItemRow | null> {
  const result = await db
    .selectFrom('app.plaidItems')
    .selectAll()
    .where('userId', '=', userId)
    .where('providerItemId', '=', providerItemId)
    .limit(1)
    .executeTakeFirst();
  return result ?? null;
}

export async function getPlaidItemById(id: string, userId?: string): Promise<PlaidItemRow | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.plaidItems')
      .selectAll()
      .where('id', '=', id)
      .where('userId', '=', userId)
      .limit(1)
      .executeTakeFirst();
    return result ?? null;
  }

  const result = await db
    .selectFrom('app.plaidItems')
    .selectAll()
    .where('id', '=', id)
    .limit(1)
    .executeTakeFirst();
  return result ?? null;
}

export async function getPlaidItemByItemId(providerItemId: string): Promise<PlaidItemRow | null> {
  const result = await db
    .selectFrom('app.plaidItems')
    .selectAll()
    .where('providerItemId', '=', providerItemId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst();
  return result ?? null;
}

export async function upsertPlaidItem(
  input: Partial<PlaidItemRow> & { userId: string; providerItemId: string },
): Promise<PlaidItemRow> {
  const existingResult = await db
    .selectFrom('app.plaidItems')
    .selectAll()
    .where('providerItemId', '=', input.providerItemId)
    .where('userId', '=', input.userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;

  if (existing) {
    const updatedResult = await db
      .updateTable('app.plaidItems')
      .set({
        institutionId: input.institutionId ?? null,
        cursor: input.cursor ?? null,
        accessToken: input.accessToken ?? null,
        status: input.status ?? 'healthy',
        lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : null,
        updatedAt: new Date(),
      })
      .where('id', '=', existing.id)
      .returningAll()
      .executeTakeFirst();
    const updated = updatedResult ?? null;
    if (!updated) {
      throw new Error('Failed to update plaid item');
    }
    return updated;
  }

  const createdResult = await db
    .insertInto('app.plaidItems')
    .values({
      id: input.id ?? crypto.randomUUID(),
      userId: input.userId,
      providerItemId: input.providerItemId,
      institutionId: input.institutionId ?? null,
      cursor: input.cursor ?? null,
      accessToken: input.accessToken ?? null,
      status: input.status ?? 'healthy',
      lastSyncedAt: input.lastSyncedAt ? new Date(input.lastSyncedAt) : null,
    })
    .returningAll()
    .executeTakeFirst();
  const created = createdResult ?? null;
  if (!created) {
    throw new Error('Failed to create plaid item');
  }
  return created;
}

export async function updatePlaidItemStatusByItemId(
  userId: string,
  providerItemId: string,
  status: string,
): Promise<boolean> {
  const result = await db
    .updateTable('app.plaidItems')
    .set({
      status,
      updatedAt: new Date(),
    })
    .where('userId', '=', userId)
    .where('providerItemId', '=', providerItemId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemStatusById(
  id: string,
  userId: string,
  status: string,
): Promise<boolean> {
  const result = await db
    .updateTable('app.plaidItems')
    .set({
      status,
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .where('userId', '=', userId)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemCursor(id: string, cursor: string | null): Promise<boolean> {
  const result = await db
    .updateTable('app.plaidItems')
    .set({
      cursor,
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemSyncStatus(
  id: string,
  status: string,
  errorCode?: string | null,
): Promise<boolean> {
  const result = await db
    .updateTable('app.plaidItems')
    .set({
      status,
      errorCode: errorCode ?? null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function updatePlaidItemError(id: string, errorCode: string | null): Promise<boolean> {
  const result = await db
    .updateTable('app.plaidItems')
    .set({
      errorCode: errorCode ?? null,
      updatedAt: new Date(),
    })
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function deletePlaidItem(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('app.plaidItems')
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst();
    return getAffectedRows(result) > 0;
  }

  const result = await db.deleteFrom('app.plaidItems').where('id', '=', id).executeTakeFirst();
  return getAffectedRows(result) > 0;
}
