import type { TransactionType } from '@hominem/db/schema/finance';
import type { TransactionLocation } from '@hominem/db/schema/shared';
import type { FinanceTransactionOutput, FinanceTransactionInput } from '@hominem/db/types/finance';

import { FinanceAccountSchema, TransactionSchema, TransactionInsertSchema } from '@hominem/db';
import { db } from '@hominem/db';
import { financeAccounts, transactions } from '@hominem/db/schema/finance';
import { logger } from '@hominem/utils/logger';
import { and, eq, sql, gte, lte, like, type SQL } from '@hominem/db';
import * as z from 'zod';

import type { QueryOptions } from './finance.types';
import { TransactionQueryBuilder } from './transaction-query-builder';

/**
 * Exported service schemas for transaction operations
 * These are imported from @hominem/db/schema/validations
 */

// Transaction service schemas
export const getTransactionsInputSchema = z.object({
  accountId: z.string().describe('The account ID'),
  from: z.string().optional().describe('Start date (ISO format)'),
  to: z.string().optional().describe('End date (ISO format)'),
  category: z.string().optional().describe('Filter by category'),
  limit: z.number().optional().describe('Max results to return'),
});

const transactionWithAccountSchema = TransactionSchema.pick({
  id: true,
  date: true,
  description: true,
  amount: true,
  status: true,
  category: true,
  parentCategory: true,
  type: true,
  accountMask: true,
  note: true,
  accountId: true,
}).extend({
  account: FinanceAccountSchema.nullable(),
});

export const getTransactionsOutputSchema = z.object({
  transactions: z.array(transactionWithAccountSchema),
  total: z.number(),
});

export const updateTransactionInputSchema = z
  .object({
    transactionId: z.string().describe('The transaction ID'),
  })
  .extend(
    TransactionInsertSchema.pick({
      amount: true,
      description: true,
      category: true,
    }).partial().shape,
  );

export const updateTransactionOutputSchema = TransactionSchema;

export const deleteTransactionInputSchema = z.object({
  transactionId: z.string().describe('The transaction ID'),
});

export const deleteTransactionOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const queryTransactionsOutputSchema = z.object({
  data: z.array(transactionWithAccountSchema),
  filteredCount: z.number(),
  totalUserCount: z.number(),
});

export type QueryTransactionsOutput = z.infer<typeof queryTransactionsOutputSchema>;

/**
 * Build SQL WHERE conditions from query options
 * Used by analytics services for direct SQL construction
 *
 * @param options - Query options including filters
 * @returns SQL condition object or undefined if no filters
 */
