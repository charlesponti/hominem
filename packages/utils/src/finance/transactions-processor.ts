import { parse } from 'csv-parse'
import csvParser from 'csv-parser'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import { db } from '../db'
import {
  financeAccounts,
  type FinanceAccount,
  type FinanceAccountInsert,
  type TransactionInsert,
} from '../db/schema'
import { logger } from '../logger'
import { withRetry } from '../with-retry'
import { convertCopilotTransaction } from './banks/copilot'
import {
  createNewTransaction,
  findExistingTransaction,
  updateTransactionIfNeeded,
} from './finance.service'

// Configuration for processing
interface ProcessingConfig {
  batchSize: number
  batchDelay: number
  deduplicateThreshold: number
  maxRetries: number // New option for retry logic
  retryDelay: number // Delay between retries in ms
}

// Default processing configuration
const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  batchSize: 10,
  batchDelay: 100,
  deduplicateThreshold: 60,
  maxRetries: 3,
  retryDelay: 500,
}

// Transaction processing stats
interface ProcessingStats {
  success: number
  failed: number
  retried: number
  startTime: number
  endTime?: number
  transactionsPerSecond?: number
}

// Progress event emitter for monitoring long-running imports
export const progressEmitter = new EventEmitter()

// Custom error class for more structured error handling
class TransactionProcessingError extends Error {
  public context: Record<string, unknown>

  constructor(message: string, context: Record<string, unknown>) {
    super(message)
    this.name = 'TransactionProcessingError'
    this.context = context
  }
}

// Retry utility function with exponential backoff

async function getAccountsMap() {
  try {
    const accounts = await db.select().from(financeAccounts)
    return new Map(accounts.map((acc) => [acc.name, acc]))
  } catch (error) {
    logger.error('Failed to fetch accounts', error)
    throw new Error('Failed to fetch accounts from database')
  }
}

async function createAccount(account: FinanceAccountInsert) {
  try {
    const [createdAccount] = await db.insert(financeAccounts).values(account).returning()

    if (!createdAccount) {
      throw Error(`Failed to create account: ${account.name}`)
    }

    return createdAccount
  } catch (error) {
    logger.error(`Error creating account ${account.name}:`, error)
    throw new Error(`Failed to create account: ${account.name}`)
  }
}

