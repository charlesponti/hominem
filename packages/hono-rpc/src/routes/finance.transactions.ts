import { insertTransactionSchema } from '@hominem/db/schema';
import {
  queryTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getAccountById,
} from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Transactions Routes
 *
 * Handles all transaction-related operations:
 * - POST /list - Query transactions with filters
 * - POST /create - Create new transaction
 * - POST /update - Update existing transaction
 * - POST /delete - Delete transaction
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const transactionListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  account: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  description: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.array(z.string()).optional(),
  sortDirection: z.array(z.enum(['asc', 'desc'])).optional(),
});

const transactionUpdateSchema = z.object({
  id: z.uuid(),
  data: z.object({
    accountId: z.uuid().optional(),
    amount: z.number().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    date: z.date().optional(),
    merchantName: z.string().optional(),
    note: z.string().optional(),
    tags: z.string().optional(),
    excluded: z.boolean().optional(),
    recurring: z.boolean().optional(),
  }),
});

const transactionDeleteSchema = z.object({
  id: z.uuid(),
});

// Export schemas for type derivation
export { transactionListSchema, transactionUpdateSchema, transactionDeleteSchema };

// ============================================================================
// Routes
// ============================================================================

export const transactionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - Query transactions
  .post('/list', zValidator('json', transactionListSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await queryTransactions({
        ...input,
        userId,
      });

      return c.json(result);
    } catch (error) {
      console.error('Error querying transactions:', error);
      return c.json({ error: 'Failed to query transactions' }, 500);
    }
  })

  // POST /create - Create new transaction
  .post(
    '/create',
    zValidator('json', insertTransactionSchema.omit({ userId: true })),
    async (c) => {
      const input = c.req.valid('json');
      const userId = c.get('userId')!;

      try {
        // Validate account if provided
        if (input.accountId) {
          const account = await getAccountById(input.accountId, userId);
          if (!account) {
            return c.json({ error: 'Account not found' }, 404);
          }
        }

        const result = await createTransaction({
          ...input,
          userId,
        });

        return c.json(result);
      } catch (error) {
        console.error('Error creating transaction:', error);
        return c.json({ error: 'Failed to create transaction' }, 500);
      }
    },
  )

  // POST /update - Update existing transaction
  .post('/update', zValidator('json', transactionUpdateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;
    const { id, data } = input;

    try {
      // Validate account if provided
      if (data.accountId) {
        const account = await getAccountById(data.accountId, userId);
        if (!account) {
          return c.json({ error: 'Account not found' }, 404);
        }
      }

      const result = await updateTransaction({ transactionId: id, ...data } as any, userId);

      return c.json(result);
    } catch (error) {
      console.error('Error updating transaction:', error);
      return c.json({ error: 'Failed to update transaction' }, 500);
    }
  })

  // POST /delete - Delete transaction
  .post('/delete', zValidator('json', transactionDeleteSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const result = await deleteTransaction({ transactionId: input.id }, userId);

      return c.json(result);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return c.json({ error: 'Failed to delete transaction' }, 500);
    }
  });
