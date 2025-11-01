import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { extname, join } from 'node:path'
import { Command } from 'commander'
import { consola } from 'consola'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'

interface TransactionRow {
  [key: string]: string
}

interface ProcessingStats {
  totalFiles: number
  totalTransactions: number
  uniqueTransactions: number
  duplicatesRemoved: number
}

/**
 * Duplicate detection using the same logic as the production findExistingTransaction function
 * Matches on: date, amount, type, and accountMask (if present)
 */
function detectDuplicates(transactions: TransactionRow[], verbose = false) {
  const uniqueTransactions: TransactionRow[] = []
  const seen = new Map<string, number>()

  if (verbose) {
    consola.info(`Processing ${transactions.length} transactions for duplicates...`)
  }

  for (let i = 0; i < transactions.length; i++) {
    if (verbose && i % 1000 === 0 && i > 0) {
      consola.info(`  Processed ${i}/${transactions.length} transactions`)
    }

    const transaction = transactions[i]
    const duplicateKey = createDuplicateKey(transaction)

    if (!duplicateKey) {
      // Skip transactions without enough data to create a key
      continue
    }

    const existingIndex = seen.get(duplicateKey)

    if (existingIndex === undefined) {
      // New unique transaction
      seen.set(duplicateKey, uniqueTransactions.length)
      uniqueTransactions.push({
        ...transaction,
        _source_files: transaction._source_file || '',
      })
    } else {
      // Merge with existing transaction
      const existing = uniqueTransactions[existingIndex]
      const merged = mergeTransactionData(existing, transaction)
      uniqueTransactions[existingIndex] = merged
    }
  }

  return uniqueTransactions
}

/**
 * Create a duplicate detection key using the same logic as findExistingTransaction
 * Based on: date, amount, type, accountMask (if present)
 */
function createDuplicateKey(transaction: TransactionRow): string {
  // Extract and normalize date - must match exactly like the DB
  const dateFields = ['date', 'Date', 'DATE', 'transaction_date', 'Transaction Date', 'trans_date']
  const dateField = dateFields.find((field) => transaction[field])
  let normalizedDate = ''

  if (dateField && transaction[dateField]) {
    try {
      // Convert to ISO date string for consistent comparison
      normalizedDate = new Date(transaction[dateField]).toISOString().split('T')[0]
    } catch {
      normalizedDate = transaction[dateField].trim()
    }
  }

  // Extract amount - must match exactly like the DB (as string)
  const amountFields = ['amount', 'Amount', 'AMOUNT', 'debit', 'credit', 'transaction_amount']
  const amountField = amountFields.find((field) => transaction[field])
  let normalizedAmount = ''

  if (amountField && transaction[amountField]) {
    // Clean the amount but keep as string for exact matching
    normalizedAmount = transaction[amountField]
      .replace(/[$,]/g, '')
      .replace(/[()]/g, '-') // Handle negative amounts in parentheses
      .trim()
  }

  // Extract transaction type
  const typeFields = ['type', 'Type', 'TYPE', 'transaction_type', 'trans_type', 'debit_credit']
  const typeField = typeFields.find((field) => transaction[field])
  let normalizedType = ''

  if (typeField && transaction[typeField]) {
    normalizedType = transaction[typeField].trim().toLowerCase()
  }

  // Extract account mask (optional but used if present)
  const accountMaskFields = ['account_mask', 'accountMask', 'account_number', 'account', 'Account']
  const accountMaskField = accountMaskFields.find((field) => transaction[field])
  let normalizedAccountMask = ''

  if (accountMaskField && transaction[accountMaskField]) {
    normalizedAccountMask = transaction[accountMaskField].trim()
  }

  // Create composite key using the same fields as findExistingTransaction
  // Must have date, amount, and type at minimum
  if (!normalizedDate || !normalizedAmount || !normalizedType) {
    return '' // Return empty string for invalid records
  }

  // Build key: date|amount|type|accountMask (if present)
  const keyParts = [normalizedDate, normalizedAmount, normalizedType]
  if (normalizedAccountMask) {
    keyParts.push(normalizedAccountMask)
  }

  return keyParts.join('|')
}

/**
 * Merge transaction data, preferring non-empty values
 */
function mergeTransactionData(existing: TransactionRow, incoming: TransactionRow): TransactionRow {
  const merged = { ...existing }

  // Merge fields, preferring non-empty values
  for (const [key, value] of Object.entries(incoming)) {
    if (value?.trim() && (!merged[key] || !merged[key]?.trim())) {
      merged[key] = value
    }
  }

  // Track source files
  const existingSources =
    existing._source_files?.split(',') ?? [existing._source_file].filter(Boolean)
  const incomingSources =
    incoming._source_files?.split(',') ?? [incoming._source_file].filter(Boolean)

  const allSources = [...new Set([...existingSources, ...incomingSources])].filter(Boolean)
  merged._source_files = allSources.join(',')

  return merged
}

