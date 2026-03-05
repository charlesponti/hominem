import { and, eq } from 'drizzle-orm'

import { db as defaultDb } from '../../index'
import { financeAccounts } from '../../schema/finance'
import type { FinanceAccountId, UserId } from '../_shared/ids'
import type { Database } from '../client'

type FinanceAccount = typeof financeAccounts.$inferSelect
type FinanceAccountInsert = typeof financeAccounts.$inferInsert
type FinanceAccountUpdate = Partial<Omit<FinanceAccountInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>

export async function listFinanceAccounts(
  userId: UserId,
  db?: Database,
): Promise<FinanceAccount[]> {
  const database = db || (defaultDb as unknown as Database)
  return database.query.financeAccounts.findMany({
    where: eq(financeAccounts.userId, String(userId)),
  })
}

export async function getFinanceAccount(
  accountId: FinanceAccountId,
  userId: UserId,
  db?: Database,
): Promise<FinanceAccount | null> {
  const database = db || (defaultDb as unknown as Database)
  const found = await database.query.financeAccounts.findFirst({
    where: and(eq(financeAccounts.id, String(accountId)), eq(financeAccounts.userId, String(userId))),
  })
  return found ?? null
}

export async function createFinanceAccount(
  input: {
    userId: UserId
    name: string
    accountType: string
    institutionName?: string | null
    institutionId?: string | null
    balance?: string | null
    currency?: string | null
    isActive?: boolean
    data?: Record<string, unknown>
  },
  db?: Database,
): Promise<FinanceAccount> {
  const database = db || (defaultDb as unknown as Database)
  const rows = await database
    .insert(financeAccounts)
    .values({
      userId: String(input.userId),
      name: input.name,
      accountType: input.accountType,
      institutionName: input.institutionName ?? null,
      institutionId: input.institutionId ?? null,
      balance: input.balance ?? '0',
      currency: input.currency ?? 'USD',
      isActive: input.isActive ?? true,
      data: input.data ?? {},
    })
    .returning()

  if (!rows[0]) {
    throw new Error('Failed to create finance account')
  }
  return rows[0]
}

export async function updateFinanceAccount(
  accountId: FinanceAccountId,
  userId: UserId,
  input: FinanceAccountUpdate,
  db?: Database,
): Promise<FinanceAccount | null> {
  const database = db || (defaultDb as unknown as Database)
  const rows = await database
    .update(financeAccounts)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(financeAccounts.id, String(accountId)), eq(financeAccounts.userId, String(userId))))
    .returning()
  return rows[0] ?? null
}

export async function deleteFinanceAccount(
  accountId: FinanceAccountId,
  userId: UserId,
  db?: Database,
): Promise<boolean> {
  const database = db || (defaultDb as unknown as Database)
  const rows = await database
    .delete(financeAccounts)
    .where(and(eq(financeAccounts.id, String(accountId)), eq(financeAccounts.userId, String(userId))))
    .returning()
  return rows.length > 0
}
