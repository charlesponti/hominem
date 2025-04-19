// General utilities
import { logger } from '../../../packages/utils/src/logger.ts'

/**
 * Implements a retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 100,
  factor = 2
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 0) {
      throw error
    }
    
    const delay = baseDelay * Math.pow(factor, retries - 1)
    logger.info(`Retrying after ${delay}ms, ${retries} attempts left`)
    
    await new Promise(resolve => setTimeout(resolve, delay))
    return retryWithBackoff(fn, retries - 1, baseDelay, factor)
  }
}

export interface BaseJob {
  id: string
  userId: string
  createdAt: number
}

export interface ImportTransactionsJob extends BaseJob {
  type: 'import-transactions'
  file: string
  accountId?: string
}