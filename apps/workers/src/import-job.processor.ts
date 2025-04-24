import { processTransactionsFromCSV } from '@hominem/utils/finance'
import type { ImportTransactionsJob, JobStats } from '@hominem/utils/jobs'
import { logger } from '@hominem/utils/logger'
import type { Job } from 'bullmq'
import { JOB_PROCESSING } from './config'
import { getImportFileContent, removeJobFromQueue } from './import-job-utils'
import { JobStatusService } from './job-status.service'

/**
 * Class responsible for processing import jobs
 */
export class ImportJobProcessor {
  /**
   * Process a BullMQ job
   */
  static async processBullMQJob(bullJob: Job<ImportTransactionsJob>): Promise<any> {
    try {
      logger.info(`Processing BullMQ job ${bullJob.id}`)

      // Update progress
      await bullJob.updateProgress(0)

      const jobData = bullJob.data

      // BullMQ jobs have the CSV content directly in the job data
      if (!jobData.csvContent) {
        throw new Error(`CSV content not found in job ${bullJob.id}`)
      }

      // Initialize stats with explicit typing and default values
      const stats: JobStats = {
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
        total: 0,
        invalid: 0,
        errors: [],
        progress: 0,
        processingTime: 0,
      }

      const startTime = Date.now()

      try {
        await JobStatusService.markJobProcessing(bullJob.id)

        // Process the CSV content directly from job data
        const decodedContent = await ImportJobProcessor.decodeAndValidateContent(
          bullJob.id,
          jobData.csvContent
        )

        // Create a custom version of the JobStatusService.updateJobProgress method
        // that updates BullMQ progress directly
        const updateBullJobProgress = async (progress: number) => {
          await bullJob.updateProgress(progress)
          logger.debug(`Updated BullMQ job ${bullJob.id} progress to ${progress}%`)
        }
        
        // Process the content
        await ImportJobProcessor.processCSVContent(
          {
            ...jobData,
            jobId: bullJob.id, // Ensure jobId is set to the BullMQ job id
            // Add a custom progress updater
            progressUpdater: updateBullJobProgress
          },
          decodedContent,
          stats,
          startTime
        )

        // Mark job as complete
        stats.progress = 100
        stats.processingTime = Date.now() - startTime

        // Update BullMQ progress
        await bullJob.updateProgress(100)

        // Log success
        logger.info(`BullMQ job ${bullJob.id} completed successfully`, {
          stats,
          processingTime: stats.processingTime,
        })

        return {
          success: true,
          stats,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`BullMQ job ${bullJob.id} processing failed:`, error)

        if (stats.errors) {
          stats.errors.push(errorMessage)
        } else {
          stats.errors = [errorMessage]
        }

        stats.processingTime = Date.now() - startTime
        await JobStatusService.markJobError(bullJob.id, errorMessage, stats)

        throw error
      }
    } catch (error) {
      logger.error(`Error processing BullMQ job ${bullJob.id}:`, error)
      throw error
    }
  }

  /**
   * Process a single import job
   */
  static async processJob(job: ImportTransactionsJob): Promise<any> {
    const { jobId, fileName, userId } = job

    // Check that userId exists
    if (!userId) {
      logger.error(`Job ${jobId} has no userId, cannot process`)
      await JobStatusService.markJobError(jobId, 'Missing userId in job', {
        created: 0,
        updated: 0,
        skipped: 0,
        merged: 0,
        total: 0,
        invalid: 0,
        errors: ['Missing userId in job'],
        progress: 0,
        processingTime: 0,
      })
      return
    }

    logger.info(`Starting import job ${jobId} for file ${fileName || 'unnamed'} for user ${userId}`)

    // Initialize stats with explicit typing and default values for all fields
    const stats: JobStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      merged: 0,
      total: 0,
      invalid: 0,
      errors: [],
      progress: 0,
      processingTime: 0,
    }

    const startTime = Date.now()

