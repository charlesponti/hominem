import { queryTransactions, queryTransactionsByContract } from '@hominem/finance-services'
import {
  createTransaction,
  deleteTransaction,
  replaceTransactionTags,
  updateTransaction,
} from '@hominem/finance-services'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import * as z from 'zod'

import { authMiddleware, type AppContext } from '../middleware/auth'

import {
  TransactionInsertSchema,
  TransactionQueryFiltersSchema,
} from '../schemas/finance.transactions.schema'
import type {
  TransactionCreateOutput,
  TransactionDeleteOutput,
  TransactionListOutput,
  TransactionUpdateOutput,
} from '../types/finance/transactions.types'
import type { TransactionType } from '../types/finance/shared.types'

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

export const transactionsRoutes = new Hono<AppContext>()
  .post('/list', authMiddleware, zValidator('json', transactionListSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const accountId = input.accountId ?? input.account
    const filters = {
      userId,
      ...(accountId ? { accountId } : {}),
      ...(input.dateFrom ? { dateFrom: input.dateFrom } : {}),
      ...(input.dateTo ? { dateTo: input.dateTo } : {}),
      ...(input.tagIds ? { tagIds: input.tagIds } : {}),
      ...(input.tagNames ? { tagNames: input.tagNames } : {}),
      ...(input.limit ? { limit: input.limit } : {}),
      ...(input.offset ? { offset: input.offset } : {}),
    }

    const [data, allUserTransactions] = await Promise.all([
      queryTransactionsByContract(filters),
      queryTransactions(userId),
    ])

    const responseData = data.map((tx) => ({
      id: tx.id,
      userId: tx.userId,
      accountId: tx.accountId,
      amount: tx.amount,
      description: tx.description ?? '',
      date: tx.date,
      type: (tx.amount < 0 ? 'expense' : 'income') as TransactionType,
    }))

    return c.json<TransactionListOutput>(
      {
        data: responseData,
        filteredCount: responseData.length,
        totalUserCount: allUserTransactions.length,
      },
      200,
    )
  })
  .post('/create', authMiddleware, zValidator('json', transactionCreateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')

    const created = await createTransaction({
      userId,
      accountId: input.accountId,
      amount: input.amount,
      description: input.description,
      date: input.date,
      category: null,
      merchantName: null,
    })

    if (input.tagIds && input.tagIds.length > 0) {
      await replaceTransactionTags(created.id, userId, input.tagIds)
    }

    return c.json<TransactionCreateOutput>(
      {
        id: created.id,
        userId: created.userId,
        accountId: created.accountId,
        amount: created.amount,
        description: created.description ?? '',
        date: created.date,
        type: created.amount < 0 ? 'expense' : 'income',
      },
      201,
    )
  })
  .post('/update', authMiddleware, zValidator('json', transactionUpdateSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')

    const amount =
      typeof input.data.amount === 'string' ? Number.parseFloat(input.data.amount) : input.data.amount
    const updated = await updateTransaction(input.id, userId, {
      ...(input.data.accountId ? { accountId: input.data.accountId } : {}),
      ...(amount !== undefined ? { amount } : {}),
      ...(input.data.description !== undefined ? { description: input.data.description } : {}),
      ...(input.data.category !== undefined ? { category: input.data.category } : {}),
      ...(input.data.date !== undefined ? { date: input.data.date } : {}),
      ...(input.data.merchantName !== undefined ? { merchantName: input.data.merchantName } : {}),
    })

    if (!updated) {
      return c.notFound()
    }

    if (input.data.tagIds) {
      await replaceTransactionTags(updated.id, userId, input.data.tagIds)
    }

    return c.json<TransactionUpdateOutput>({
      id: updated.id,
      userId: updated.userId,
      accountId: updated.accountId,
      amount: updated.amount,
      description: updated.description ?? '',
      date: updated.date,
      type: updated.amount < 0 ? 'expense' : 'income',
    })
  })
  .post('/delete', authMiddleware, zValidator('json', transactionDeleteSchema), async (c) => {
    const userId = c.get('userId')!
    const input = c.req.valid('json')
    const deleted = await deleteTransaction(input.id, userId)
    return c.json<TransactionDeleteOutput>({
      success: deleted,
      ...(deleted ? {} : { message: 'Transaction not found' }),
    })
  })
