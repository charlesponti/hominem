import { initTRPC } from '@trpc/server'
import { and, eq, gte, like, lte, or, sql, type SQLWrapper } from 'drizzle-orm'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { db } from '../../../db'
import { accounts, transactionAccounts, transactionNames, transactions } from '../../../db/schema'
import { processTransactions } from '../../finance/transactions/processor'

// Initialize tRPC
const t = initTRPC.create()

// Schemas for input validation
const dateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

const transactionFilterSchema = dateRangeSchema.extend({
  category: z.string().optional(),
  search: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  account: z.string().optional(),
  limit: z.number().default(100),
})

export class FinanceRouter {
  // Create router instance
  public router = t.router({
    // Import transactions from CSV file
    importTransactions: t.procedure
      .input(
        z.object({
          csvFile: z.string(), // Base64 encoded CSV file content
          fileName: z.string().default('transactions.csv'),
          fileDate: z.string().optional(), // Optional date in YYYY-MM-DD format
          deduplicateThreshold: z.number().default(60),
        })
      )
      .mutation(async ({ input }) => {
        // Create a temporary directory for storing the uploaded CSV
        const tmpDir = path.join(os.tmpdir(), `finance-import-${Date.now()}`)
        await fs.ensureDir(tmpDir)

        try {
          // Format the file name to match the expected format for the transaction processor
          // The processor expects files to start with "transactions-" followed by a date
          const date = input.fileDate || new Date().toISOString().split('T')[0]
          const formattedFileName = `transactions-${date}.csv`

          const filePath = path.join(tmpDir, formattedFileName)

          // Decode and write the CSV file to the temporary directory
          const buffer = Buffer.from(input.csvFile, 'base64')
          await fs.writeFile(filePath, buffer)

          // Create a detailed summary
          const summary = {
            success: true,
            originalFileName: input.fileName,
            processedFileName: formattedFileName,
            fileDate: date,
            created: 0,
            updated: 0,
            skipped: 0,
            merged: 0,
            total: 0,
            timestamp: new Date().toISOString(),
            deduplicationPercentage: 0,
          }

          // Process the uploaded file
          const result = processTransactions(tmpDir, input.deduplicateThreshold)
          for await (const tx of result) {
            switch (tx.action) {
              case 'updated':
                summary.updated++
                break
              case 'created':
                summary.created++
                break
              case 'skipped':
                summary.skipped++
                break
              case 'merged':
                summary.merged++
                break
            }
            summary.total++
          }

          const processed = summary.created + summary.updated + summary.merged
          summary.deduplicationPercentage =
            processed + summary.skipped > 0
              ? Math.round((summary.skipped / (processed + summary.skipped)) * 100)
              : 0

          return summary
        } catch (error) {
          return {
            success: false,
            originalFileName: input.fileName,
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }
        } finally {
          // Clean up the temporary directory
          await fs.remove(tmpDir)
        }
      }),

    // Get account list
    getAccounts: t.procedure
      .input(
        z
          .object({
            activeOnly: z.boolean().default(false),
          })
          .optional()
      )
      .query(async ({ input }) => {
        if (input?.activeOnly) {
          return db
            .select()
            .from(accounts)
            .where(eq(accounts.isActive, true))
            .orderBy(accounts.name)
        }

        return db.select().from(accounts).orderBy(accounts.name)
      }),

    // Update account details
    updateAccount: t.procedure
      .input(
        z.object({
          id: z.number(),
          data: z.object({
            name: z.string().optional(),
            type: z.string().optional(),
            institution: z.string().optional(),
            isActive: z.boolean().optional(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        const { id, data } = input

        // Check if account exists
        const account = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
        if (account.length === 0) {
          throw new Error(`Account with ID ${id} not found`)
        }

        // Apply updates
        const updates: Partial<typeof accounts.$inferSelect> = {
          ...data,
          updatedAt: new Date().toISOString(),
        }

        await db.update(accounts).set(updates).where(eq(accounts.id, id))

        // Return updated account
        return db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
      }),

    // Query transactions
    queryTransactions: t.procedure.input(transactionFilterSchema).query(async ({ input }) => {
      const conditions: (SQLWrapper | undefined)[] = []

      // Add date range filters
      if (input.from) {
        conditions.push(gte(transactions.date, input.from))
      }

      if (input.to) {
        conditions.push(lte(transactions.date, input.to))
      }

      // Add category filter
      if (input.category) {
        conditions.push(like(transactions.category, `%${input.category}%`))
      }

      // Add amount range filters
      if (input.minAmount !== undefined) {
        conditions.push(gte(transactions.amount, input.minAmount))
      }

      if (input.maxAmount !== undefined) {
        conditions.push(lte(transactions.amount, input.maxAmount))
      }

      // Apply account filter
      if (input.account) {
        conditions.push(eq(transactions.account, input.account))
      }

      // Apply text search across name and note fields
      if (input.search) {
        conditions.push(
          or(
            like(transactions.name, `%${input.search}%`),
            like(transactions.note || '', `%${input.search}%`)
          )
        )
      }

      // Execute query with filters and limit
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      return db
        .select()
        .from(transactions)
        .where(whereClause)
        .orderBy(sql`${transactions.date} DESC`)
        .limit(input.limit)
    }),

    // Analyze transactions by different dimensions
    analyzeTransactions: t.procedure
      .input(
        dateRangeSchema.extend({
          dimension: z.enum(['category', 'month', 'merchant', 'account']),
          top: z.number().default(10),
        })
      )
      .query(async ({ input }) => {
        const conditions = []

        // Add date range filters
        if (input.from) {
          conditions.push(gte(transactions.date, input.from))
        }

        if (input.to) {
          conditions.push(lte(transactions.date, input.to))
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined

        // Base query to get filtered transactions
        const query = db.select().from(transactions).where(whereClause)

        // Get all matching transactions
        const allTransactions = await query

        // Perform aggregation based on the selected dimension
        let results = []

        if (input.dimension === 'category') {
          // Group by category
          const categoryMap = new Map()

          for (const tx of allTransactions) {
            const category = tx.category || 'Uncategorized'
            if (!categoryMap.has(category)) {
              categoryMap.set(category, {
                category,
                totalAmount: 0,
                count: 0,
              })
            }

            const entry = categoryMap.get(category)
            entry.totalAmount += tx.amount
            entry.count++
          }

          results = Array.from(categoryMap.values())
            .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
            .slice(0, input.top)
        } else if (input.dimension === 'month') {
          // Group by month
          const monthMap = new Map()

          for (const tx of allTransactions) {
            const month = tx.date.substring(0, 7) // YYYY-MM
            if (!monthMap.has(month)) {
              monthMap.set(month, {
                month,
                totalAmount: 0,
                count: 0,
              })
            }

            const entry = monthMap.get(month)
            entry.totalAmount += tx.amount
            entry.count++
          }

          results = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
        } else if (input.dimension === 'merchant') {
          // Group by merchant name
          const merchantMap = new Map()

          for (const tx of allTransactions) {
            const merchant = tx.name
            if (!merchantMap.has(merchant)) {
              merchantMap.set(merchant, {
                merchant,
                totalAmount: 0,
                count: 0,
              })
            }

            const entry = merchantMap.get(merchant)
            entry.totalAmount += tx.amount
            entry.count++
          }

          results = Array.from(merchantMap.values())
            .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
            .slice(0, input.top)
        } else if (input.dimension === 'account') {
          // Group by account (no normalization needed as data is fixed)
          const accountMap = new Map()

          for (const tx of allTransactions) {
            const account = tx.account

            if (!accountMap.has(account)) {
              accountMap.set(account, {
                account,
                totalAmount: 0,
                count: 0,
              })
            }

            const entry = accountMap.get(account)
            entry.totalAmount += tx.amount
            entry.count++
          }

          results = Array.from(accountMap.values())
            .sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount))
            .slice(0, input.top)
        }

        return {
          totalTransactions: allTransactions.length,
          totalAmount: allTransactions.reduce((sum, tx) => sum + tx.amount, 0),
          results,
        }
      }),

    // Get transaction details by ID
    getTransactionById: t.procedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .query(async ({ input }) => {
        const transaction = await db
          .select()
          .from(transactions)
          .where(eq(transactions.id, input.id))
          .limit(1)

        if (transaction.length === 0) {
          throw new Error(`Transaction with ID ${input.id} not found`)
        }

        // Get all associated names
        const names = await db
          .select()
          .from(transactionNames)
          .where(eq(transactionNames.transactionId, input.id))

        // Get all associated accounts
        const accountEntries = await db
          .select()
          .from(transactionAccounts)
          .leftJoin(accounts, eq(transactionAccounts.accountId, accounts.id))
          .where(eq(transactionAccounts.transactionId, input.id))

        return {
          ...transaction[0],
          names: names.map((n) => n.name),
          accounts: accountEntries.map((a) => ({
            id: a.accounts?.id,
            name: a.accounts?.name || a.transaction_accounts.accountName,
            mask: a.accounts?.mask || a.transaction_accounts.accountMask,
          })),
        }
      }),

    // Get summary statistics
    getFinanceSummary: t.procedure.input(dateRangeSchema.optional()).query(async ({ input }) => {
      const conditions: (SQLWrapper | undefined)[] = []

      // Add date range filters
      if (input?.from) {
        conditions.push(gte(transactions.date, input.from))
      }

      if (input?.to) {
        conditions.push(lte(transactions.date, input.to))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get transactions for summary
      const allTransactions = await db.select().from(transactions).where(whereClause)

      // Total accounts
      const uniqueAccounts = await db.select().from(accounts)

      // Calculate income vs. expenses
      const income = allTransactions
        .filter((tx) => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0)

      const expenses = allTransactions
        .filter((tx) => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0)

      // Top categories
      const categoryMap = new Map()
      for (const tx of allTransactions) {
        if (tx.amount < 0) {
          // Only consider expenses for top categories
          const category = tx.category || 'Uncategorized'
          if (!categoryMap.has(category)) {
            categoryMap.set(category, 0)
          }
          categoryMap.set(category, categoryMap.get(category) + Math.abs(tx.amount))
        }
      }

      const topCategories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount }))

      return {
        transactionCount: allTransactions.length,
        accountCount: uniqueAccounts.length,
        income,
        expenses,
        netCashflow: income + expenses,
        topExpenseCategories: topCategories,
      }
    }),
  })
}
