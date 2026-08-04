import crypto from 'node:crypto';

import type { AppFinanceTransactions, Selectable } from '@hominem/db';
import { db } from '@hominem/db';
import { sql, type Insertable, type Updateable } from 'kysely';
import z from 'zod';

import { FINANCE_TRANSACTION_ENTITY_TYPE } from './contracts';
import { getAffectedRows, sqlValueList, toNumber } from './utils';

type TransactionRow = Selectable<AppFinanceTransactions>;
type CreateTransactionInput = Partial<Insertable<AppFinanceTransactions>> & {
  userId: string;
  accountId: string;
  amount: number | string;
};
type UpdateTransactionInput = Partial<
  Pick<
    Updateable<AppFinanceTransactions>,
    'amount' | 'description' | 'postedOn' | 'accountId' | 'merchantName'
  >
>;

export const financeTransactionQueryContractSchema = z.object({
  userId: z.uuid(),
  accountId: z.uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
  tagIds: z.array(z.uuid()).optional(),
  tagNames: z.array(z.string().min(1)).optional(),
});

export type FinanceTransactionQueryContract = z.infer<typeof financeTransactionQueryContractSchema>;

export async function queryTransactions(userId: string): Promise<TransactionRow[]> {
  return queryTransactionsByContract({ userId });
}

