import { parse } from 'csv-parse'
import { EventEmitter } from 'node:events'
import type { FinanceAccount, FinanceTransactionInsert } from '../db/schema'
import { logger } from '../logger'
import type { ProcessTransactionOptions } from '../types'
import { withRetry } from '../utils/retry.utils'
import { convertCopilotTransaction } from './banks/copilot'
import {
  createNewTransaction,
  findExistingTransaction,
  updateTransactionIfNeeded,
} from './finance.service'
import FinancialAccountService from './financial-account.service'

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

async function processTransactionRow({
  account,
  accountsMap,
  userId,
}: {
  account: string
  accountsMap: Map<string, FinanceAccount>
  userId: string
}): Promise<FinanceAccount> {
  let accountEntity = accountsMap.get(account)

  if (!accountEntity) {
    try {
      accountEntity = await FinancialAccountService.createAccount({
        type: 'checking',
        balance: '0',
        name: account,
        institutionId: null,
        meta: null,
        userId,
      })
      accountsMap.set(account, accountEntity)
      logger.info(`Created new account: ${account} for user ${userId}`)
    } catch (error) {
      logger.error(`Failed to create account ${account}:`, error)
      throw new TransactionProcessingError(
        `Failed to create account ${account}: ${error instanceof Error ? error.message : String(error)}`,
        { account, error }
      )
    }
  }

  return accountEntity
}

type ProcessedTransaction = {
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: FinanceTransactionInsert
}
export async function processTransaction(
  tx: FinanceTransactionInsert,
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
        const existingTransaction = await findExistingTransaction({
          date: tx.date,
          amount: tx.amount,
          type: tx.type,
          accountMask: tx.accountMask,
        })

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
  transactions: FinanceTransactionInsert[],
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
  progressEmitter.emit('progress', {
    file: fileName,
    total: transactions.length,
    stats,
  })

  logger.info('Transaction processing completed', {
    fileName,
    success: stats.success,
    failed: stats.failed,
    retried: stats.retried,
    duration: durationSeconds,
    transactionsPerSecond: stats.transactionsPerSecond,
  })
}

type ParsedTransactions = [string, Omit<FinanceTransactionInsert, 'accountId'>][]
export async function parseTransactionString(
  csvString: string,
  userId: string
): Promise<ParsedTransactions> {
  return new Promise((resolve, reject) => {
    try {
      const transactions: ParsedTransactions = []
      let rowIndex = 0
      let successfulRows = 0
      let failedRows = 0

      parse(csvString, { columns: true }, (err, data) => {
        if (err) {
          reject(err)
          return
        }

        logger.info(`Starting to process ${data.length} CSV rows`)

        for (const row of data) {
          rowIndex++
          try {
            // Always pass the required userId
            const transaction = convertCopilotTransaction(row, userId)
            transactions.push([row.account, transaction])
            successfulRows++
          } catch (conversionError) {
            failedRows++
            // Log the error but continue processing other rows
            logger.warn('Failed to convert CSV row to transaction', {
              rowIndex,
              error:
                conversionError instanceof Error
                  ? conversionError.message
                  : String(conversionError),
              rowData: {
                amount: row.amount,
                date: row.date,
                name: row.name,
                account: row.account,
                type: row.type,
              },
            })
            // Skip this invalid row and continue with the next one
          }
        }

        logger.info('CSV parsing completed', {
          totalRows: data.length,
          successfulRows,
          failedRows,
          successRate: data.length > 0 ? Math.round((successfulRows / data.length) * 100) : 0,
        })

        resolve(transactions)
      })
    } catch (error) {
      reject(
        new Error(`CSV parsing error: ${error instanceof Error ? error.message : String(error)}`)
      )
    }
  })
}

export type ProcessTransactionResult = {
  action: 'created' | 'skipped' | 'merged' | 'updated'
  transaction: FinanceTransactionInsert
  file: string
}

/**
 * Convert a CSV of transactions into an array of valid transactions.
 */
export async function* processTransactionsFromCSV({
  fileName,
  csvContent,
  deduplicateThreshold = DEFAULT_PROCESSING_CONFIG.deduplicateThreshold,
  batchSize = DEFAULT_PROCESSING_CONFIG.batchSize,
  batchDelay = DEFAULT_PROCESSING_CONFIG.batchDelay,
  maxRetries = DEFAULT_PROCESSING_CONFIG.maxRetries,
  retryDelay = DEFAULT_PROCESSING_CONFIG.retryDelay,
  userId,
}: ProcessTransactionOptions & {
  accountId?: string
  userId: string
}): AsyncGenerator<ProcessTransactionResult> {
  logger.info({
    msg: 'Starting transaction processing from string',
    fileName,
    deduplicateThreshold,
    batchSize,
    contentLength: csvContent.length,
  })

  try {
    const transactions: FinanceTransactionInsert[] = []

    // Parse CSV string into [account, transaction] pairs.
    const parsed = await parseTransactionString(csvContent, userId)
    logger.info(`Parsed ${parsed.length} transactions from string input`)

    // Get or create account for each transaction.
    const accountsMap = await FinancialAccountService.getAccountsMap()
    for (const [account, tx] of parsed) {
      try {
        const accountEntity = await processTransactionRow({
          account,
          accountsMap,
          userId,
        })
        transactions.push({
          ...tx,
          accountId: accountEntity.id,
        })
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
