import { randomUUID } from 'crypto';

import { db } from '@hominem/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

const transactionListSchema = z
  .object({
    accountId: z.string().uuid().optional(),
    accountIds: z
      .union([z.string().uuid(), z.array(z.string().uuid())])
      .transform((v) => (Array.isArray(v) ? v : [v]))
      .optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    tagIds: z.array(z.string().uuid()).optional(),
    tagNames: z.array(z.string().min(1)).optional(),
  })
  .extend({
    account: z.string().uuid().optional(),
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
  id: z.string().uuid(),
});

const transactionCreateSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number(),
  description: z.string().min(1),
  date: z.string(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

const transactionUpdateSchema = z.object({
  id: z.string().uuid(),
  data: z.object({
    accountId: z.string().uuid().optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    description: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    date: z.string().optional(),
    merchantName: z.string().nullable().optional(),
    tagIds: z.array(z.string().uuid()).optional(),
  }),
});

async function getTaggedTransactionIds(
  userId: string,
  tagIds: string[],
  tagNames: string[],
): Promise<string[]> {
  let query = db
    .selectFrom('app.tagAssignments')
    .innerJoin('app.tags', 'app.tagAssignments.tagId', 'app.tags.id')
    .select('app.tagAssignments.entityId')
    .where('app.tagAssignments.entityTable', '=', 'app.financeTransactions')
    .where('app.tags.ownerUserid', '=', userId);

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where((eb) =>
      eb.or([eb('app.tagAssignments.tagId', 'in', tagIds), eb('app.tags.name', 'in', tagNames)]),
    );
  } else if (tagIds.length > 0) {
    query = query.where('app.tagAssignments.tagId', 'in', tagIds);
  } else {
    query = query.where('app.tags.name', 'in', tagNames);
  }

  const rows = await query.execute();
  return [...new Set(rows.map((r) => r.entityId))];
}

async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<void> {
  const tx = await db
    .selectFrom('app.financeTransactions')
    .select('id')
    .where('id', '=', transactionId)
    .where('userId', '=', userId)
    .executeTakeFirst();
  if (!tx) return;

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length > 0) {
    const validTags = await db
      .selectFrom('app.tags')
      .select('id')
      .where('ownerUserid', '=', userId)
      .where('id', 'in', uniqueTagIds)
      .execute();
    if (validTags.length !== uniqueTagIds.length) {
      throw new Error('One or more tags are invalid for this user');
    }
  }

  await db
    .deleteFrom('app.tagAssignments')
    .where('entityTable', '=', 'app.financeTransactions')
    .where('entityId', '=', transactionId)
    .execute();

  for (const tagId of uniqueTagIds) {
    await db
      .insertInto('app.tagAssignments')
      .values({
        id: randomUUID(),
        tagId: tagId,
        entityTable: 'app.financeTransactions',
        entityId: transactionId,
      })
      .execute();
  }
}

