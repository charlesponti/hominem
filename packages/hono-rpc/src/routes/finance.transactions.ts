import { insertTransactionSchema } from '@hominem/db/schema';
import {
  queryTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAccountById,
} from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  transactionListSchema,
  transactionUpdateSchema,
  transactionDeleteSchema,
  type TransactionData,
  type TransactionListOutput,
  type TransactionCreateOutput,
  type TransactionUpdateOutput,
  type TransactionDeleteOutput,
} from '../types/finance.types';

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

    try {
      const result = await queryTransactions({
        ...input,
        userId,
      });

      return c.json<TransactionListOutput>(
        success({
          data: result.data.map(serializeTransaction),
          filteredCount: result.filteredCount,
          totalUserCount: result.totalUserCount,
        }),
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<TransactionListOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error querying transactions:', err);
      return c.json<TransactionListOutput>(error('INTERNAL_ERROR', 'Failed to query transactions'), 500);
    }
  })

  // POST /create - Create new transaction
  .post(
    '/create',
    zValidator('json', insertTransactionSchema.omit({ userId: true })),
    async (c) => {
      const input = c.req.valid('json') as any;
      const userId = c.get('userId')!;

      try {
        // Validate account if provided
        if (input.accountId) {
          const account = await getAccountById(input.accountId, userId);
          if (!account) {
            return c.json<TransactionCreateOutput>(error('NOT_FOUND', 'Account not found'), 404);
          }
        }

        const result = await createTransaction({
          ...input,
          userId,
        });

        return c.json<TransactionCreateOutput>(success(serializeTransaction(result)), 201);
      } catch (err) {
        if (isServiceError(err)) {
          return c.json<TransactionCreateOutput>(error(err.code, err.message), err.statusCode as any);
        }
        console.error('Error creating transaction:', err);
        return c.json<TransactionCreateOutput>(error('INTERNAL_ERROR', 'Failed to create transaction'), 500);
      }
    },
  )

  // POST /update - Update existing transaction
  .post('/update', zValidator('json', transactionUpdateSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof transactionUpdateSchema>;
    const userId = c.get('userId')!;
    const { id, data } = input;

    try {
      // Validate account if provided
      if (data.accountId) {
        const account = await getAccountById(data.accountId, userId);
        if (!account) {
          return c.json<TransactionUpdateOutput>(error('NOT_FOUND', 'Account not found'), 404);
        }
      }

      const result = await updateTransaction({ transactionId: id, ...data } as any, userId);

      if (!result) {
        return c.json<TransactionUpdateOutput>(error('NOT_FOUND', 'Transaction not found'), 404);
      }

      return c.json<TransactionUpdateOutput>(success(serializeTransaction(result)), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<TransactionUpdateOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error updating transaction:', err);
      return c.json<TransactionUpdateOutput>(error('INTERNAL_ERROR', 'Failed to update transaction'), 500);
    }
  })

  // POST /delete - Delete transaction
  .post('/delete', zValidator('json', transactionDeleteSchema), async (c) => {
    const input = c.req.valid('json') as z.infer<typeof transactionDeleteSchema>;
    const userId = c.get('userId')!;

    try {
      const result = await deleteTransaction({ transactionId: input.id }, userId);
      return c.json<TransactionDeleteOutput>(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json<TransactionDeleteOutput>(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Error deleting transaction:', err);
      return c.json<TransactionDeleteOutput>(error('INTERNAL_ERROR', 'Failed to delete transaction'), 500);
    }
  });