export function buildWhereConditions(options?: Partial<QueryOptions>): SQL<unknown> | undefined {
  const conditions: Array<SQL<unknown>> = [];
  const opts = options || {};

  if (opts.userId) {
    conditions.push(eq(transactions.userId, opts.userId));
  }

  if (!opts.includeExcluded) {
    conditions.push(eq(transactions.excluded, false));
    conditions.push(eq(transactions.pending, false));
  }

  if (opts.dateFrom) {
    conditions.push(gte(transactions.date, opts.dateFrom));
  }

  if (opts.dateTo) {
    conditions.push(lte(transactions.date, opts.dateTo));
  }

  if (opts.category) {
    const categories = Array.isArray(opts.category) ? opts.category : [opts.category];
    const categoryConditions = categories.map((cat: string) =>
      sql`(${transactions.category} ILIKE ${`%${cat}%`} OR ${transactions.parentCategory} ILIKE ${`%${cat}%`})`,
    );
    if (categoryConditions.length > 0) {
      conditions.push(sql`(${sql.join(categoryConditions, sql` OR `)})`);
    }
  }

  if (opts.type && typeof opts.type === 'string') {
    conditions.push(eq(transactions.type, opts.type as any));
  }

  if (opts.description) {
    conditions.push(sql`${transactions.description} ILIKE ${`%${opts.description}%`}`);
  }

  if (opts.amountMin !== undefined) {
    conditions.push(gte(transactions.amount, opts.amountMin.toString()));
  }

  if (opts.amountMax !== undefined) {
    conditions.push(lte(transactions.amount, opts.amountMax.toString()));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Query transactions with flexible filtering, sorting, and pagination.
 * Uses TransactionQueryBuilder for composable, type-safe query construction.
 *
 * @param options - Query options including filters, sort, and pagination
 * @returns Transaction data with filtered count and total user count
 */
export async function queryTransactions(options: QueryOptions): Promise<QueryTransactionsOutput> {
  const { userId, limit = 100, offset = 0 } = options;
  if (!userId) return { data: [], filteredCount: 0, totalUserCount: 0 };

  const builder = new TransactionQueryBuilder(userId)
    .filterByDateRange(options.dateFrom, options.dateTo)
    .filterByAmount(options.amountMin, options.amountMax)
    .filterByCategory(options.category)
    .filterByAccount(options.account)
    .filterByDescription(options.description)
    .search(options.search)
    .includeExcluded(options.includeExcluded)
    .paginate(limit, offset);

  // Add type filter if specified
  if (options.type && typeof options.type === 'string') {
    builder.filterByType(options.type as TransactionType);
  }

  // Add sorting
  const sortField = (options.sortBy || 'date') as 'date' | 'amount' | 'description' | 'category' | 'id';
  const sortDirection = options.sortDirection || 'desc';
  builder.sort(sortField, sortDirection);

  return builder.execute();
}

export async function getTransactions(
  input: z.infer<typeof getTransactionsInputSchema>,
  userId: string,
): Promise<z.infer<typeof getTransactionsOutputSchema>> {
  const options: QueryOptions = { userId, ...input };
  const { data, filteredCount } = await queryTransactions(options);
  return {
    transactions: data,
    total: filteredCount,
  };
}

export function findExistingTransaction(tx: {
  date: string;
  accountMask?: string | null | undefined;
  amount: string;
  type: string;
}): Promise<FinanceTransactionOutput | undefined>;
export function findExistingTransaction(
  txs: Array<{
    date: string;
    accountMask?: string | null | undefined;
    amount: string;
    type: string;
  }>,
): Promise<FinanceTransactionOutput[]>;
export async function findExistingTransaction(
  txOrTxs:
    | {
        date: string;
        accountMask?: string | null | undefined;
        amount: string;
        type: string;
      }
    | Array<{
        date: string;
        accountMask?: string | null | undefined;
        amount: string;
        type: string;
      }>,
): Promise<FinanceTransactionOutput | FinanceTransactionOutput[] | undefined> {
  if (Array.isArray(txOrTxs)) {
    if (txOrTxs.length === 0) {
      return [];
    }
    const conditions = txOrTxs.map((tx) =>
      and(
        eq(transactions.date, tx.date),
        eq(transactions.amount, tx.amount),
        eq(transactions.type, tx.type as FinanceTransactionOutput['type']),
        tx.accountMask ? eq(transactions.accountMask, tx.accountMask) : undefined,
      ),
    );
    return db.query.transactions.findMany({
      where: sql.join(conditions, sql` OR `),
    }) as unknown as Promise<FinanceTransactionOutput[]>;
  }
  return db.query.transactions.findFirst({
    where: and(
      eq(transactions.date, txOrTxs.date),
      eq(transactions.amount, txOrTxs.amount),
      eq(transactions.type, txOrTxs.type as FinanceTransactionOutput['type']),
      txOrTxs.accountMask ? eq(transactions.accountMask, txOrTxs.accountMask) : undefined,
    ),
  }) as unknown as Promise<FinanceTransactionOutput | undefined>;
}

export const createTransactionInputSchema = TransactionInsertSchema.pick({
  accountId: true,
  amount: true,
  description: true,
  type: true,
  category: true,
}).extend({
  date: z.string().optional().describe('Transaction date (ISO format)'),
});

export const createTransactionOutputSchema = TransactionSchema;
export async function createTransaction(
  input: z.infer<typeof createTransactionInputSchema> & { userId?: string },
  userId?: string,
): Promise<FinanceTransactionOutput> {
  const [result] = await createTransactions(
    [
      {
        accountId: input.accountId,
        amount: input.amount.toString(),
        type: (input.type as TransactionType) ?? 'expense',
        description: input.description ?? undefined,
        category: input.category ?? undefined,
        date: input.date ?? new Date().toISOString(),
      },
    ],
    userId,
  );
  if (!result) {
    throw new Error('Failed to insert transaction');
  }
  return result;
}

/**
 * Create multiple transactions in a single batch.
 */
export async function createTransactions(
  inputs: Array<
    Partial<Omit<FinanceTransactionInput, 'date'> & { date?: string }> & { userId?: string }
  >,
  userId?: string,
): Promise<FinanceTransactionOutput[]> {
  if (inputs.length === 0) {
    return [];
  }

  const transactionData: FinanceTransactionInput[] = inputs.map((input) => {
    const effectiveUserId = userId ?? input.userId;
    if (!effectiveUserId) {
      throw new Error('User ID is required to create a transaction.');
    }

    const { date, ...rest } = input;

    const dateValue = date ? new Date(date) : new Date();

    return {
      ...rest,
      id: rest.id ?? crypto.randomUUID(),
      accountId: rest.accountId!,
      amount: rest.amount!.toString(),
      type: rest.type as TransactionType,
      date: dateValue,
      description: rest.description ?? '',
      category: rest.category ?? '',
      userId: effectiveUserId,
      location: rest.location as TransactionLocation,
    } as unknown as FinanceTransactionInput;
  });

  try {
    const result = await db.insert(transactions).values(transactionData).returning();
    return result as FinanceTransactionOutput[];
  } catch (error: unknown) {
    logger.error(`Error bulk inserting transactions`, error as Error);
    throw new Error(
      `Failed to insert transactions: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export async function updateTransactionIfNeeded(
  tx: FinanceTransactionInput,
  existingTx: FinanceTransactionOutput,
): Promise<boolean> {
  const updates: Partial<FinanceTransactionInput> = {};

  // Only update empty or null fields if the new transaction has data
  if ((!existingTx.category || existingTx.category === '') && tx.category) {
    updates.category = tx.category;
  }

  if ((!existingTx.parentCategory || existingTx.parentCategory === '') && tx.parentCategory) {
    updates.parentCategory = tx.parentCategory;
  }

  if (!existingTx.note && tx.note) {
    updates.note = tx.note;
  }

  if (!existingTx.tags && tx.tags) {
    updates.tags = tx.tags;
  }

  if (Object.keys(updates).length > 0) {
    try {
      await db.update(transactions).set(updates).where(eq(transactions.id, existingTx.id));
      logger.debug(`Updated transaction ${existingTx.id} with additional metadata`);
      return true;
    } catch (error: unknown) {
      logger.error(`Failed to update transaction ${existingTx.id}:`, error as Error);
      return false;
    }
  }

  return false;
}

export async function updateTransaction(
  input: z.infer<typeof updateTransactionInputSchema>,
  userId: string,
): Promise<FinanceTransactionOutput> {
  try {
    const updates: Partial<FinanceTransactionInput> = {};
    if (input.amount !== undefined) updates.amount = input.amount.toString();
    if (input.description !== undefined) updates.description = input.description;
    if (input.category !== undefined) updates.category = input.category;

    const [updated] = await db
      .update(transactions)
      .set(updates)
      .where(and(eq(transactions.id, input.transactionId), eq(transactions.userId, userId)))
      .returning();

    if (!updated) {
      throw new Error(`Transaction not found or not updated: ${input.transactionId}`);
    }

    return updated;
  } catch (error: unknown) {
    logger.error(`Error updating transaction ${input.transactionId}:`, error as Error);
    throw error;
  }
}

export async function deleteTransaction(
  input: z.infer<typeof deleteTransactionInputSchema>,
  userId: string,
): Promise<z.infer<typeof deleteTransactionOutputSchema>> {
  try {
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, input.transactionId), eq(transactions.userId, userId)));
    return { success: true, message: 'Transaction deleted successfully' };
  } catch (error: unknown) {
    logger.error(`Error deleting transaction ${input.transactionId}:`, error as Error);
    throw error;
  }
}
