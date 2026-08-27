import crypto from 'node:crypto';

import type { AppTags, Selectable } from '@hominem/db';
import { db } from '@hominem/db';
import { sql } from 'kysely';

import { FINANCE_TRANSACTION_ENTITY_TYPE } from './contracts';
import { getAffectedRows, toNumber } from './utils';

export async function getAllTags(ownerId: string): Promise<Selectable<AppTags>[]> {
  return db
    .selectFrom('app.tags')
    .selectAll()
    .where('ownerUserid', '=', ownerId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
}

export const getSpendingCategories = getAllTags;
export const getTransactionTags = getAllTags;
export const getUserExpenseCategories = getAllTags;

export async function createTag(
  input: Partial<Selectable<AppTags>> & { ownerUserid: string; name: string },
): Promise<Selectable<AppTags>> {
  const id = input.id ?? crypto.randomUUID();
  const result = await db
    .insertInto('app.tags')
    .values({
      id,
      ownerUserid: input.ownerUserid,
      name: input.name,
      color: input.color ?? null,
      slug: input.slug ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      path: input.path ?? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    })
    .returningAll()
    .executeTakeFirst();
  if (!result) {
    throw new Error('Failed to create tag');
  }
  return result;
}
export const createBudgetCategory = createTag;

export async function updateTag(
  id: string,
  ownerUserid: string,
  input: Partial<Selectable<AppTags>>,
): Promise<Selectable<AppTags> | null> {
  const existing = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('id', '=', id)
    .where('ownerUserid', '=', ownerUserid)
    .limit(1)
    .executeTakeFirst();
  if (!existing) {
    return null;
  }

  const result = await db
    .updateTable('app.tags')
    .set({
      name: input.name ?? existing.name,
      color: input.color === undefined ? existing.color : input.color,
    })
    .where('id', '=', id)
    .where('ownerUserid', '=', ownerUserid)
    .returningAll()
    .executeTakeFirst();
  return result ?? null;
}
export const updateBudgetCategory = updateTag;

export async function deleteTag(id: string, ownerUserid: string): Promise<boolean> {
  const result = await db
    .deleteFrom('app.tags')
    .where('id', '=', id)
    .where('ownerUserid', '=', ownerUserid)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}
export const deleteBudgetCategory = deleteTag;

export async function getTagById(
  id: string,
  ownerUserid: string,
): Promise<Selectable<AppTags> | null> {
  const result = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('id', '=', id)
    .where('ownerUserid', '=', ownerUserid)
    .limit(1)
    .executeTakeFirst();
  return result ?? null;
}
export const getBudgetCategoryById = getTagById;

export async function checkTagNameExists(ownerUserid: string, name: string): Promise<boolean> {
  const result = await db
    .selectFrom('app.tags')
    .select('id')
    .where('ownerUserid', '=', ownerUserid)
    .where('name', '=', name)
    .limit(1)
    .executeTakeFirst();
  return !!result;
}
export const checkBudgetCategoryNameExists = checkTagNameExists;

export async function getBudgetCategoriesWithSpending(ownerUserid: string): Promise<
  Array<{
    id: string;
    ownerUserid: string;
    name: string;
    color: string | null;
    spent: number;
  }>
> {
  const result = await db
    .selectFrom('app.tags as tg')
    .leftJoin('app.tagAssignments as ti', (join) =>
      join
        .onRef('ti.tagId', '=', 'tg.id')
        .on('ti.entityTable', '=', sql`${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass`),
    )
    .leftJoin('app.financeTransactions as t', (join) =>
      join
        .onRef('t.id', '=', 'ti.entityId')
        .onRef('t.userId', '=', 'tg.ownerUserid')
        .on('t.transactionType', '=', 'debit'),
    )
    .select([
      'tg.id',
      'tg.ownerUserid',
      'tg.name',
      'tg.color',
      sql<number>`coalesce(sum(abs(t.amount)), 0)`.as('spent'),
    ])
    .where('tg.ownerUserid', '=', ownerUserid)
    .groupBy(['tg.id', 'tg.ownerUserid', 'tg.name', 'tg.color'])
    .orderBy('tg.name', 'asc')
    .orderBy('tg.id', 'asc')
    .execute();

  return result.map((row) => ({
    id: row.id,
    ownerUserid: row.ownerUserid,
    name: row.name,
    color: row.color,
    spent: toNumber(row.spent),
  }));
}

export async function getBudgetTrackingData(
  ownerUserid: string,
): Promise<{ totalBudget: number; totalSpent: number }> {
  const spentResult = await db
    .selectFrom('app.financeTransactions')
    .select(sql<number>`coalesce(sum(abs(amount)), 0)`.as('totalSpent'))
    .where('userId', '=', ownerUserid)
    .where('transactionType', '=', 'debit')
    .executeTakeFirst();
  const totalSpent = spentResult ? toNumber(spentResult.totalSpent) : 0;

  return { totalBudget: 0, totalSpent };
}

export async function bulkCreateBudgetCategoriesFromTransactions(
  _ownerUserid: string,
): Promise<Selectable<AppTags>[]> {
  // The category column no longer exists; tags are the canonical categorization system.
  return [];
}
