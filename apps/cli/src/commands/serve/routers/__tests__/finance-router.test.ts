import { db } from '@ponti/utils/db'
import { financeAccounts, transactions } from '@ponti/utils/schema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FinanceRouter } from '../finance.router'

describe('FinanceRouter', () => {
  const router = new FinanceRouter().router
  const caller = router.createCaller({})

  // Test data
  const testAccount = {
    id: crypto.randomUUID(),
    name: 'Test Account',
    type: 'checking' as const,
    balance: '1000.00',
  }

  const testTransactions = [
    {
      id: crypto.randomUUID(),
      type: 'expense' as const,
      amount: '-50.00',
      date: new Date('2023-01-01'),
      description: 'Test Expense',
      accountId: testAccount.id,
      category: 'Food',
    },
    {
      id: crypto.randomUUID(),
      type: 'income' as const,
      amount: '100.00',
      date: new Date('2023-01-02'),
      description: 'Test Income',
      accountId: testAccount.id,
      category: 'Salary',
    },
  ]

  // Setup and teardown
  beforeAll(async () => {
    await db.insert(financeAccounts).values(testAccount)
    await db.insert(transactions).values(testTransactions)
  })

  afterAll(async () => {
    await db.delete(transactions)
    await db.delete(financeAccounts)
  })

  describe('queryTransactions', () => {
    it('should return transactions with filters', async () => {
      const result = await caller.queryTransactions({
        from: '2023-01-01',
        to: '2023-01-31',
        category: 'Food',
      })

      expect(result).toHaveLength(1)
      expect(result[0].amount).toBe('-50.00')
      expect(result[0].category).toBe('Food')
    })

    it('should handle search across description and notes', async () => {
      const result = await caller.queryTransactions({
        search: 'Test',
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('analyzeTransactions', () => {
    it('should aggregate by category', async () => {
      const result = await caller.analyzeTransactions({
        dimension: 'category',
      })

      expect(result.totalTransactions).toBe(2)
      expect(result.results).toHaveLength(2)
      expect(result.results[0]).toMatchObject({
        category: expect.any(String),
        totalAmount: expect.any(Number),
        count: expect.any(Number),
      })
    })

    it('should aggregate by month', async () => {
      const result = await caller.analyzeTransactions({
        dimension: 'month',
      })

      expect(result.results).toHaveLength(1) // All test transactions are in same month
      expect(result.results[0]).toMatchObject({
        month: '2023-01',
        totalAmount: expect.any(Number),
        count: 2,
      })
    })
  })

  describe('getFinanceSummary', () => {
    it('should return correct summary statistics', async () => {
      const result = await caller.getFinanceSummary({
        from: '2023-01-01',
        to: '2023-01-31',
      })

      expect(result).toMatchObject({
        transactionCount: 2,
        accountCount: 1,
        income: 100,
        expenses: -50,
        netCashflow: 50,
        topExpenseCategories: [
          {
            category: 'Food',
            amount: 50,
          },
        ],
      })
    })
  })

  describe('getTransactionById', () => {
    it('should return transaction details', async () => {
      const result = await caller.getTransactionById({
        id: testTransactions[0].id,
      })
      const transaction = result.transactions
      expect(transaction).toMatchObject({
        id: testTransactions[0].id,
        amount: testTransactions[0].amount,
        category: testTransactions[0].category,
      })
    })

    it('should throw error for non-existent transaction', async () => {
      await expect(
        caller.getTransactionById({
          id: 'non-existent',
        })
      ).rejects.toThrow('invalid input syntax for type uuid: "non-existent"')
    })
  })

  describe('importTransactions', () => {
    it('should process CSV file and return summary', async () => {
      const csvContent = `date,name,amount,status,category,parent_category,excluded,tags,type,account,account_mask,note,recurring
2023-01-03,Test Import,-25.00,posted,Food,Dining,false,,regular,Test Account,,Test note,false`

      const result = await caller.importTransactions({
        csvFile: Buffer.from(csvContent).toString('base64'),
        fileName: 'test.csv',
      })

      expect(result).toMatchObject({
        success: true,
        created: expect.any(Number),
        total: expect.any(Number),
      })
    })
  })
})
