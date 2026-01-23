import {
  insertTransactionSchema,
  updateTransactionSchema,
  type FinanceTransaction
} from '@hominem/db/schema';
import {
  createTransaction,
  deleteTransaction,
  getAccountById,
  queryTransactions,
  updateTransaction,
  type QueryTransactionsOutput,
} from '@hominem/finance-services';
import { z } from 'zod';

import { protectedProcedure, router } from '../../procedures';

/**
 * Modularized types for router outputs to prevent excessively deep type inference
 * and provide explicit types for consumers.
 */
export type TransactionListOutput = QueryTransactionsOutput;
export type TransactionDeleteOutput = { success: boolean; message: string };

// Transactions tRPC router
export const transactionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        from: z.string().optional().describe('Start date in YYYY-MM-DD format'),
        to: z.string().optional().describe('End date in YYYY-MM-DD format'),
        category: z.string().optional().describe('Transaction category'),
        min: z.string().optional().describe('Minimum transaction amount'),
        max: z.string().optional().describe('Maximum transaction amount'),
        account: z.string().optional().describe('Account filter'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .default(50)
          .describe('Maximum results to return'),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe('Number of results to skip for pagination'),
        description: z.string().optional().describe('Description search term'),
        search: z.string().optional().describe('Free text search across multiple fields'),
        sortBy: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe('Field(s) to sort by'),
        sortDirection: z
          .union([z.enum(['asc', 'desc']), z.array(z.enum(['asc', 'desc']))])
          .optional()
          .describe('Sort direction(s)'),
      }),
    )
    .query(async ({ input, ctx }): Promise<TransactionListOutput> => {
      return await queryTransactions({ ...input, userId: ctx.userId });
    }),

  create: protectedProcedure
    .input(insertTransactionSchema.omit({ userId: true }))
    .mutation(async ({ input, ctx }): Promise<FinanceTransaction> => {
      if (input.accountId) {
        const account = await getAccountById(input.accountId, ctx.userId);
        if (!account) {
          throw new Error('Account not found');
        }
      }

      // Explicitly map input to avoid anonymous object transformation issues
      return await createTransaction({ ...input, userId: ctx.userId } as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateTransactionSchema.partial(),
      }),
    )
    .mutation(async ({ input, ctx }): Promise<FinanceTransaction> => {
      const { id, data } = input;

      // Optional: Validate accountId if provided
      if (data.accountId) {
        const account = await getAccountById(data.accountId, ctx.userId);
        if (!account) {
          throw new Error('Account not found');
        }
      }

      return await updateTransaction({ transactionId: id, ...data } as any, ctx.userId);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input, ctx }): Promise<TransactionDeleteOutput> => {
      return await deleteTransaction({ transactionId: input.id }, ctx.userId);
    }),
});
