import { zValidator } from '@hono/zod-validator'
import { db } from '@hominem/db'
import type { Database } from '@hominem/db'
import { Hono } from 'hono'
import type { Selectable } from 'kysely'
import { randomUUID } from 'crypto'
import * as z from 'zod'

import { authMiddleware, type AppContext } from '../middleware/auth'
import { NotFoundError } from '../errors'
import { toIsoString } from '../utils/to-iso-string'

import {
  TransactionInsertSchema,
  TransactionQueryFiltersSchema,
} from '@hominem/rpc/schemas/finance.transactions.schema'
import type {
  TransactionCreateOutput,
  TransactionDeleteOutput,
  TransactionListOutput,
  TransactionUpdateOutput,
} from '@hominem/rpc/types/finance/transactions.types'
import type { TransactionData, TransactionType } from '@hominem/rpc/types/finance/shared.types'

const FINANCE_TRANSACTION_ENTITY_TYPE = 'finance_transaction'

const transactionListSchema = TransactionQueryFiltersSchema.extend({
  account: z.string().uuid().optional(),
  sortBy: z.string().optional(),
  sortDirection: z.enum(['asc', 'desc']).or(z.array(z.enum(['asc', 'desc']))).optional(),
  description: z.string().optional(),
  search: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
})

const transactionDeleteSchema = z.object({
  id: z.string().uuid(),
})

const transactionCreateSchema = TransactionInsertSchema.omit({
  userId: true,
})

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
})

function toTransactionData(row: Selectable<Database['finance_transactions']>): TransactionData {
  const amount = typeof row.amount === 'string' ? Number.parseFloat(row.amount) : Number(row.amount)
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    amount,
    description: row.description ?? '',
    date: toIsoString(row.date),
    type: (amount < 0 ? 'expense' : 'income') as TransactionType,
  }
}

async function getTaggedTransactionIds(
  userId: string,
  tagIds: string[],
  tagNames: string[],
): Promise<string[]> {
  let query = db
    .selectFrom('tagged_items')
    .innerJoin('tags', 'tags.id', 'tagged_items.tag_id')
    .select('tagged_items.entity_id')
    .where('tagged_items.entity_type', '=', FINANCE_TRANSACTION_ENTITY_TYPE)
    .where('tags.owner_id', '=', userId)

  if (tagIds.length > 0 && tagNames.length > 0) {
    query = query.where((eb) =>
      eb.or([eb('tagged_items.tag_id', 'in', tagIds), eb('tags.name', 'in', tagNames)]),
    )
  } else if (tagIds.length > 0) {
    query = query.where('tagged_items.tag_id', 'in', tagIds)
  } else {
    query = query.where('tags.name', 'in', tagNames)
  }

  const rows = await query.execute()
  return [...new Set(rows.map((r) => r.entity_id))]
}

async function replaceTransactionTags(
  transactionId: string,
  userId: string,
  tagIds: string[],
): Promise<void> {
  const tx = await db
    .selectFrom('finance_transactions')
    .select('id')
    .where('id', '=', transactionId)
    .where('user_id', '=', userId)
    .executeTakeFirst()
  if (!tx) return

  const uniqueTagIds = [...new Set(tagIds)]
  if (uniqueTagIds.length > 0) {
    const validTags = await db
      .selectFrom('tags')
      .select('id')
      .where('owner_id', '=', userId)
      .where('id', 'in', uniqueTagIds)
      .execute()
    if (validTags.length !== uniqueTagIds.length) {
      throw new Error('One or more tags are invalid for this user')
    }
  }

  await db
    .deleteFrom('tagged_items')
    .where('entity_type', '=', FINANCE_TRANSACTION_ENTITY_TYPE)
    .where('entity_id', '=', transactionId)
    .execute()

  for (const tagId of uniqueTagIds) {
    await db
      .insertInto('tagged_items')
      .values({
        id: randomUUID(),
        tag_id: tagId,
        entity_type: FINANCE_TRANSACTION_ENTITY_TYPE,
        entity_id: transactionId,
      })
      .execute()
  }
}

