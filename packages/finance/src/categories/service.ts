import crypto from 'node:crypto';

import { db } from '@hominem/db';

import type { FinanceCategory, TagRow } from '../lib/types';

function toFinanceCategoryFromTag(row: TagRow): FinanceCategory {
  return {
    id: row.id,
    userId: row.owner_user_id,
    name: row.name,
    parentId: null,
    icon: row.icon,
    color: row.color,
  };
}

export async function getSpendingCategories(userId: string): Promise<FinanceCategory[]> {
  const result = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('owner_user_id', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceCategoryFromTag);
}

export async function getTransactionTags(userId: string): Promise<FinanceCategory[]> {
  return getSpendingCategories(userId);
}

export async function createBudgetCategory(
  input: Partial<FinanceCategory> & { userId: string; name: string },
): Promise<FinanceCategory> {
  const id = input.id ?? crypto.randomUUID();
  const result = await db
    .insertInto('app.tags')
    .values({
      id,
      owner_user_id: input.userId,
      name: input.name,
      color: input.color ?? null,
      description: input.icon ?? null,
      path: `/${input.name.toLowerCase().replace(/\s+/g, '-')}`,
      slug: input.name.toLowerCase().replace(/\s+/g, '-'),
    })
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  if (!row) {
    throw new Error('Failed to create budget category');
  }
  return toFinanceCategoryFromTag(row);
}

export async function updateBudgetCategory(
  id: string,
  userId: string,
  input: Partial<FinanceCategory>,
): Promise<FinanceCategory | null> {
  const existingResult = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;
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
    .where('owner_user_id', '=', userId)
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceCategoryFromTag(row) : null;
}

export async function deleteBudgetCategory(id: string, userId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('app.tags')
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();
  return (result?.numDeletedRows ?? 0n) > 0n;
}

export async function getBudgetCategoryById(
  id: string,
  userId: string,
): Promise<FinanceCategory | null> {
  const result = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceCategoryFromTag(row) : null;
}

export async function checkBudgetCategoryNameExists(
  userId: string,
  name: string,
): Promise<boolean> {
  const result = await db
    .selectFrom('app.tags')
    .select('id')
    .where('owner_user_id', '=', userId)
    .where('name', '=', name)
    .limit(1)
    .executeTakeFirst();
  return !!result;
}

export async function getUserExpenseCategories(userId: string): Promise<FinanceCategory[]> {
  return getAllBudgetCategories(userId);
}

export async function getAllBudgetCategories(userId: string): Promise<FinanceCategory[]> {
  const result = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('owner_user_id', '=', userId)
    .orderBy('name', 'asc')
    .orderBy('id', 'asc')
    .execute();
  return result.map(toFinanceCategoryFromTag);
}

export async function bulkCreateBudgetCategoriesFromTransactions(
  _userId: string,
): Promise<FinanceCategory[]> {
  return [];
}
