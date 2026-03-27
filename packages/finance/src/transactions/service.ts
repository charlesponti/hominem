import crypto from 'node:crypto';

import { db } from '@hominem/db';
import { sql } from 'kysely';

import {
  FINANCE_TRANSACTION_ENTITY_TYPE,
  financeTransactionQueryContractSchema,
  type FinanceTransactionQueryContract,
} from '../contracts';
import type { FinanceTransaction, FinanceTransactionRow } from '../lib/types';
import { toDateOnlyString, toNumber, sqlValueList } from '../lib/utils';

function toFinanceTransaction(row: FinanceTransactionRow): FinanceTransaction {
  return {
    id: row.id,
    userId: row.owner_user_id,
    accountId: row.account_id,
    amount: toNumber(row.amount),
    description: row.description,
    date: toDateOnlyString(row.posted_on),
    category: row.notes,
    merchantName: row.merchant_name,
  };
}

async function queryTransactionsCore(
  input: Partial<FinanceTransactionQueryContract> & { userId: string },
  _includeTagJoins: boolean,
): Promise<FinanceTransaction[]> {
  const parsed = financeTransactionQueryContractSchema.parse({
    userId: input.userId,
    accountId: input.accountId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
    tagIds: input.tagIds,
    tagNames: input.tagNames,
  });

  const tagIds = parsed.tagIds ?? [];
  const tagNames = parsed.tagNames ?? [];
  let query = db
    .selectFrom('app.finance_transactions as t')
    .selectAll()
    .where('t.owner_user_id', '=', parsed.userId);

  if (parsed.accountId) {
    query = query.where('t.account_id', '=', parsed.accountId);
  }
  if (parsed.dateFrom) {
    query = query.where('t.posted_on', '>=', new Date(parsed.dateFrom));
  }
  if (parsed.dateTo) {
    query = query.where('t.posted_on', '<=', new Date(parsed.dateTo));
  }
  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from app.tag_assignments ti_filter
        join app.tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_user_id = ${parsed.userId}
        where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and (
            ti_filter.tag_id in (${sqlValueList(tagIds)})
            or tg_filter.name in (${sqlValueList(tagNames)})
          )
      )`,
    );
  } else if (tagIds.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from app.tag_assignments ti_filter
        join app.tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_user_id = ${parsed.userId}
        where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and ti_filter.tag_id in (${sqlValueList(tagIds)})
      )`,
    );
  } else if (tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from app.tag_assignments ti_filter
        join app.tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_user_id = ${parsed.userId}
        where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}
          and ti_filter.entity_id = t.id
          and tg_filter.name in (${sqlValueList(tagNames)})
      )`,
    );
  }

  const result = await query
    .orderBy('t.posted_on', 'desc')
    .orderBy('t.id', 'desc')
    .limit(parsed.limit)
    .offset(parsed.offset)
    .execute();
  return result.map(toFinanceTransaction);
}

export async function queryTransactions(userId: string): Promise<FinanceTransaction[]> {
  return queryTransactionsCore({ userId }, false);
}

export async function queryTransactionsByContract(
  input: Omit<Partial<FinanceTransactionQueryContract>, 'userId'> & {
    userId: string;
  },
): Promise<FinanceTransaction[]> {
  return queryTransactionsCore(input, true);
}

export async function createTransaction(
  input: Omit<FinanceTransaction, 'id'> & { id?: string },
): Promise<FinanceTransaction> {
  const id = input.id ?? crypto.randomUUID();
  const transactionType = input.amount < 0 ? 'expense' : 'income';

  const result = await db
    .insertInto('app.finance_transactions')
    .values({
      id,
      owner_user_id: input.userId,
      account_id: input.accountId,
      amount: input.amount,
      transaction_type: transactionType,
      description: input.description,
      merchant_name: input.merchantName ?? null,
      posted_on: input.date,
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to create transaction');
  }
  return toFinanceTransaction(result);
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: Partial<FinanceTransaction>,
): Promise<FinanceTransaction | null> {
  const existingResult = await db
    .selectFrom('app.finance_transactions')
    .selectAll()
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;
  if (!existing) {
    return null;
  }

  const nextAmount = input.amount ?? toNumber(existing.amount);
  const nextDescription =
    input.description === undefined ? existing.description : input.description;
  const nextDate = input.date ?? existing.posted_on;
  const nextAccountId = input.accountId ?? existing.account_id;
  const nextMerchantName =
    input.merchantName === undefined ? existing.merchant_name : input.merchantName;
  const nextType = nextAmount < 0 ? 'expense' : 'income';

  const updateResult = await db
    .updateTable('app.finance_transactions')
    .set({
      amount: nextAmount,
      description: nextDescription,
      posted_on: nextDate,
      account_id: nextAccountId,
      merchant_name: nextMerchantName,
      transaction_type: nextType,
    })
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .returningAll()
    .executeTakeFirst();
  const updated = updateResult ?? null;
  return updated ? toFinanceTransaction(updated) : null;
}

export async function deleteTransaction(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('app.finance_transactions')
      .where('id', '=', id)
      .where('owner_user_id', '=', userId)
      .executeTakeFirst();
    return (result?.numDeletedRows ?? 0n) > 0n;
  }

  const result = await db
    .deleteFrom('app.finance_transactions')
    .where('id', '=', id)
    .executeTakeFirst();
  return (result?.numDeletedRows ?? 0n) > 0n;
}

export async function insertTransaction(input: {
  id?: string;
  userId: string;
  accountId: string;
  type?: string;
  amount: number | string;
  description: string | null;
  date: string | Date;
  merchantName?: string | null;
  category?: string | null;
  parentCategory?: string | null;
  pending?: boolean;
  paymentChannel?: string | null;
  location?: { lat: number; lon: number } | null;
  plaidTransactionId?: string;
}): Promise<FinanceTransaction> {
  const amountVal =
    typeof input.amount === 'string' ? Number.parseFloat(input.amount) : input.amount;
  const dateVal = input.date instanceof Date ? input.date.toISOString().slice(0, 10) : input.date;
  const transactionType = amountVal < 0 ? 'expense' : 'income';
  const id = input.id ?? crypto.randomUUID();

  const result = await db
    .insertInto('app.finance_transactions')
    .values({
      id,
      owner_user_id: input.userId,
      account_id: input.accountId,
      amount: amountVal,
      transaction_type: transactionType,
      description: input.description,
      merchant_name: input.merchantName ?? null,
      notes: input.category ?? null,
      posted_on: dateVal,
      pending: input.pending ?? false,
      source: input.paymentChannel ?? null,
      external_id: input.plaidTransactionId ?? null,
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to insert transaction');
  }
  return toFinanceTransaction(result);
}

export async function getTransactionByPlaidId(
  plaidTransactionId: string,
  userId?: string,
): Promise<FinanceTransaction | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.finance_transactions')
      .selectAll()
      .where('external_id', '=', plaidTransactionId)
      .where('owner_user_id', '=', userId)
      .orderBy('posted_on', 'desc')
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst();
    const row = result ?? null;
    return row ? toFinanceTransaction(row) : null;
  }

  const result = await db
    .selectFrom('app.finance_transactions')
    .selectAll()
    .where('external_id', '=', plaidTransactionId)
    .orderBy('posted_on', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceTransaction(row) : null;
}

export async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<string[]> {
  const ownershipResult = await db
    .selectFrom('app.finance_transactions')
    .select('id')
    .where('id', '=', transactionId)
    .where('owner_user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();
  if (!ownershipResult) {
    return [];
  }

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length > 0) {
    const validTagResult = await db
      .selectFrom('app.tags')
      .select('id')
      .where('owner_user_id', '=', userId)
      .where(sql<boolean>`id in (${sqlValueList(uniqueTagIds)})`)
      .execute();
    const validIds = new Set((validTagResult as Array<{ id: string }>).map((row) => row.id));
    if (validIds.size !== uniqueTagIds.length) {
      throw new Error('One or more app.tags are invalid for this user');
    }
  }

  await db
    .deleteFrom('app.tag_assignments')
    .where('entity_table', '=', FINANCE_TRANSACTION_ENTITY_TYPE)
    .where('entity_id', '=', transactionId)
    .execute();

  for (const tagId of uniqueTagIds) {
    await db
      .insertInto('app.tag_assignments')
      .values({
        id: crypto.randomUUID(),
        tag_id: tagId,
        entity_table: FINANCE_TRANSACTION_ENTITY_TYPE,
        entity_id: transactionId,
      })
      .execute();
  }

  return uniqueTagIds;
}

export async function getTransactionTagIds(
  transactionId: string,
  userId: string,
): Promise<string[]> {
  const result = await db
    .selectFrom('app.tag_assignments as ti')
    .innerJoin('app.tags as tg', (join) =>
      join.onRef('tg.id', '=', 'ti.tag_id').on('tg.owner_user_id', '=', userId),
    )
    .select('ti.tag_id')
    .where('ti.entity_table', '=', FINANCE_TRANSACTION_ENTITY_TYPE)
    .where('ti.entity_id', '=', transactionId)
    .orderBy('ti.tag_id', 'asc')
    .execute();
  return (result as Array<{ tag_id: string }>).map((row) => row.tag_id);
}

export async function updatePlaidTransaction(
  id: string,
  updates: Partial<{
    type: string;
    amount: number | string;
    description: string | null;
    date: string | Date;
    merchantName: string | null;
    category: string | null;
    parentCategory: string | null;
    pending: boolean;
  }>,
): Promise<FinanceTransaction | null> {
  const existingResult = await db
    .selectFrom('app.finance_transactions')
    .selectAll()
    .where('id', '=', id)
    .limit(1)
    .executeTakeFirst();
  const existing = existingResult ?? null;
  if (!existing) {
    return null;
  }

  const nextAmount =
    updates.amount === undefined
      ? toNumber(existing.amount)
      : typeof updates.amount === 'string'
        ? Number.parseFloat(updates.amount)
        : updates.amount;
  const nextDescription =
    updates.description === undefined ? existing.description : updates.description;
  const nextDate =
    updates.date === undefined
      ? existing.posted_on
      : updates.date instanceof Date
        ? updates.date.toISOString().slice(0, 10)
        : updates.date;
  const nextNotes = updates.category === undefined ? existing.notes : updates.category;
  const nextMerchantName =
    updates.merchantName === undefined ? existing.merchant_name : updates.merchantName;
  const nextType = nextAmount < 0 ? 'expense' : 'income';

  const result = await db
    .updateTable('app.finance_transactions')
    .set({
      amount: nextAmount,
      description: nextDescription,
      posted_on: nextDate,
      notes: nextNotes,
      merchant_name: nextMerchantName,
      transaction_type: nextType,
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
  const row = result ?? null;
  return row ? toFinanceTransaction(row) : null;
}

export async function deletePlaidTransaction(plaidTransactionId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('app.finance_transactions')
    .where('external_id', '=', plaidTransactionId)
    .executeTakeFirst();
  return !!result;
}

export async function processTransactionsFromCSVBuffer(_input: {
  userId: string;
  accountId: string;
  csvBuffer: ArrayBuffer | Buffer;
}): Promise<{ imported: number; skipped: number }> {
  return { imported: 0, skipped: 0 };
}
