import { randomUUID } from 'crypto';

import { db } from '@hominem/db';
import {
  TransactionInsertSchema,
  TransactionQueryFiltersSchema,
} from '@hominem/rpc/schemas/finance.transactions.schema';
import type {
  TransactionCreateOutput,
  TransactionDeleteOutput,
  TransactionListOutput,
  TransactionUpdateOutput,
} from '@hominem/rpc/types/finance/transactions.types';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { notFound } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';
import { toTransactionData } from '../utils/finance-transforms';

const FINANCE_TRANSACTION_ENTITY_TABLE = 'finance_transactions';

const transactionListSchema = TransactionQueryFiltersSchema.extend({
  account: z.uuid().optional(),
  sortBy: z.string().optional(),
  sortDirection: z
    .enum(['asc', 'desc'])
    .or(z.array(z.enum(['asc', 'desc'])))
    .optional(),
  description: z.string().optional(),
  search: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
});

const transactionDeleteSchema = z.object({
  id: z.uuid(),
});

const transactionCreateSchema = TransactionInsertSchema.omit({
  userId: true,
});

const transactionUpdateSchema = z.object({
  id: z.uuid(),
  data: z.object({
    accountId: z.uuid().optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    description: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    date: z.string().optional(),
    merchantName: z.string().nullable().optional(),
    tagIds: z.array(z.uuid()).optional(),
  }),
});

async function getTaggedTransactionIds(
  userId: string,
  tagIds: string[],
  tagNames: string[],
): Promise<string[]> {
  let query = db
    .selectFrom('app.tag_assignments')
    .innerJoin('app.tags', 'app.tags.id', 'app.tag_assignments.tag_id')
    .select('app.tag_assignments.entity_id')
    .where('app.tag_assignments.entity_table', '=', FINANCE_TRANSACTION_ENTITY_TABLE)
    .where('app.tags.owner_user_id', '=', userId);

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where((eb) =>
      eb.or([eb('app.tag_assignments.tag_id', 'in', tagIds), eb('app.tags.name', 'in', tagNames)]),
    );
  } else if (tagIds.length > 0) {
    query = query.where('app.tag_assignments.tag_id', 'in', tagIds);
  } else {
    query = query.where('app.tags.name', 'in', tagNames);
  }

  const rows = await query.execute();
  return [...new Set(rows.map((r: { entity_id: string }) => r.entity_id))];
}

async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<void> {
  const tx = await db
    .selectFrom('app.finance_transactions')
    .select('id')
    .where('id', '=', transactionId)
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();
  if (!tx) return;

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length > 0) {
    const validTags = await db
      .selectFrom('app.tags')
      .select('id')
      .where('owner_user_id', '=', userId)
      .where('id', 'in', uniqueTagIds)
      .execute();
    if (validTags.length !== uniqueTagIds.length) {
      throw new Error('One or more tags are invalid for this user');
    }
  }

  await db
    .deleteFrom('app.tag_assignments')
    .where('entity_table', '=', FINANCE_TRANSACTION_ENTITY_TABLE)
    .where('entity_id', '=', transactionId)
    .execute();

  for (const tagId of uniqueTagIds) {
    await db
      .insertInto('app.tag_assignments')
      .values({
        id: randomUUID(),
        tag_id: tagId,
        entity_table: FINANCE_TRANSACTION_ENTITY_TABLE,
        entity_id: transactionId,
      })
      .execute();
  }
}

