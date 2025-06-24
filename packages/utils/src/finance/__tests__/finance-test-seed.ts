import { eq } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '../../db/index.js'
import { financeAccounts, transactions } from '../../db/schema/finance.schema.js'
import { users } from '../../db/schema/users.schema.js'

export const testUserId = crypto.randomUUID()
export const testAccountId = crypto.randomUUID()

export async function seedFinanceTestData() {
  // Create test user
  await db
    .insert(users)
    .values({
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
    })
    .onConflictDoNothing()

  // Create test account
  await db
    .insert(financeAccounts)
    .values({
      id: testAccountId,
      userId: testUserId,
      name: 'Test Account',
      type: 'depository',
      balance: '1000.00',
      isoCurrencyCode: 'USD',
    })
    .onConflictDoNothing()

  // Create test transactions for different months
  const testTransactions = [
    // January 2023 - Income
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '1000.00',
      date: new Date('2023-01-15'),
      description: 'Salary',
      type: 'income' as const,
      category: 'Salary',
      parentCategory: 'Income',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // January 2023 - Expenses
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '-300.00',
      date: new Date('2023-01-20'),
      description: 'Rent',
      type: 'expense' as const,
      category: 'Housing',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '-100.00',
      date: new Date('2023-01-25'),
      description: 'Groceries',
      type: 'expense' as const,
      category: 'Food',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // February 2023 - Income
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '1200.00',
      date: new Date('2023-02-15'),
      description: 'Salary',
      type: 'income' as const,
      category: 'Salary',
      parentCategory: 'Income',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // February 2023 - Expenses
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '-350.00',
      date: new Date('2023-02-20'),
      description: 'Rent',
      type: 'expense' as const,
      category: 'Housing',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '-150.00',
      date: new Date('2023-02-25'),
      description: 'Groceries',
      type: 'expense' as const,
      category: 'Food',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // March 2023 - Income
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '1100.00',
      date: new Date('2023-03-15'),
      description: 'Salary',
      type: 'income' as const,
      category: 'Salary',
      parentCategory: 'Income',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    // March 2023 - Expenses
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '-400.00',
      date: new Date('2023-03-20'),
      description: 'Rent',
      type: 'expense' as const,
      category: 'Housing',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
    {
      userId: testUserId,
      accountId: testAccountId,
      amount: '-200.00',
      date: new Date('2023-03-25'),
      description: 'Groceries',
      type: 'expense' as const,
      category: 'Food',
      parentCategory: 'Expenses',
      excluded: false,
      pending: false,
      status: 'posted',
    },
  ]

  await db.insert(transactions).values(testTransactions)
}

export async function cleanupFinanceTestData() {
  await db.delete(transactions).where(eq(transactions.userId, testUserId))
  await db.delete(financeAccounts).where(eq(financeAccounts.userId, testUserId))
  await db.delete(users).where(eq(users.id, testUserId))
}
