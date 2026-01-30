import type {
  FinanceTransactionOutput,
  FinanceTransactionInput,
  FinanceAccountOutput,
  TransactionType,
  TransactionCreatePayload,
  TransactionUpdatePayload,
  TransactionLocation,
} from '@hominem/db/types/finance';

import { db } from '@hominem/db';
import {
  financeAccounts,
  transactions,
  FinanceTransactionSchema,
  TransactionInsertSchema,
  FinanceAccountSchema,
  TransactionLocationSchema,
} from '@hominem/db/types/finance';
import { logger } from '@hominem/utils/logger';
import { and, asc, desc, eq, gte, like, lte, sql, type SQL } from 'drizzle-orm';
import { type PgColumn } from 'drizzle-orm/pg-core';
import * as z from 'zod';

import type { QueryOptions } from './finance.types';

// Transaction service schemas
export const getTransactionsInputSchema = z.object({
  accountId: z.string().describe('The account ID'),
  from: z.string().optional().describe('Start date (ISO format)'),
  to: z.string().optional().describe('End date (ISO format)'),
  category: z.string().optional().describe('Filter by category'),
  limit: z.number().optional().describe('Max results to return'),
});

const transactionWithAccountSchema = FinanceTransactionSchema.pick({
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

export const updateTransactionOutputSchema = FinanceTransactionSchema;

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

export function buildWhereConditions(options: QueryOptions): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    options.userId ? eq(transactions.userId, options.userId) : undefined,
    options.type && typeof options.type === 'string'
      ? eq(transactions.type, options.type)
      : undefined,
    !options.includeExcluded ? eq(transactions.excluded, false) : undefined,
    eq(transactions.pending, false),
  ];

  const from = options.from ? new Date(options.from) : options.dateFrom;
  if (from) conditions.push(gte(transactions.date, from));
  const to = options.to ? new Date(options.to) : options.dateTo;
  if (to) conditions.push(lte(transactions.date, to));

  const min = options.min ?? options.amountMin?.toString();
  if (min) conditions.push(gte(transactions.amount, min));
  const max = options.max ?? options.amountMax?.toString();
  if (max) conditions.push(lte(transactions.amount, max));

  if (options.category) {
    const cats = Array.isArray(options.category) ? options.category : [options.category];
    const catConditions = cats.map((cat) => {
      const pattern = `%${cat}%`;
      return sql`(${transactions.category} ILIKE ${pattern} OR ${transactions.parentCategory} ILIKE ${pattern})`;
    });
    conditions.push(sql`(${sql.join(catConditions, sql` OR `)})`);
  }

  if (options.account) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        options.account,
      );
    conditions.push(
      isUuid
        ? eq(transactions.accountId, options.account)
        : like(financeAccounts.name, `%${options.account}%`),
    );
  }

  if (options.description) {
    conditions.push(like(transactions.description, `%${options.description}%`));
  }

  if (options.search?.trim()) {
    const term = options.search.trim();
    const tsVector = sql`to_tsvector('english',
      coalesce(${transactions.description}, '') || ' ' ||
      coalesce(${transactions.merchantName}, '') || ' ' ||
      coalesce(${transactions.category}, '') || ' ' ||
      coalesce(${transactions.parentCategory}, '') || ' ' ||
      coalesce(${transactions.tags}, '') || ' ' ||
      coalesce(${transactions.note}, '') || ' ' ||
      coalesce(${transactions.paymentChannel}, '') || ' ' ||
      coalesce(${transactions.source}, '')
    )`;
    conditions.push(sql`${tsVector} @@ websearch_to_tsquery('english', ${term})`);
  }

  const filtered = conditions.filter(Boolean) as SQL[];
  return filtered.length > 0 ? and(...filtered) : undefined;
}

export async function queryTransactions(options: QueryOptions): Promise<QueryTransactionsOutput> {
  const { userId, limit = 100, offset = 0 } = options;
  if (!userId) return { data: [], filteredCount: 0, totalUserCount: 0 };

  const sortBy = Array.isArray(options.sortBy) ? options.sortBy : [options.sortBy || 'date'];
  const sortDir = Array.isArray(options.sortDirection)
    ? options.sortDirection
    : [options.sortDirection || 'desc'];

  const sortMap: Record<string, PgColumn> = {
    date: transactions.date,
    amount: transactions.amount,
    description: transactions.description,
    category: transactions.category,
    id: transactions.id,
  };

  const orderBy = sortBy.map((field, i) => {
    const col = sortMap[field] || transactions.date;
    const dir = sortDir[i] || sortDir[0] || 'desc';
    return dir === 'asc' ? asc(col) : desc(col);
  });

  if (!sortBy.includes('id')) orderBy.push(desc(transactions.id));

  const where = buildWhereConditions(options);

  // Single query for data AND filtered count using window function
  const data = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      status: transactions.status,
      category: transactions.category,
      parentCategory: transactions.parentCategory,
      type: transactions.type,
      accountMask: transactions.accountMask,
      note: transactions.note,
      accountId: transactions.accountId,
      account: financeAccounts,
      filteredCount: sql<number>`count(*) OVER()`.mapWith(Number),
    })
    .from(transactions)
    .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const totalUserCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.excluded, false),
        eq(transactions.pending, false),
      ),
    )
    .then((res) => res[0]?.count ?? 0);

  return {
    data: data as QueryTransactionsOutput['data'],
    filteredCount: data[0]?.filteredCount ?? 0,
    totalUserCount,
  };
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
  date: Date;
  accountMask?: string | null;
  amount: string;
  type: string;
}): Promise<FinanceTransactionOutput | undefined>;
export function findExistingTransaction(
  txs: Array<{
    date: Date;
    accountMask?: string | null;
    amount: string;
    type: string;
  }>,
): Promise<FinanceTransactionOutput[]>;
export async function findExistingTransaction(
  txOrTxs:
    | {
        date: Date;
        accountMask?: string | null;
        amount: string;
        type: string;
      }
    | Array<{
        date: Date;
        accountMask?: string | null;
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
  date: z.date().optional().describe('Transaction date'),
});

export const createTransactionOutputSchema = FinanceTransactionSchema;
export async function createTransaction(
  input: z.infer<typeof createTransactionInputSchema> & { userId?: string },
  userId?: string,
): Promise<FinanceTransactionOutput> {
  const [result] = await createTransactions(
    [
      {
        ...input,
        type: input.type as TransactionType | undefined,
        date: input.date ? new Date(input.date) : new Date(),
      } as Partial<FinanceTransactionInput>,
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
  inputs: Array<Partial<FinanceTransactionInput> & { userId?: string }>,
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

    return {
      ...rest,
      id: rest.id ?? crypto.randomUUID(),
      accountId: rest.accountId!,
      amount: rest.amount!.toString(),
      type: rest.type as TransactionType,
      date: date instanceof Date ? date : new Date(),
      description: rest.description ?? '',
      category: rest.category ?? '',
      userId: effectiveUserId,
      location: rest.location as TransactionLocation,
    } as FinanceTransactionInput;
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