export const transactionsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', transactionListSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const accountId = input.accountId ?? input.account;
    const tagIds = input.tagIds ?? [];
    const tagNames = input.tagNames ?? [];
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    const hasTagFilters = tagIds.length > 0 || tagNames.length > 0;
    const dateFrom = input.dateFrom ? new Date(input.dateFrom) : null;
    const dateTo = input.dateTo ? new Date(input.dateTo) : null;

    let query = db
      .selectFrom('app.finance_transactions')
      .selectAll()
      .where('owner_user_id', '=', userId)
      .orderBy('posted_on', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    if (accountId) query = query.where('account_id', '=', accountId);
    if (dateFrom) query = query.where('posted_on', '>=', dateFrom);
    if (dateTo) query = query.where('posted_on', '<=', dateTo);

    if (hasTagFilters) {
      const taggedIds = await getTaggedTransactionIds(userId, tagIds, tagNames);
      if (taggedIds.length === 0) {
        return c.json<TransactionListOutput>(
          { data: [], filteredCount: 0, totalUserCount: 0 },
          200,
        );
      }
      query = query.where('id', 'in', taggedIds);
    }

    const [data, totalRow] = await Promise.all([
      query.execute(),
      db
        .selectFrom('app.finance_transactions')
        .select(db.fn.countAll<number>().as('count'))
        .where('owner_user_id', '=', userId)
        .executeTakeFirst(),
    ]);

    const responseData = data.map(toTransactionData);
    return c.json<TransactionListOutput>(
      {
        data: responseData,
        filteredCount: responseData.length,
        totalUserCount: Number(totalRow?.count ?? 0),
      },
      200,
    );
  })
  .post('/create', authMiddleware, zValidator('json', transactionCreateSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');
    const id = randomUUID();
    const transactionType = input.amount < 0 ? 'expense' : 'income';

    await db
      .insertInto('app.finance_transactions')
      .values({
        id,
        owner_user_id: userId,
        account_id: input.accountId,
        amount: input.amount,
        transaction_type: transactionType,
        description: input.description,
        merchant_name: null,
        posted_on: input.date,
      })
      .execute();

    const created = await db
      .selectFrom('app.finance_transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!created) throw new Error('Failed to create transaction');

    if (input.tagIds && input.tagIds.length > 0) {
      await replaceTransactionTags(id, userId, input.tagIds);
    }

    return c.json<TransactionCreateOutput>(toTransactionData(created), 201);
  })
  .post('/update', authMiddleware, zValidator('json', transactionUpdateSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');

    const existing = await db
      .selectFrom('app.finance_transactions')
      .selectAll()
      .where('id', '=', input.id)
      .where('owner_user_id', '=', userId)
      .executeTakeFirst();

    if (!existing) {
      throw { ...notFound('Transaction'), message: 'Transaction not found' };
    }

    const amount =
      input.data.amount !== undefined
        ? typeof input.data.amount === 'string'
          ? Number.parseFloat(input.data.amount)
          : input.data.amount
        : Number(existing.amount);
    const nextType = amount < 0 ? 'expense' : 'income';

    const updated = await db
      .updateTable('app.finance_transactions')
      .set({
        amount,
        transaction_type: nextType,
        ...(input.data.description !== undefined ? { description: input.data.description } : {}),
        ...(input.data.date !== undefined ? { posted_on: input.data.date } : {}),
        ...(input.data.accountId !== undefined ? { account_id: input.data.accountId } : {}),
        ...(input.data.merchantName !== undefined
          ? { merchant_name: input.data.merchantName }
          : {}),
      })
      .where('id', '=', input.id)
      .where('owner_user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      return c.notFound();
    }

    if (input.data.tagIds) {
      await replaceTransactionTags(updated.id, userId, input.data.tagIds);
    }

    return c.json<TransactionUpdateOutput>(toTransactionData(updated));
  })
  .post('/delete', authMiddleware, zValidator('json', transactionDeleteSchema), async (c) => {
    const userId = c.get('userId')!;
    const input = c.req.valid('json');

    const result = await db
      .deleteFrom('app.finance_transactions')
      .where('id', '=', input.id)
      .where('owner_user_id', '=', userId)
      .returningAll()
      .executeTakeFirst();

    const deleted = Boolean(result);
    return c.json<TransactionDeleteOutput>({
      success: deleted,
      ...(deleted ? {} : { message: 'Transaction not found' }),
    });
  });