export const transactionsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', transactionListSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const accountId = input.accountId ?? input.account
    const tagIds = input.tagIds ?? []
    const tagNames = input.tagNames ?? []
    const limit = input.limit ?? 50
    const offset = input.offset ?? 0

    const hasTagFilters = tagIds.length > 0 || tagNames.length > 0
    const dateFrom = input.dateFrom ? new Date(input.dateFrom) : null
    const dateTo = input.dateTo ? new Date(input.dateTo) : null

    let query = db
      .selectFrom('finance_transactions')
      .selectAll()
      .where('user_id', '=', userId)
      .orderBy('date', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)

    if (accountId) query = query.where('account_id', '=', accountId)
    if (dateFrom) query = query.where('date', '>=', dateFrom)
    if (dateTo) query = query.where('date', '<=', dateTo)

    if (hasTagFilters) {
      const taggedIds = await getTaggedTransactionIds(userId, tagIds, tagNames)
      if (taggedIds.length === 0) {
        return c.json<TransactionListOutput>({ data: [], filteredCount: 0, totalUserCount: 0 }, 200)
      }
      query = query.where('id', 'in', taggedIds)
    }

    const [data, totalRow] = await Promise.all([
      query.execute(),
      db
        .selectFrom('finance_transactions')
        .select(db.fn.countAll<number>().as('count'))
        .where('user_id', '=', userId)
        .executeTakeFirst(),
    ])

    const responseData = data.map(toTransactionData)
    return c.json<TransactionListOutput>(
      {
        data: responseData,
        filteredCount: responseData.length,
        totalUserCount: Number(totalRow?.count ?? 0),
      },
      200,
    )
  })
  .post('/create', authMiddleware, zValidator('json', transactionCreateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const id = randomUUID()
    const transactionType = input.amount < 0 ? 'expense' : 'income'

    await db
      .insertInto('finance_transactions')
      .values({
        id,
        user_id: userId,
        account_id: input.accountId,
        amount: input.amount,
        transaction_type: transactionType,
        description: input.description,
        category: null,
        merchant_name: null,
        date: input.date,
      })
      .execute()

    const created = await db
      .selectFrom('finance_transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst()

    if (!created) throw new Error('Failed to create transaction')

    if (input.tagIds && input.tagIds.length > 0) {
      await replaceTransactionTags(id, userId, input.tagIds)
    }

    return c.json<TransactionCreateOutput>(toTransactionData(created), 201)
  })
  .post('/update', authMiddleware, zValidator('json', transactionUpdateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')

    const existing = await db
      .selectFrom('finance_transactions')
      .selectAll()
      .where('id', '=', input.id)
      .where('user_id', '=', userId)
      .executeTakeFirst()

    if (!existing) {
      throw new NotFoundError('Transaction not found')
    }

    const amount =
      input.data.amount !== undefined
        ? typeof input.data.amount === 'string'
          ? Number.parseFloat(input.data.amount)
          : input.data.amount
        : Number(existing.amount)
    const nextType = amount < 0 ? 'expense' : 'income'

    const updated = await db
      .updateTable('finance_transactions')
      .set({
        amount,
        transaction_type: nextType,
        ...(input.data.description !== undefined ? { description: input.data.description } : {}),
        ...(input.data.category !== undefined ? { category: input.data.category } : {}),
        ...(input.data.date !== undefined ? { date: input.data.date } : {}),
        ...(input.data.accountId !== undefined ? { account_id: input.data.accountId } : {}),
        ...(input.data.merchantName !== undefined ? { merchant_name: input.data.merchantName } : {}),
      })
      .where('id', '=', input.id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst()

    if (!updated) {
      return c.notFound()
    }

    if (input.data.tagIds) {
      await replaceTransactionTags(updated.id, userId, input.data.tagIds)
    }

    return c.json<TransactionUpdateOutput>(toTransactionData(updated))
  })
  .post('/delete', authMiddleware, zValidator('json', transactionDeleteSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')

    const result = await db
      .deleteFrom('finance_transactions')
      .where('id', '=', input.id)
      .where('user_id', '=', userId)
      .returningAll()
      .executeTakeFirst()

    const deleted = Boolean(result)
    return c.json<TransactionDeleteOutput>({
      success: deleted,
      ...(deleted ? {} : { message: 'Transaction not found' }),
    })
  })
