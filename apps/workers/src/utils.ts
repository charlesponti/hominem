import { logger } from '@hominem/utils/logger'
import type { BaseJob } from '@hominem/utils/types'

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

    const delay = baseDelay * factor ** (retries - 1)
    logger.info(`Retrying after ${delay}ms, ${retries} attempts left`)

    await new Promise((resolve) => setTimeout(resolve, delay))
    return retryWithBackoff(fn, retries - 1, baseDelay, factor)
  }
}

// Define the structure for job statistics
export interface JobStats {
  created: number
  updated: number
  skipped: number
  merged: number
  total: number
  invalid: number
  errors: string[]
  progress: number // Percentage 0-100
  processingTime: number // Milliseconds
}

export interface ImportTransactionsJob extends BaseJob {
  type: 'import-transactions'
  file: string
  accountId?: string
  error?: string
  startTime: number
  options?: {
    // Add options if they are expected
    deduplicateThreshold?: number
    batchSize?: number
    batchDelay?: number
  }
  stats?: Partial<JobStats> // Make stats optional initially
}
