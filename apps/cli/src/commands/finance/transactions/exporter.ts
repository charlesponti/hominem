import { createObjectCsvWriter } from 'csv-writer'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../../../db'
import { transactionAccounts, transactions } from '../../../db/schema'
import logger from './logger'

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
    conditions.push(gte(transactions.date, options.fromDate))
  }

  if (options.toDate) {
    conditions.push(lte(transactions.date, options.toDate))
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
      name: transactions.name,
      amount: transactions.amount,
      status: transactions.status,
      category: transactions.category,
      parentCategory: transactions.parentCategory,
      excluded: transactions.excluded,
      tags: transactions.tags,
      type: transactions.type,
      accounts: sql<string>`GROUP_CONCAT(DISTINCT ${transactionAccounts.accountName})`,
      accountMasks: sql<string>`GROUP_CONCAT(DISTINCT ${transactionAccounts.accountMask})`,
      note: transactions.note,
      recurring: transactions.recurring,
    })
    .from(transactions)
    .leftJoin(transactionAccounts, eq(transactions.id, transactionAccounts.transactionId))
    .where(whereConditions)
    .groupBy(transactions.id)
    .orderBy(sql`${transactions.date} DESC`)

  // Map transactions to CSV format
  const records = result.map((t) => ({
    date: t.date,
    name: t.name,
    amount: t.amount,
    status: t.status,
    category: t.category || '',
    parent_category: t.parentCategory || '',
    excluded: t.excluded ? 'true' : 'false',
    tags: t.tags || '',
    type: t.type,
    accounts: t.accounts,
    account_masks: t.accountMasks,
    note: t.note || '',
    recurring: t.recurring || '',
  }))

  // Create CSV writer
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'date', title: 'Date' },
      { id: 'name', title: 'Name' },
      { id: 'amount', title: 'Amount' },
      { id: 'status', title: 'Status' },
      { id: 'category', title: 'Category' },
      { id: 'parent_category', title: 'Parent Category' },
      { id: 'excluded', title: 'Excluded' },
      { id: 'tags', title: 'Tags' },
      { id: 'type', title: 'Type' },
      { id: 'accounts', title: 'Accounts' },
      { id: 'account_masks', title: 'Account Masks' },
      { id: 'note', title: 'Note' },
      { id: 'recurring', title: 'Recurring' },
    ],
  })

  // Write records to CSV
  await csvWriter.writeRecords(records)

  return records.length
}
