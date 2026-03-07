import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { boolean, date, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { db as defaultDb } from '../../index'
import type { FinanceAccountId, FinanceTransactionId, UserId } from '../_shared/ids'
import type { Database } from '../client'

const financeTransactions = pgTable('finance_transactions', {
  id: uuid('id').defaultRandom().notNull(),
  userId: uuid('user_id').notNull(),
  accountId: uuid('account_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  transactionType: text('transaction_type').notNull(),
  categoryId: uuid('category_id'),
  category: text('category'),
  description: text('description'),
  merchantName: text('merchant_name'),
  date: date('date').notNull(),
  dateRaw: text('date_raw'),
  pending: boolean('pending').default(false),
  source: text('source'),
  externalId: text('external_id'),
  data: jsonb('data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

type FinanceTransaction = typeof financeTransactions.$inferSelect
type FinanceTransactionInsert = typeof financeTransactions.$inferInsert
type FinanceTransactionUpdate = Partial<Omit<FinanceTransactionInsert, 'id' | 'userId' | 'accountId' | 'createdAt'>>

export async function listTransactionsByDateRange(
  userId: UserId,
  fromDate: string,
  toDate: string,
  db?: Database,
): Promise<FinanceTransaction[]> {
  const database = db || (defaultDb as unknown as Database)
  return database
    .select()
    .from(financeTransactions)
    .where(
      and(
      eq(financeTransactions.userId, String(userId)),
      gte(financeTransactions.date, fromDate),
      lte(financeTransactions.date, toDate),
    ),
    )
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.id))
}

export async function listTransactionsByAccount(
  userId: UserId,
  accountId: FinanceAccountId,
  fromDate?: string,
  toDate?: string,
  db?: Database,
): Promise<FinanceTransaction[]> {
  const database = db || (defaultDb as unknown as Database)
  const filters = [
    eq(financeTransactions.userId, String(userId)),
    eq(financeTransactions.accountId, String(accountId)),
  ]
  if (fromDate) {
    filters.push(gte(financeTransactions.date, fromDate))
  }
  if (toDate) {
    filters.push(lte(financeTransactions.date, toDate))
  }
  return database
    .select()
    .from(financeTransactions)
    .where(and(...filters))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.id))
}

export async function getFinanceTransactionByDateId(
  userId: UserId,
  transactionId: FinanceTransactionId,
  date: string,
  db?: Database,
): Promise<FinanceTransaction | null> {
  const database = db || (defaultDb as unknown as Database)
  const found = await database
    .select()
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, String(userId)),
        eq(financeTransactions.id, String(transactionId)),
        eq(financeTransactions.date, date),
      ),
    )
    .limit(1)
  return found[0] ?? null
}

export async function createFinanceTransaction(
  input: {
    userId: UserId
    accountId: FinanceAccountId
    amount: string
    transactionType: string
    category?: string | null
    description?: string | null
    merchantName?: string | null
    date: string
    pending?: boolean
    source?: string | null
    externalId?: string | null
    data?: Record<string, unknown>
  },
  db?: Database,
): Promise<FinanceTransaction> {
  const database = db || (defaultDb as unknown as Database)
  const rows = await database
    .insert(financeTransactions)
    .values({
      userId: String(input.userId),
      accountId: String(input.accountId),
      amount: input.amount,
      transactionType: input.transactionType,
      category: input.category ?? null,
      description: input.description ?? null,
      merchantName: input.merchantName ?? null,
      date: input.date,
      pending: input.pending ?? false,
      source: input.source ?? null,
      externalId: input.externalId ?? null,
      data: input.data ?? {},
    })
    .returning()
  if (!rows[0]) {
    throw new Error('Failed to create finance transaction')
  }
  return rows[0]
}

export async function updateFinanceTransactionByDateId(
  userId: UserId,
  transactionId: FinanceTransactionId,
  date: string,
  input: FinanceTransactionUpdate,
  db?: Database,
): Promise<FinanceTransaction | null> {
  const database = db || (defaultDb as unknown as Database)
  const rows = await database
    .update(financeTransactions)
    .set(input)
    .where(
      and(
        eq(financeTransactions.userId, String(userId)),
        eq(financeTransactions.id, String(transactionId)),
        eq(financeTransactions.date, date),
      ),
    )
    .returning()
  return rows[0] ?? null
}

export async function deleteFinanceTransactionByDateId(
  userId: UserId,
  transactionId: FinanceTransactionId,
  date: string,
  db?: Database,
): Promise<boolean> {
  const database = db || (defaultDb as unknown as Database)
  const rows = await database
    .delete(financeTransactions)
    .where(
      and(
        eq(financeTransactions.userId, String(userId)),
        eq(financeTransactions.id, String(transactionId)),
        eq(financeTransactions.date, date),
      ),
    )
    .returning()
  return rows.length > 0
}
