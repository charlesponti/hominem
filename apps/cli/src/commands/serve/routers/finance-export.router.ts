import { db } from '@ponti/utils/db'
import logger from '@ponti/utils/logger'
import { financeAccounts, transactions } from '@ponti/utils/schema'
import { createObjectCsvWriter } from 'csv-writer'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import path from 'node:path'
import { z } from 'zod'
import { trpc as t } from '../trpc'

export const transactionsRouter = t.router({
  exportTransactions: t.procedure
    .input(
      z.object({
        output: z.string().default('exported-transactions.csv'),
        from: z.string().optional(),
        to: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const outputPath = path.isAbsolute(input.output)
          ? input.output
          : path.join(process.cwd(), input.output)
        const count = await exportTransactionsToCSV(outputPath, {
          fromDate: input.from,
          toDate: input.to,
          category: input.category,
        })
        return { message: `Exported ${count} transactions to ${outputPath}` }
      } catch (error) {
        logger.error(error)
        throw new Error(
          `Error exporting transactions: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
})

export interface ExportOptions {
  fromDate?: string
  toDate?: string
  category?: string
}

// Export transactions to CSV file
export async function exportTransactionsToCSV(
  outputPath: string,
  options: ExportOptions = {}
): Promise<number> {
  logger.info({
    msg: 'Exporting transactions to CSV',
    outputPath,
    options,
  })

  // Build conditions
  const conditions = []

  if (options.fromDate) {
    conditions.push(gte(transactions.date, new Date(options.fromDate)))
  }

  if (options.toDate) {
    conditions.push(lte(transactions.date, new Date(options.toDate)))
  }

  if (options.category) {
    conditions.push(
      sql`(${transactions.category} = ${options.category} OR ${transactions.parentCategory} = ${options.category})`
    )
  }

  const whereConditions = conditions.length > 0 ? and(...conditions) : undefined

  // Query transactions with names and accounts
  const result = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      status: transactions.status,
      category: transactions.category,
      parentCategory: transactions.parentCategory,
      excluded: transactions.excluded,
      tags: transactions.tags,
      type: transactions.type,
      accountName: financeAccounts.name,
      accountMask: transactions.accountMask,
      note: transactions.note,
      recurring: transactions.recurring,
    })
    .from(transactions)
    .leftJoin(financeAccounts, eq(transactions.accountId, financeAccounts.id))
    .where(whereConditions)
    .orderBy(sql`${transactions.date} DESC`)

  // Map transactions to CSV format
  const records = result.map((t) => ({
    date: t.date,
    description: t.description,
    amount: t.amount,
    status: t.status,
    category: t.category || '',
    parent_category: t.parentCategory || '',
    excluded: t.excluded ? 'true' : 'false',
    tags: t.tags || '',
    type: t.type,
    accountName: t.accountName,
    accountMask: t.accountMask,
    note: t.note || '',
    recurring: t.recurring || '',
  }))

  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'date', title: 'Date' },
      { id: 'description', title: 'Description' },
      { id: 'amount', title: 'Amount' },
      { id: 'status', title: 'Status' },
      { id: 'category', title: 'Category' },
      { id: 'parent_category', title: 'Parent Category' },
      { id: 'excluded', title: 'Excluded' },
      { id: 'tags', title: 'Tags' },
      { id: 'type', title: 'Type' },
      { id: 'accountName', title: 'Account Name' },
      { id: 'accountMask', title: 'Account Mask' },
      { id: 'note', title: 'Note' },
      { id: 'recurring', title: 'Recurring' },
    ],
  })

  // Write records to CSV
  await csvWriter.writeRecords(records)

  return records.length
}