/**
 * Merge CSV files with sophisticated duplicate detection
 */
async function mergeTransactions(options: {
  inputDir: string
  outputFile: string
  verbose: boolean
}): Promise<ProcessingStats> {
  const { inputDir, outputFile, verbose } = options

  if (verbose) {
    consola.info('🔍 Scanning for CSV files...')
  }

  // Get all CSV files in the directory
  const files = readdirSync(inputDir)
    .filter((file) => extname(file).toLowerCase() === '.csv')
    .map((file) => join(inputDir, file))

  if (files.length === 0) {
    throw new Error(`No CSV files found in ${inputDir}`)
  }

  if (verbose) {
    consola.info(`📁 Found ${files.length} CSV files:`)
    for (const file of files) {
      consola.info(`  - ${file.split('/').pop()}`)
    }
  }

  const allTransactions: TransactionRow[] = []
  let headers: string[] = []

  // Process each CSV file
  for (const file of files) {
    try {
      if (verbose) {
        consola.info(`📖 Reading ${file.split('/').pop()}...`)
      }

      const content = readFileSync(file, 'utf-8')
      const records: TransactionRow[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })

      // Store headers from the first file with data
      if (headers.length === 0 && records.length > 0) {
        headers = Object.keys(records[0])
      }

      // Add source file information
      const recordsWithSource = records.map((record) => ({
        ...record,
        _source_file: file.split('/').pop() || file,
      }))

      allTransactions.push(...recordsWithSource)

      if (verbose) {
        consola.success(`  ✅ Added ${records.length} transactions`)
      }
    } catch (error) {
      consola.error(`❌ Error reading ${file.split('/').pop()}:`, error)
    }
  }

  if (allTransactions.length === 0) {
    throw new Error('No transactions found in any CSV files')
  }

  const totalTransactions = allTransactions.length
  if (verbose) {
    consola.info(`📊 Total transactions before deduplication: ${totalTransactions}`)
  }

  // Remove duplicates using sophisticated detection
  const uniqueTransactions = detectDuplicates(allTransactions, verbose)
  const duplicatesRemoved = totalTransactions - uniqueTransactions.length

  if (verbose) {
    consola.info(`📊 Total transactions after deduplication: ${uniqueTransactions.length}`)
    consola.info(`🗑️  Removed ${duplicatesRemoved} duplicates`)
  }

  // Sort by date (most recent first)
  const dateFields = ['date', 'Date', 'DATE', 'transaction_date', 'Transaction Date']
  const dateField = dateFields.find((field) => uniqueTransactions[0]?.[field])

  if (dateField) {
    uniqueTransactions.sort((a, b) => {
      try {
        const dateA = new Date(a[dateField])
        const dateB = new Date(b[dateField])
        return dateB.getTime() - dateA.getTime() // Most recent first
      } catch {
        return 0
      }
    })

    if (verbose) {
      consola.info(`📅 Sorted by ${dateField} (most recent first)`)
    }
  }

  // Prepare output columns
  const outputColumns = [...headers, '_source_files']

  // Write merged CSV
  const csvOutput = stringify(uniqueTransactions, {
    header: true,
    columns: outputColumns,
  })

  writeFileSync(outputFile, csvOutput)

  if (verbose) {
    consola.success(`✅ Merged CSV saved to: ${outputFile}`)
    consola.info(`📈 Final count: ${uniqueTransactions.length} unique transactions`)
  }

  return {
    totalFiles: files.length,
    totalTransactions,
    uniqueTransactions: uniqueTransactions.length,
    duplicatesRemoved,
  }
}

export const mergeTransactionsCommand = new Command('merge-transactions')
  .description('Merge multiple transaction CSV files with intelligent duplicate detection')
  .option(
    '-i, --input <directory>',
    'Input directory containing CSV files',
    `${os.homedir()}/Documents/finance/transactions`
  )
  .option(
    '-o, --output <file>',
    'Output merged CSV file',
    `${os.homedir()}/Documents/finance/merged-transactions.csv`
  )
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (options) => {
    try {
      const stats = await mergeTransactions({
        inputDir: options.input,
        outputFile: options.output,
        verbose: options.verbose,
      })

      if (!options.verbose) {
        // Summary output for non-verbose mode
        consola.success('✅ Transaction merge completed successfully!')
        consola.info(`📁 Processed: ${stats.totalFiles} files`)
        consola.info(`📊 Total transactions: ${stats.totalTransactions}`)
        consola.info(`🎯 Unique transactions: ${stats.uniqueTransactions}`)
        consola.info(`🗑️  Duplicates removed: ${stats.duplicatesRemoved}`)
        consola.info(`💾 Output: ${options.output}`)
      }
    } catch (error) {
      consola.error('❌ Error merging transactions:', error)
      process.exit(1)
    }
  })

export default mergeTransactionsCommand
