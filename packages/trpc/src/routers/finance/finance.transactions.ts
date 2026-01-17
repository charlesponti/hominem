import { insertTransactionSchema, updateTransactionSchema } from '@hominem/db/schema';
import {
  createTransaction,
  deleteTransaction,
  getAccountById,
  queryTransactions,
  updateTransaction,
} from '@hominem/finance-services';
import { z } from 'zod';

import { protectedProcedure, router } from '../../procedures';

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
    .query(async ({ input, ctx }) => {
      const result = await queryTransactions({ ...input, userId: ctx.userId });
      return result;
    }),

  create: protectedProcedure
    .input(insertTransactionSchema.omit({ userId: true }))
    .mutation(async ({ input, ctx }) => {
      if (input.accountId) {
        const account = await getAccountById(input.accountId, ctx.userId);
        if (!account) {
          throw new Error('Account not found');
        }
      }

      return await createTransaction({ ...input, userId: ctx.userId } as any);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: updateTransactionSchema.partial(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { id, data } = input;

      // Optional: Validate accountId if provided
      if (data.accountId) {
        const account = await getAccountById(data.accountId, ctx.userId);
        if (!account) {
          throw new Error('Account not found');
        }
      }

      return await updateTransaction(id, ctx.userId, data as any);
    }),

  delete: protectedProcedure.input(z.object({ id: z.uuid() })).mutation(async ({ input, ctx }) => {
    await deleteTransaction(input.id, ctx.userId);
    return { success: true, message: 'Transaction deleted successfully' };
  }),
});
