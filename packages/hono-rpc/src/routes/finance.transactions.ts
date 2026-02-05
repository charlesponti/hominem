import {
  queryTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAccountById,
} from '@hominem/finance-services';
import { NotFoundError } from '@hominem/services'
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  transactionCreateSchema,
  transactionDeleteSchema,
  transactionListSchema,
  transactionUpdateSchema,
} from '../schemas/finance.transactions.schema'
import type {
  TransactionCreateOutput,
  TransactionData,
  TransactionDeleteOutput,
  TransactionListOutput,
  TransactionUpdateOutput,
} from '../types/finance.types'

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Serialization Helpers
 */
function serializeTransaction(t: any): TransactionData {
  return {
    ...t,
    date: typeof t.date === 'string' ? t.date : t.date.toISOString(),
    authorizedDate: t.authorizedDate ? (typeof t.authorizedDate === 'string' ? t.authorizedDate : t.authorizedDate.toISOString()) : null,
    createdAt: typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toISOString(),
    updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : t.updatedAt.toISOString(),
    amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount?.toString() || '0'),
  };
}

/**
 * Finance Transactions Routes
 */
export const transactionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - Query transactions
  .post('/list', zValidator('json', transactionListSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof transactionListSchema>;
    const userId = c.get('userId')!;

    const result = await queryTransactions({
      ...input,
      userId,
    });

    return c.json<TransactionListOutput>(
      {
        data: result.data.map(serializeTransaction),
        filteredCount: result.filteredCount,
        totalUserCount: result.totalUserCount,
      },
      200,
    );
  })

    // POST /create - Create new transaction
  .post(
    '/create',
    zValidator('json', transactionCreateSchema),
    async (c) => {
        const input = c.req.valid('json');
        const userId = c.get('userId')!;

      // Validate account if provided
      if (input.accountId) {
        const account = await getAccountById(input.accountId, userId);
        if (!account) {
          throw new NotFoundError('Account not found');
        }
      }

      const result = await createTransaction({
        ...input,
        userId,
      });

      return c.json<TransactionCreateOutput>(serializeTransaction(result), 201);
    },
  )

  // POST /update - Update existing transaction
  .post('/update', zValidator('json', transactionUpdateSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof transactionUpdateSchema>;
    const userId = c.get('userId')!;
    const { id, data } = input;

    // Validate account if provided
    if (data.accountId) {
      const account = await getAccountById(data.accountId, userId);
      if (!account) {
        throw new NotFoundError('Account not found');
      }
    }

    const result = await updateTransaction({ transactionId: id, ...data }, userId);

    if (!result) {
      throw new NotFoundError('Transaction not found');
    }

    return c.json<TransactionUpdateOutput>(serializeTransaction(result), 200);
  })

  // POST /delete - Delete transaction
  .post('/delete', zValidator('json', transactionDeleteSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof transactionDeleteSchema>;
    const userId = c.get('userId')!;

    const result = await deleteTransaction({ transactionId: input.id }, userId);
    return c.json<TransactionDeleteOutput>(result, 200);
  });