export const transactionsRoutes = new Hono<AppContext>()
  .get('/list', authMiddleware, zValidator('query', transactionListSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('query');
    const accountId = input.accountId ?? input.account;
    const accountIds = input.accountIds ?? [];
    const tagIds = input.tagIds ?? [];
    const tagNames = input.tagNames ?? [];
    const limit = input.limit ?? 50;
    const offset = input.offset ?? 0;

    const hasTagFilters = tagIds.length > 0 || tagNames.length > 0;
    const dateFrom = input.dateFrom ?? null;
    const dateTo = input.dateTo ?? null;

    let query = db
      .selectFrom('app.financeTransactions')
      .selectAll()
      .where('userId', '=', userId)
      .orderBy('postedOn', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    let countQuery = db
      .selectFrom('app.financeTransactions')
      .select(db.fn.countAll<number>().as('count'))
      .where('userId', '=', userId);

    if (accountIds.length > 0) {
      query = query.where('accountId', 'in', accountIds);
      countQuery = countQuery.where('accountId', 'in', accountIds);
    } else if (accountId) {
      query = query.where('accountId', '=', accountId);
      countQuery = countQuery.where('accountId', '=', accountId);
    }
    if (dateFrom) {
      query = query.where('postedOn', '>=', dateFrom);
      countQuery = countQuery.where('postedOn', '>=', dateFrom);
    }
    if (dateTo) {
      query = query.where('postedOn', '<=', dateTo);
      countQuery = countQuery.where('postedOn', '<=', dateTo);
    }
    if (input.description) {
      const term = `%${input.description}%`;
      query = query.where((eb) =>
        eb.or([eb('description', 'ilike', term), eb('merchantName', 'ilike', term)]),
      );
      countQuery = countQuery.where((eb) =>
        eb.or([eb('description', 'ilike', term), eb('merchantName', 'ilike', term)]),
      );
    }

    if (hasTagFilters) {
      const taggedIds = await getTaggedTransactionIds(userId, tagIds, tagNames);
      if (taggedIds.length === 0) {
        return c.json({ data: [], filteredCount: 0, totalUserCount: 0 }, 200);
      }
      query = query.where('id', 'in', taggedIds);
      countQuery = countQuery.where('id', 'in', taggedIds);
    }

    const [data, filteredRow, totalRow] = await Promise.all([
      query.execute(),
      countQuery.executeTakeFirst(),
      db
        .selectFrom('app.financeTransactions')
        .select(db.fn.countAll<number>().as('count'))
        .where('userId', '=', userId)
        .executeTakeFirst(),
    ]);

    const responseData = data.map((t) => ({
      id: t.id,
      userId: t.userId,
      accountId: t.accountId,
      amount: t.amount ? Number(t.amount) : 0,
      description: t.description ?? null,
      postedOn: t.postedOn ? String(t.postedOn) : '',
      merchantName: t.merchantName ?? null,
    }));
    return c.json(
      {
        data: responseData,
        filteredCount: Number(filteredRow?.count ?? 0),
        totalUserCount: Number(totalRow?.count ?? 0),
      },
      200,
    );
  })
  .post('/create', authMiddleware, zValidator('json', transactionCreateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');
    const id = randomUUID();
    const transactionType = input.amount < 0 ? 'expense' : 'income';

    await db
      .insertInto('app.financeTransactions')
      .values({
        id,
        userId: userId,
        accountId: input.accountId,
        amount: input.amount,
        transactionType: transactionType,
        description: input.description,
        merchantName: null,
        postedOn: input.date,
      })
      .execute();

    const created = await db
      .selectFrom('app.financeTransactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!created) throw new Error('Failed to create transaction');

    if (input.tagIds && input.tagIds.length > 0) {
      await replaceTransactionTags(id, userId, input.tagIds);
    }

    return c.json(
      {
        id: created.id,
        userId: created.userId,
        accountId: created.accountId,
        amount: created.amount ? Number(created.amount) : 0,
        description: created.description ?? null,
        postedOn: created.postedOn ? String(created.postedOn) : '',
        merchantName: created.merchantName ?? null,
      },
      201,
    );
  })
  .post('/update', authMiddleware, zValidator('json', transactionUpdateSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');

    const existing = await db
      .selectFrom('app.financeTransactions')
      .selectAll()
      .where('id', '=', input.id)
      .where('userId', '=', userId)
      .executeTakeFirst();

    if (!existing) {
      throw new NotFoundError('Transaction not found');
    }

    const amount =
      input.data.amount !== undefined
        ? typeof input.data.amount === 'string'
          ? Number.parseFloat(input.data.amount)
          : input.data.amount
        : Number(existing.amount);
    const nextType = amount < 0 ? 'expense' : 'income';

    const updated = await db
      .updateTable('app.financeTransactions')
      .set({
        amount,
        transactionType: nextType,
        ...(input.data.description !== undefined ? { description: input.data.description } : {}),
        ...(input.data.date !== undefined ? { postedOn: input.data.date } : {}),
        ...(input.data.accountId !== undefined ? { accountId: input.data.accountId } : {}),
        ...(input.data.merchantName !== undefined ? { merchantName: input.data.merchantName } : {}),
      })
      .where('id', '=', input.id)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirst();

    if (!updated) {
      return c.notFound();
    }

    if (input.data.tagIds) {
      await replaceTransactionTags(updated.id, userId, input.data.tagIds);
    }

    return c.json({
      id: updated!.id,
      userId: updated!.userId,
      accountId: updated!.accountId,
      amount: updated!.amount ? Number(updated!.amount) : 0,
      description: updated!.description ?? null,
      postedOn: updated!.postedOn ? String(updated!.postedOn) : '',
      merchantName: updated!.merchantName ?? null,
    });
  })
  .post('/delete', authMiddleware, zValidator('json', transactionDeleteSchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const input = c.req.valid('json');

    const result = await db
      .deleteFrom('app.financeTransactions')
      .where('id', '=', input.id)
      .where('userId', '=', userId)
      .returningAll()
      .executeTakeFirst();

    const deleted = Boolean(result);
    return c.json({
      success: deleted,
      ...(deleted ? {} : { message: 'Transaction not found' }),
    });
  });