async function processTransactionRow({
  data,
  account,
  accountsMap,
}: {
  data: TransactionInsert
  account: string
  accountsMap: Map<string, FinanceAccount>
}) {
  // Validate that amount is a valid number
  if (Number.isNaN(data.amount)) {
    logger.warn(`Invalid amount in row: ${JSON.stringify(data)}`)
    throw Error('Invalid amount')
  }

  if (!accountsMap.get(account)) {
    try {
      const createdAccount = await createAccount({
        id: crypto.randomUUID(),
        type: 'checking',
        balance: '0',
        name: account,
        institutionId: null,
        meta: null,
      })
      accountsMap.set(account, createdAccount)
      logger.info(`Created new account: ${account}`)
    } catch (error) {
      logger.error(`Failed to create account ${account}:`, error)
      throw new Error(
        `Failed to create account ${account}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return data
}

export async function parseTransactionFile(filePath: string): Promise<TransactionInsert[]> {
  logger.info(`Parsing file: ${filePath}`)
  try {
    const accountsMap = await getAccountsMap()

    return new Promise((resolve, reject) => {
      const results: TransactionInsert[] = []

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', async (data) => {
          try {
            const transactionRow = await processTransactionRow({
              data,
              account: data.account,
              accountsMap,
            })
            if (transactionRow) {
              results.push(transactionRow)
            }
          } catch (error) {
            logger.warn(`Skipping invalid row: ${JSON.stringify(data)}`, error)
          }
        })
        .on('end', () => resolve(results))
        .on('error', (err) => reject(err))
    })
  } catch (error) {
    logger.error(`Failed to parse file ${filePath}:`, error)
    throw error
  }
}

type ProcessedTransaction = {
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: TransactionInsert
}

export async function processTransaction(
  tx: TransactionInsert,
  config: Pick<ProcessingConfig, 'maxRetries' | 'retryDelay'> = DEFAULT_PROCESSING_CONFIG
): Promise<ProcessedTransaction> {
  const context = {
    date: tx.date,
    accountId: tx.accountId,
    description: tx.description?.substring(0, 30), // Truncate for logging
    amount: tx.amount,
  }

  try {
    // Add retry logic for database operations
    return await withRetry({
      operation: async () => {
        // Check if transaction already exists
        const existingTransaction = await findExistingTransaction(tx)

        if (existingTransaction) {
          // Handle duplicate transaction
          const result = await updateTransactionIfNeeded(tx, existingTransaction)

          if (result) {
            return { action: 'updated', transaction: tx }
          }
          return { action: 'skipped', transaction: tx }
        }

        // Insert as new transaction
        await createNewTransaction(tx)
        return { action: 'created', transaction: tx }
      },
      context,
      maxRetries: config.maxRetries,
      retryDelay: config.retryDelay,
    })
  } catch (error) {
    const errorMsg = `Error processing transaction: ${tx.date} ${tx.accountId} ${tx.description} ${tx.amount}`
    logger.error(errorMsg, { error, ...context })
    throw new TransactionProcessingError(errorMsg, context)
  }
}

async function* processTransactions(
  transactions: TransactionInsert[],
  fileName: string,
  config: Partial<ProcessingConfig> = {}
): AsyncGenerator<ProcessedTransaction> {
  // Merge default config with provided options
  const processingConfig = { ...DEFAULT_PROCESSING_CONFIG, ...config }
  const { batchSize, batchDelay, maxRetries, retryDelay } = processingConfig

  // Stats tracking
  const stats: ProcessingStats = {
    success: 0,
    failed: 0,
    retried: 0,
    startTime: Date.now(),
  }

  logger.info(
    `Processing ${transactions.length} transactions from ${fileName} in batches of ${batchSize}`
  )

  // Process in batches for better performance while avoiding DB overload
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(transactions.length / batchSize)
    const currentIndex = i

    // Emit progress event for monitoring
    const progressPercentage = Math.round((currentIndex / transactions.length) * 100)
    progressEmitter.emit('progress', {
      file: fileName,
      current: currentIndex,
      total: transactions.length,
      percentage: progressPercentage,
      stats: { ...stats },
    })

    logger.debug(
      `Processing batch ${batchNumber}/${totalBatches} (${i}-${Math.min(i + batchSize, transactions.length)})`
    )

    const batch = transactions.slice(i, i + batchSize)

    // Process batch concurrently
    const results = await Promise.allSettled(
      batch.map((tx) => processTransaction(tx, { maxRetries, retryDelay }))
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        stats.success++
        yield result.value
      } else {
        stats.failed++
        // Check if it was a retry that ultimately failed
        if (result.reason instanceof TransactionProcessingError) {
          logger.error('Failed to process transaction after retries:', result.reason.context)
        } else {
          logger.error(`Failed to process transaction in batch ${batchNumber}:`, result.reason)
        }
      }
    }

    // Add a small delay between batches to avoid overloading the database
    if (i + batchSize < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelay))
    }
  }

  // Final stats
  stats.endTime = Date.now()
  const durationSeconds = (stats.endTime - stats.startTime) / 1000
  stats.transactionsPerSecond =
    durationSeconds > 0
      ? Math.round(((stats.success + stats.failed) / durationSeconds) * 10) / 10
      : 0

  // Emit completion event
  progressEmitter.emit('complete', {
    file: fileName,
    total: transactions.length,
    stats,
  })

  logger.info(
    `Completed processing ${fileName}: ${stats.success} succeeded, ${stats.failed} failed, ${stats.retried} retried, took ${durationSeconds.toFixed(2)}s (${stats.transactionsPerSecond} tx/sec)`
  )
}

// Add dry run functionality to allow validation without saving
export async function* validateTransactions(
  transactions: TransactionInsert[],
  fileName: string
): AsyncGenerator<{
  valid: boolean
  transaction: TransactionInsert
  issue?: string
}> {
  logger.info(`Validating ${transactions.length} transactions from ${fileName}`)

  for (const tx of transactions) {
    try {
      // Basic validation checks
      if (!tx.date) {
        yield { valid: false, transaction: tx, issue: 'Missing date' }
        continue
      }

      if (Number.isNaN(Number(tx.amount))) {
        yield { valid: false, transaction: tx, issue: 'Invalid amount format' }
        continue
      }

      if (!tx.accountId) {
        yield { valid: false, transaction: tx, issue: 'Missing account ID' }
        continue
      }

      // Check for existing transaction without saving
      const existingTransaction = await findExistingTransaction(tx)
      if (existingTransaction) {
        yield {
          valid: true,
          transaction: tx,
          issue: `Duplicate of transaction from ${existingTransaction.date}`,
        }
        continue
      }

      yield { valid: true, transaction: tx }
    } catch (error) {
      logger.warn(`Validation error for transaction: ${tx.description}`, error)
      yield {
        valid: false,
        transaction: tx,
        issue: error instanceof Error ? error.message : String(error),
      }
    }
  }

  logger.info(`Validation completed for ${fileName}`)
}

export async function* processTransactionsFromFile({
  filePath,
  deduplicateThreshold = DEFAULT_PROCESSING_CONFIG.deduplicateThreshold,
  batchSize = DEFAULT_PROCESSING_CONFIG.batchSize,
  batchDelay = DEFAULT_PROCESSING_CONFIG.batchDelay,
}: {
  filePath: string
  deduplicateThreshold?: number
  batchSize?: number
  batchDelay?: number
}): AsyncGenerator<
  ProcessedTransaction & {
    file: string
  }
> {
  logger.info({
    msg: 'Starting transaction processing',
    filePath,
    deduplicateThreshold,
    batchSize,
    batchDelay,
  })

  try {
    const transactions = await parseTransactionFile(filePath)
    logger.info(`Successfully parsed ${transactions.length} transactions from ${filePath}`)

    for await (const result of processTransactions(transactions, filePath, {
      deduplicateThreshold,
      batchSize,
      batchDelay,
    })) {
      yield { ...result, file: filePath }
    }
  } catch (error) {
    logger.error(`Error processing file ${filePath}:`, error)
    throw new Error(
      `Failed to process file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  logger.info({ msg: 'Processing completed', filePath })
}

type ParsedTransactions = [string, TransactionInsert][]
async function parseTransactionString(csvString: string): Promise<ParsedTransactions> {
  return new Promise((resolve, reject) => {
    try {
      const transactions: ParsedTransactions = []

      parse(csvString, { columns: true }, (err, data) => {
        if (err) {
          reject(err)
          return
        }
        logger.info(`Parsed ${data.length} transactions from CSV string`)
        for (const row of data) {
          transactions.push([row.account, convertCopilotTransaction(row)])
        }

        resolve(transactions)
      })
    } catch (error) {
      logger.error('Failed to parse transaction string:', error)
      reject(
        new Error(`CSV parsing error: ${error instanceof Error ? error.message : String(error)}`)
      )
    }
  })
}

export async function* processTransactionsFromString({
  fileName,
  csvContent,
  deduplicateThreshold = DEFAULT_PROCESSING_CONFIG.deduplicateThreshold,
  batchSize = DEFAULT_PROCESSING_CONFIG.batchSize,
  batchDelay = DEFAULT_PROCESSING_CONFIG.batchDelay,
  maxRetries = DEFAULT_PROCESSING_CONFIG.maxRetries,
  retryDelay = DEFAULT_PROCESSING_CONFIG.retryDelay,
}: {
  fileName: string
  csvContent: string
  deduplicateThreshold?: number
  batchSize?: number
  batchDelay?: number
  maxRetries?: number
  retryDelay?: number
}): AsyncGenerator<{
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: TransactionInsert
  file: string
}> {
  logger.info({
    msg: 'Starting transaction processing from string',
    fileName,
    deduplicateThreshold,
    batchSize,
    contentLength: csvContent.length,
  })

  try {
    // Parse CSV string into [account, transaction] pairs.
    const parsed = await parseTransactionString(csvContent)
    // Get existing accountsMap.
    const accountsMap = await getAccountsMap()
    logger.info(`Parsed ${parsed.length} transactions from string input`)

    // Process each parsed row with processTransactionRow.
    const transactions: TransactionInsert[] = []
    for (const [account, tx] of parsed) {
      try {
        const processedTx = await processTransactionRow({ data: tx, account, accountsMap })
        transactions.push(processedTx)
      } catch (error) {
        logger.warn(`Skipping invalid transaction for account ${account}:`, error)
      }
    }

    // Process transactions using the common generator with configured batch settings
    for await (const result of processTransactions(transactions, fileName, {
      deduplicateThreshold,
      batchSize,
      batchDelay,
      maxRetries,
      retryDelay,
    })) {
      yield { ...result, file: fileName }
    }
  } catch (error) {
    logger.error(`Error processing file ${fileName}:`, error)
    throw new Error(
      `Failed to process string content: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  logger.info({ msg: 'Processing completed', fileName })
}
