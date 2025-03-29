import {
  parseTransactionString,
  processTransactionsFromString,
  type ProcessTransactionOptions,
} from '@ponti/utils/finance'
import { logger } from '@ponti/utils/logger'
import { redis } from '@ponti/utils/redis'
import type { ImportJob } from '@ponti/utils/types'

// Redis prefixes and TTLs
export const IMPORT_JOBS_LIST = 'import:active-jobs'
export const IMPORT_JOB_PREFIX = 'import:job:'
export const IMPORT_JOB_TTL = 60 * 60 // 1 hour
export const IMPORT_PROGRESS_CHANNEL = 'import:progress'

/**
 * Update job status in Redis
 */
export async function updateJobStatus(jobId: string, update: Partial<ImportJob>) {
  const jobKey = `${IMPORT_JOB_PREFIX}${jobId}`
  try {
    const current = JSON.parse((await redis.get(jobKey)) || '{}') as ImportJob
    const updated = { ...current, ...update }

    // Update job in Redis
    await redis.set(jobKey, JSON.stringify(updated), 'EX', IMPORT_JOB_TTL)

    // Publish progress update if provided
    if (update.stats?.progress !== undefined) {
      await redis.publish(IMPORT_PROGRESS_CHANNEL, JSON.stringify(updated))
    }

    return updated
  } catch (error) {
    logger.error(`Failed to update job status for ${jobId}:`, error)
    throw error
  }
}

/**
 * Process an import job in the background
 */
export async function processImportJob(jobId: string, input: ProcessTransactionOptions) {
  logger.info(`Starting import job ${jobId} for file ${input.fileName}`)

  try {
    // Update job to processing status
    await updateJobStatus(jobId, {
      status: 'processing',
      stats: { progress: 0 },
    })

    // Extract CSV content
    const decodedContent = Buffer.from(input.csvContent, 'base64').toString('utf-8')

    // Parse CSV to get transaction count
    const parsedCSV = await parseTransactionString(decodedContent)
    const totalTransactions = parsedCSV.length

    logger.info(`Job ${jobId}: Parsed ${totalTransactions} transactions from CSV`)

    // Set up stats tracking
    const stats = {
      created: 0,
      updated: 0,
      skipped: 0,
      merged: 0,
      total: 0,
      invalid: 0,
      errors: [] as string[],
      progress: 0,
      processingTime: 0,
    }

    const startTime = Date.now()

    // Process transactions and track progress
    for await (const result of processTransactionsFromString({
      ...input,
      fileName: input.fileName,
      csvContent: decodedContent,
    })) {
      // Update stats based on action
      if (result.action) {
        stats[result.action]++
      }
      stats.total++

      // Calculate progress percentage
      const progress = Math.min(100, Math.round((stats.total / totalTransactions) * 100))
      stats.progress = progress
      stats.processingTime = Date.now() - startTime

      // Update job status at regular intervals or every 5% progress change
      if (stats.total % 10 === 0 || progress % 5 === 0) {
        await updateJobStatus(jobId, { stats })
      }
    }

    // Update final job status
    const endTime = Date.now()
    stats.processingTime = endTime - startTime

    logger.info(
      `Job ${jobId} completed: ${stats.total} transactions processed in ${stats.processingTime}ms`
    )

    await updateJobStatus(jobId, {
      status: 'done',
      endTime,
      stats: {
        ...stats,
        progress: 100,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Job ${jobId} failed:`, error)

    await updateJobStatus(jobId, {
      status: 'error',
      endTime: Date.now(),
      error: errorMessage,
      stats: {
        progress: 0,
        errors: [errorMessage],
      },
    })
  }
}
