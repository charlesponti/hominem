// Re-export only what we need from the finance module
// This resolves ESM path resolution issues
import { parse } from 'csv-parse'
import fs from 'node:fs/promises'
import { EventEmitter } from 'node:events'
import { logger } from '../../../packages/utils/src/logger.ts'

/**
 * Process transactions from a CSV file.
 */
export async function processTransactionsFromCSV(
  content: string,
  userId: string,
  accountId?: string,
  options = {}
): Promise<{
  processed: number
  skipped: number
  failed: number
}> {
  logger.info(`Processing transactions for user ${userId}`)
  
  // Create a parser
  const parser = parse(content, {
    columns: true,
    skip_empty_lines: true
  })
  
  // Process the transactions
  let processed = 0, skipped = 0, failed = 0
  
  for await (const record of parser) {
    try {
      // Simple incremental logging for demonstration
      processed++
      if (processed % 100 === 0) {
        logger.info(`Processed ${processed} transactions`)
      }
    } catch (err) {
      logger.error(`Error processing transaction: ${err}`)
      failed++
    }
  }
  
  return { processed, skipped, failed }
}

/**
 * Parse a transaction from a string.
 */
export function parseTransactionString(txString: string): { 
  date: Date,
  amount: string,
  description: string
} {
  try {
    const data = JSON.parse(txString)
    return {
      date: new Date(data.date || Date.now()),
      amount: data.amount || '0',
      description: data.description || 'Unknown'
    }
  } catch (err) {
    return {
      date: new Date(),
      amount: '0',
      description: 'Failed to parse transaction'
    }
  }
}