import { EventEmitter } from 'node:events'
import type { FinanceAccount, FinanceTransactionInsert } from '../../db/schema'
import { logger } from '../../logger'
import { withRetry } from '../../utils/retry.utils'
import { createAccount, listAccounts } from '../core/account.service'
import {
  createTransaction,
  findExistingTransaction,
  updateTransactionIfNeeded,
} from '../finance.transactions.service'

// Configuration for processing
interface ProcessingConfig {
  batchSize: number
  batchDelay: number
  deduplicateThreshold: number
  maxRetries: number
  retryDelay: number
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

/**
 * Process a single transaction row, creating accounts as needed
 */
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
      // First, try to find existing account in database to handle race conditions
      const existingAccounts = await listAccounts(userId)
      const existingAccount = existingAccounts.find((acc) => acc.name === account)

      if (existingAccount) {
        // Account exists in database but not in our map, add it to map
        accountsMap.set(account, existingAccount)
        logger.info(`Found existing account: ${account} for user ${userId}`)
        return existingAccount
      }

      // Account doesn't exist, create it
      accountEntity = await createAccount({
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

/**
 * Process a single transaction with retry logic
 */
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
        await createTransaction(tx)
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

/**
 * Process transactions in batches with progress tracking
 */
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
        logger.error('Transaction processing failed:', result.reason)
        // You might want to yield an error result here
      }
    }

    // Add delay between batches to avoid overwhelming the database
    if (i + batchSize < transactions.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelay))
    }
  }

  // Final stats update
  stats.endTime = Date.now()
  const duration = (stats.endTime - stats.startTime) / 1000
  stats.transactionsPerSecond = duration > 0 ? stats.success / duration : 0

  logger.info(`Processing completed for ${fileName}:`, {
    success: stats.success,
    failed: stats.failed,
    retried: stats.retried,
    duration: `${duration.toFixed(2)}s`,
    transactionsPerSecond: stats.transactionsPerSecond?.toFixed(2),
  })
}

/**
 * Process transactions with full configuration
 */
export async function processTransactionBatch(
  transactions: FinanceTransactionInsert[],
  fileName: string,
  config: Partial<ProcessingConfig> = {}
): Promise<ProcessedTransaction[]> {
  const results: ProcessedTransaction[] = []

  for await (const result of processTransactions(transactions, fileName, config)) {
    results.push(result)
  }

  return results
}

/**
 * Get processing configuration
 */
export function getProcessingConfig(config: Partial<ProcessingConfig> = {}): ProcessingConfig {
  return { ...DEFAULT_PROCESSING_CONFIG, ...config }
}

/**
 * Validate transaction before processing
 */
export function validateTransaction(tx: FinanceTransactionInsert): string[] {
  const errors: string[] = []

  if (!tx.userId) {
    errors.push('Transaction must have a userId')
  }

  if (!tx.accountId) {
    errors.push('Transaction must have an accountId')
  }

  if (!tx.amount) {
    errors.push('Transaction must have an amount')
  }

  if (!tx.date) {
    errors.push('Transaction must have a date')
  }

  if (!tx.type) {
    errors.push('Transaction must have a type')
  }

  // Validate amount is a valid number
  const amount = Number.parseFloat(tx.amount)
  if (Number.isNaN(amount)) {
    errors.push('Transaction amount must be a valid number')
  }

  // Validate date is a valid date
  if (tx.date instanceof Date && Number.isNaN(tx.date.getTime())) {
    errors.push('Transaction date must be a valid date')
  }

  return errors
}
