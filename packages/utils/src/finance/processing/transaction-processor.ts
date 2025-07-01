import crypto from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { FinanceTransaction, FinanceTransactionInsert } from '../../db/schema'
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

// Progress event emitter for monitoring long-running imports
export const progressEmitter = new EventEmitter()

/**
 * Process a large batch of transactions in a more optimized way.
 *
 * This function is designed to handle a large number of transactions at once,
 * for example, from a CSV import. It minimizes database queries by performing
 * bulk operations.
 */
export async function processTransactionsInBulk(
  transactions: FinanceTransactionInsert[]
): Promise<
  Array<{ action: 'created' | 'updated' | 'skipped'; transaction: FinanceTransactionInsert }>
> {
  if (transactions.length === 0) {
    return []
  }

  // 1. Find all existing transactions that could be duplicates.
  const existingTransactions = await findExistingTransaction(
    transactions.map((t) => ({
      date: t.date,
      amount: t.amount,
      type: t.type,
      accountMask: t.accountMask,
    }))
  )

  const existingTxMap = new Map(
    existingTransactions.map((t) => {
      const key = `${t.date.toISOString()}|${t.amount}|${t.type}|${t.accountMask}`
      return [key, t]
    })
  )

  const transactionsToCreate: FinanceTransactionInsert[] = []
  const transactionsToUpdate: Array<{
    newTx: FinanceTransactionInsert
    existingTx: FinanceTransaction
  }> = []

  for (const tx of transactions) {
    const key = `${tx.date.toISOString()}|${tx.amount}|${tx.type}|${tx.accountMask}`
    const existingTx = existingTxMap.get(key)
    if (existingTx) {
      transactionsToUpdate.push({ newTx: tx, existingTx })
    } else {
      transactionsToCreate.push(tx)
    }
  }

  const results: Array<{
    action: 'created' | 'updated' | 'skipped'
    transaction: FinanceTransactionInsert
  }> = []

  // 2. Bulk insert new transactions
  if (transactionsToCreate.length > 0) {
    const newTransactionsWithIds = transactionsToCreate.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
    }))
    await createTransaction(newTransactionsWithIds)
    for (const tx of newTransactionsWithIds) {
      results.push({ action: 'created', transaction: tx })
    }
  }

  // 3. Bulk update existing transactions
  for (const { newTx, existingTx } of transactionsToUpdate) {
    const result = await updateTransactionIfNeeded(newTx, existingTx)
    if (result) {
      results.push({ action: 'updated', transaction: newTx })
    } else {
      results.push({ action: 'skipped', transaction: newTx })
    }
  }

  return results
}

/**
 * Get processing configuration
 */
export function getProcessingConfig(config: Partial<ProcessingConfig> = {}): ProcessingConfig {
  return { ...DEFAULT_PROCESSING_CONFIG, ...config }
}
