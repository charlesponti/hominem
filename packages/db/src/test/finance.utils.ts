import { and, eq } from 'drizzle-orm'

import { db } from '../index'
import { financeAccounts, financeTransactionsDefault } from '../schema/finance'
import { users } from '../schema/tasks'
import { createTestUser } from './fixtures'

export async function seedFinanceTestData({
  userId,
  accountId,
  institutionId,
  plaid = false,
}: {
  userId: string
  accountId: string
  institutionId: string
  plaid?: boolean
}) {
  await cleanupFinanceTestData({ userId, accountId, institutionId })
  await createTestUser({
    id: userId,
    email: `test-${userId.slice(0, 8)}@example.com`,
  })

  await db
    .insert(financeAccounts)
    .values({
      id: accountId,
      userId,
      name: `Test Account ${accountId.slice(0, 8)}`,
      accountType: 'checking',
      institutionName: institutionId,
      institutionId,
      balance: '5000.00',
      currency: 'USD',
      isActive: true,
      data: {},
    })
    .onConflictDoNothing()

  await db
    .insert(financeTransactionsDefault)
    .values([
      {
        userId,
        accountId,
        amount: '1000.00',
        transactionType: 'income',
        category: 'Salary',
        description: 'Salary',
        merchantName: 'Employer',
        date: '2023-01-15',
        dateRaw: '2023-01-15',
        pending: false,
        source: plaid ? 'plaid' : 'manual',
        data: {},
      },
      {
        userId,
        accountId,
        amount: '-100.00',
        transactionType: 'expense',
        category: 'Food',
        description: 'Groceries',
        merchantName: 'Store',
        date: '2023-01-20',
        dateRaw: '2023-01-20',
        pending: false,
        source: plaid ? 'plaid' : 'manual',
        data: {},
      },
    ])
    .onConflictDoNothing()
}

export async function cleanupFinanceTestData({
  userId,
  accountId,
  institutionId: _institutionId,
}: {
  userId: string
  accountId: string
  institutionId: string
}) {
  await db
    .delete(financeTransactionsDefault)
    .where(and(eq(financeTransactionsDefault.userId, userId), eq(financeTransactionsDefault.accountId, accountId)))
    .catch(() => {})

  await db
    .delete(financeAccounts)
    .where(and(eq(financeAccounts.userId, userId), eq(financeAccounts.id, accountId)))
    .catch(() => {})

  await db.delete(users).where(eq(users.id, userId)).catch(() => {})
}