    try {
      await JobStatusService.markJobProcessing(jobId)

      // Get base64 encoded CSV content from Redis
      const csvContentBase64 = await getImportFileContent(jobId)
      if (!csvContentBase64) {
        throw new Error(`CSV content not found for job ${jobId}`)
      }

      const decodedContent = await ImportJobProcessor.decodeAndValidateContent(
        jobId,
        csvContentBase64
      )

      // Process the CSV content
      await ImportJobProcessor.processCSVContent(job, decodedContent, stats, startTime)

      // Mark job as complete
      stats.progress = 100
      stats.processingTime = Date.now() - startTime

      const totalProcessed = stats.total ?? 0
      const createdCount = stats.created ?? 0
      const updatedCount = stats.updated ?? 0
      const skippedCount = stats.skipped ?? 0
      const mergedCount = stats.merged ?? 0
      const invalidCount = stats.invalid ?? 0

      logger.info(
        `Job ${jobId} completed: ${totalProcessed} transactions processed in ${stats.processingTime}ms`,
        {
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          merged: mergedCount,
          invalid: invalidCount,
        }
      )

      await JobStatusService.markJobDone(jobId, stats)
      await removeJobFromQueue(jobId)
      logger.info(`Job ${jobId} removed from Redis`)

      // Optional: trigger garbage collection if available
      global.gc?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`Job ${jobId} failed:`, error)
      if (stats.errors) {
        stats.errors.push(errorMessage)
      } else {
        stats.errors = [errorMessage]
      }
      stats.processingTime = Date.now() - startTime

      await JobStatusService.markJobError(jobId, errorMessage, stats)
    }
  }

  /**
   * Decode and validate the CSV content
   */
  private static async decodeAndValidateContent(
    jobId: string,
    csvContentBase64: string
  ): Promise<string> {
    try {
      // Safely decode the base64 content to UTF-8
      const decodedContent = Buffer.from(csvContentBase64, 'base64').toString('utf-8')

      // Basic validation of CSV content
      if (!decodedContent || decodedContent.trim().length === 0) {
        throw new Error('Decoded CSV content is empty')
      }

      // Check if content looks like a CSV (contains commas and at least one newline)
      if (!decodedContent.includes(',') || !decodedContent.includes('\n')) {
        logger.warn(`Job ${jobId}: Decoded content doesn't appear to be a valid CSV format`)
      }

      logger.info(
        `Job ${jobId}: Successfully decoded CSV content (length: ${decodedContent.length})`
      )

      return decodedContent
    } catch (decodeError) {
      await removeJobFromQueue(jobId)
      throw new Error(
        `Failed to decode CSV content: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`
      )
    }
  }

  /**
   * Process the CSV content
   */
  private static async processCSVContent(
    job: ImportTransactionsJob,
    decodedContent: string,
    stats: JobStats,
    startTime: number
  ): Promise<void> {
    const { jobId, fileName, userId } = job
    let processedCount = 0
    const totalEstimate = decodedContent.split('\n').length - 1

    const countableActionKeys: ReadonlyArray<
      keyof Pick<JobStats, 'created' | 'updated' | 'skipped' | 'merged' | 'invalid'>
    > = ['created', 'updated', 'skipped', 'merged', 'invalid']

    // Type guard using the specific keys array type
    const isCountableActionKey = (key: string): key is (typeof countableActionKeys)[number] => {
      return countableActionKeys.includes(key as (typeof countableActionKeys)[number])
    }

    // Set initial value for total if not already set
    stats.total = stats.total || 0

    // Process transactions in batches
    for await (const result of processTransactionsFromCSV({
      fileName,
      csvContent: decodedContent,
      userId,
      accountId: job.accountId,
      deduplicateThreshold: job.options?.deduplicateThreshold,
      batchSize: job.options?.batchSize,
      batchDelay: job.options?.batchDelay,
      maxRetries: JOB_PROCESSING.MAX_RETRIES,
      retryDelay: JOB_PROCESSING.RETRY_DELAY,
    })) {
      processedCount++

      // Safely increment total
      stats.total = (stats.total || 0) + 1

      if (result.action) {
        if (isCountableActionKey(result.action)) {
          // Safely increment the specific counter, using nullish coalescing to handle undefined
          stats[result.action] = (stats[result.action] ?? 0) + 1
        } else {
          logger.warn(
            `Job ${jobId}: Received unexpected action key '${result.action}' from processor`
          )
          // Safely increment invalid counter
          stats.invalid = (stats.invalid ?? 0) + 1
        }
      }

      // Update progress every 100 records
      if (processedCount % 100 === 0 && totalEstimate > 0) {
        stats.progress = Math.min(99, Math.round((processedCount / totalEstimate) * 100))
        stats.processingTime = Date.now() - startTime
        
        // Use BullMQ progress updater if available (added from processBullMQJob)
        if ('progressUpdater' in job && typeof job.progressUpdater === 'function') {
          await job.progressUpdater(stats.progress)
        } else if (job.jobId) {
          // This is the legacy Redis approach
          await JobStatusService.updateJobProgress(
            jobId,
            stats.progress || 0,
            stats.processingTime || 0
          )
        }
      }
    }
  }
}