export async function queryTransactionsByContract(input: {
  userId: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  tagIds?: string[];
  tagNames?: string[];
}): Promise<TransactionRow[]> {
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
    .selectFrom('app.financeTransactions as t')
    .selectAll()
    .where('t.userId', '=', parsed.userId);

  if (parsed.accountId) {
    query = query.where('t.accountId', '=', parsed.accountId);
  }
  if (parsed.dateFrom) {
    query = query.where('t.postedOn', '>=', parsed.dateFrom);
  }
  if (parsed.dateTo) {
    query = query.where('t.postedOn', '<=', parsed.dateTo);
  }

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (
        select 1
        from app.tag_assignments ti_filter
        join app.tags tg_filter
          on tg_filter.id = ti_filter.tag_id
         and tg_filter.owner_userid = ${parsed.userId}
        where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass
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
         and tg_filter.owner_userid = ${parsed.userId}
        where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass
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
         and tg_filter.owner_userid = ${parsed.userId}
        where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass
          and ti_filter.entity_id = t.id
          and tg_filter.name in (${sqlValueList(tagNames)})
      )`,
    );
  }

  return query
    .orderBy('t.postedOn', 'desc')
    .orderBy('t.id', 'desc')
    .limit(parsed.limit)
    .offset(parsed.offset)
    .execute();
}

export async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<string[]> {
  const ownershipResult = await db
    .selectFrom('app.financeTransactions')
    .select('id')
    .where('id', '=', transactionId)
    .where('userId', '=', userId)
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
      .where('ownerUserid', '=', userId)
      .where(sql<boolean>`id in (${sqlValueList(uniqueTagIds)})` as never)
      .execute();
    const validIds = new Set((validTagResult as Array<{ id: string }>).map((row) => row.id));
    if (validIds.size !== uniqueTagIds.length) {
      throw new Error('One or more tags are invalid for this user');
    }
  }

  await db
    .deleteFrom('app.tagAssignments')
    .where('entityTable', '=', sql`${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass` as never)
    .where('entityId', '=', transactionId)
    .execute();

  for (const tagId of uniqueTagIds) {
    await db
      .insertInto('app.tagAssignments')
      .values({
        id: crypto.randomUUID(),
        tagId,
        entityTable: FINANCE_TRANSACTION_ENTITY_TYPE,
        entityId: transactionId,
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
    .selectFrom('app.tagAssignments as ti')
    .innerJoin('app.tags as tg', (join) =>
      join.onRef('tg.id', '=', 'ti.tagId').on('tg.ownerUserid', '=', userId),
    )
    .select('ti.tagId')
    .where('ti.entityTable', '=', sql`${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass` as never)
    .where('ti.entityId', '=', transactionId)
    .orderBy('ti.tagId', 'asc')
    .execute();
  return (result as Array<{ tagId: string }>).map((row) => row.tagId);
}

export async function createTransaction(input: CreateTransactionInput): Promise<TransactionRow> {
  const id = input.id ?? crypto.randomUUID();
  const amount = toNumber(input.amount);
  const transactionType = amount < 0 ? 'debit' : 'credit';

  const result = await db
    .insertInto('app.financeTransactions')
    .values({
      id,
      userId: input.userId,
      accountId: input.accountId,
      amount,
      transactionType,
      description: input.description ?? null,
      merchantName: input.merchantName ?? null,
      postedOn: input.postedOn ?? new Date().toISOString(),
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to create transaction');
  }
  return result;
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionInput,
): Promise<TransactionRow | null> {
  const existing = await db
    .selectFrom('app.financeTransactions')
    .selectAll()
    .where('id', '=', id)
    .where('userId', '=', userId)
    .limit(1)
    .executeTakeFirst();
  if (!existing) {
    return null;
  }

  const nextAmount =
    input.amount !== undefined ? toNumber(input.amount) : toNumber(existing.amount);
  const nextDescription =
    input.description === undefined ? existing.description : input.description;
  const nextPostedOn = input.postedOn ?? existing.postedOn;
  const nextAccountId = input.accountId ?? existing.accountId;
  const nextMerchantName =
    input.merchantName === undefined ? existing.merchantName : input.merchantName;
  const nextType = nextAmount < 0 ? 'debit' : 'credit';

  const updateResult = await db
    .updateTable('app.financeTransactions')
    .set({
      amount: nextAmount,
      description: nextDescription,
      postedOn: nextPostedOn,
      accountId: nextAccountId,
      merchantName: nextMerchantName,
      transactionType: nextType,
    })
    .where('id', '=', id)
    .where('userId', '=', userId)
    .returningAll()
    .executeTakeFirst();
  return updateResult ?? null;
}

export async function deleteTransaction(id: string, userId?: string): Promise<boolean> {
  if (userId) {
    const result = await db
      .deleteFrom('app.financeTransactions')
      .where('id', '=', id)
      .where('userId', '=', userId)
      .executeTakeFirst();
    return getAffectedRows(result) > 0;
  }

  const result = await db
    .deleteFrom('app.financeTransactions')
    .where('id', '=', id)
    .executeTakeFirst();
  return getAffectedRows(result) > 0;
}

export async function insertTransaction(input: {
  id?: string;
  userId: string;
  accountId: string;
  amount: number | string;
  description: string | null;
  postedOn: string | Date;
  merchantName?: string | null;
  pending?: boolean;
  source?: string | null;
  externalId?: string;
}): Promise<TransactionRow> {
  const amount = typeof input.amount === 'string' ? Number.parseFloat(input.amount) : input.amount;
  const postedOn =
    input.postedOn instanceof Date ? input.postedOn.toISOString().slice(0, 10) : input.postedOn;
  const transactionType = amount < 0 ? 'debit' : 'credit';
  const id = input.id ?? crypto.randomUUID();

  const result = await db
    .insertInto('app.financeTransactions')
    .values({
      id,
      userId: input.userId,
      accountId: input.accountId,
      amount,
      transactionType,
      description: input.description,
      merchantName: input.merchantName ?? null,
      postedOn,
      pending: input.pending ?? false,
      source: input.source ?? null,
      externalId: input.externalId ?? null,
    })
    .returningAll()
    .executeTakeFirst();

  if (!result) {
    throw new Error('Failed to insert transaction');
  }
  return result;
}

export async function getTransactionByPlaidId(
  externalId: string,
  userId?: string,
): Promise<TransactionRow | null> {
  if (userId) {
    const result = await db
      .selectFrom('app.financeTransactions')
      .selectAll()
      .where('externalId', '=', externalId)
      .where('userId', '=', userId)
      .orderBy('postedOn', 'desc')
      .orderBy('id', 'desc')
      .limit(1)
      .executeTakeFirst();
    return result ?? null;
  }

  const result = await db
    .selectFrom('app.financeTransactions')
    .selectAll()
    .where('externalId', '=', externalId)
    .orderBy('postedOn', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
  return result ?? null;
}

export async function processTransactionsFromCSVBuffer(_input: {
  userId: string;
  accountId: string;
  csvBuffer: ArrayBuffer | Buffer;
}): Promise<{ imported: number; skipped: number }> {
  return { imported: 0, skipped: 0 };
}

export async function updatePlaidTransaction(
  id: string,
  updates: Partial<{
    amount: number | string;
    description: string | null;
    postedOn: string | Date;
    merchantName: string | null;
    pending: boolean;
  }>,
): Promise<TransactionRow | null> {
  const existing = await db
    .selectFrom('app.financeTransactions')
    .selectAll()
    .where('id', '=', id)
    .limit(1)
    .executeTakeFirst();
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
  const nextPostedOn =
    updates.postedOn === undefined
      ? existing.postedOn
      : updates.postedOn instanceof Date
        ? updates.postedOn.toISOString().slice(0, 10)
        : updates.postedOn;
  const nextMerchantName =
    updates.merchantName === undefined ? existing.merchantName : updates.merchantName;
  const nextType = nextAmount < 0 ? 'debit' : 'credit';

  const result = await db
    .updateTable('app.financeTransactions')
    .set({
      amount: nextAmount,
      description: nextDescription,
      postedOn: nextPostedOn,
      merchantName: nextMerchantName,
      transactionType: nextType,
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
  return result ?? null;
}

export async function deletePlaidTransaction(externalId: string): Promise<boolean> {
  const result = await db
    .deleteFrom('app.financeTransactions')
    .where('externalId', '=', externalId)
    .executeTakeFirst();
  return !!result;
}

export async function queryAnalyticsTransactionsByContract(input: {
  userId: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  tagIds?: string[];
  tagNames?: string[];
}): Promise<
  Array<{
    id: string;
    userId: string;
    accountId: string;
    amount: number;
    description: string | null;
    postedOn: Date | string | null;
    externalId: string | null;
    merchantName: string | null;
    classification: string;
  }>
> {
  const parsed = financeTransactionQueryContractSchema.parse({
    userId: input.userId,
    accountId: input.accountId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    limit: input.limit ?? 200,
    offset: input.offset ?? 0,
    tagIds: input.tagIds,
    tagNames: input.tagNames,
  });

  const tagIds = parsed.tagIds ?? [];
  const tagNames = parsed.tagNames ?? [];
  let query = db
    .selectFrom('app.financeTransactions as t')
    .select([
      't.id',
      't.userId',
      't.accountId',
      't.amount',
      't.description',
      't.postedOn',
      't.externalId',
      't.merchantName',
      sql<string>`coalesce((select min(tg_tag.name) from app.tag_assignments ti_tag join app.tags tg_tag on tg_tag.id = ti_tag.tag_id and tg_tag.owner_userid = ${parsed.userId} where ti_tag.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass and ti_tag.entity_id = t.id), ${sql.lit('Uncategorized')})`.as(
        'classification',
      ),
    ])
    .where('t.userId', '=', parsed.userId)
    .where('t.excluded', '=', false);

  if (parsed.accountId) {
    query = query.where('t.accountId', '=', parsed.accountId);
  }
  if (parsed.dateFrom) {
    query = query.where('t.postedOn', '>=', parsed.dateFrom);
  }
  if (parsed.dateTo) {
    query = query.where('t.postedOn', '<=', parsed.dateTo);
  }

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from app.tag_assignments ti_filter join app.tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_userid = ${parsed.userId} where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass and ti_filter.entity_id = t.id and (ti_filter.tag_id in (${sqlValueList(tagIds)}) or tg_filter.name in (${sqlValueList(tagNames)})))` as never,
    );
  } else if (tagIds.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from app.tag_assignments ti_filter join app.tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_userid = ${parsed.userId} where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass and ti_filter.entity_id = t.id and ti_filter.tag_id in (${sqlValueList(tagIds)}))` as never,
    );
  } else if (tagNames.length > 0) {
    query = query.where(
      sql<boolean>`exists (select 1 from app.tag_assignments ti_filter join app.tags tg_filter on tg_filter.id = ti_filter.tag_id and tg_filter.owner_userid = ${parsed.userId} where ti_filter.entity_table = ${FINANCE_TRANSACTION_ENTITY_TYPE}::regclass and ti_filter.entity_id = t.id and tg_filter.name in (${sqlValueList(tagNames)}))` as never,
    );
  }

  const result = await query
    .orderBy('t.postedOn', 'desc')
    .orderBy('t.id', 'desc')
    .limit(parsed.limit)
    .offset(parsed.offset)
    .execute();

  return result.map((row) => ({
    id: row.id,
    userId: row.userId,
    accountId: row.accountId,
    amount: toNumber(row.amount),
    description: row.description,
    postedOn: row.postedOn,
    externalId: row.externalId,
    merchantName: row.merchantName,
    classification: row.classification,
  }));
}
