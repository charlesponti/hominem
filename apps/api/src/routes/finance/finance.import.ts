import { QUEUE_NAMES } from '@hominem/utils/consts'
import type { ImportTransactionsQueuePayload } from '@hominem/utils/jobs'
import { csvStorageService } from '@hominem/utils/supabase'
import { zValidator } from '@hono/zod-validator'
import type { Job } from 'bullmq'
import { Hono } from 'hono'
import fs from 'node:fs'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth.js'
import { handleFileUpload } from '../../middleware/file-upload.js'

export const financeImportRoutes = new Hono()

const ImportTransactionsParamsSchema = z.object({
  deduplicateThreshold: z.coerce.number().min(0).max(100).default(60),
  batchSize: z.coerce.number().min(1).max(100).optional().default(20),
  batchDelay: z.coerce.number().min(100).max(1000).optional().default(200),
})

const JobIdParamsSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
})

// Import transactions from CSV file
financeImportRoutes.post(
  '/',
  requireAuth,
  zValidator('query', ImportTransactionsParamsSchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Not authorized' }, 401)
    }

    try {
      // Parse query parameters for options
      const options = c.req.valid('query')

      // Handle multipart file upload
      // Note: This needs to be adapted for Hono's file upload handling
      // For now, we'll need to create a Hono-compatible file upload middleware
      const uploadedFile = await handleFileUpload(c.req.raw)

      if (!uploadedFile) {
        return c.json({ error: 'No file uploaded' }, 400)
      }

      if (!uploadedFile.mimetype.includes('csv')) {
        // Clean up the temp file
        fs.unlinkSync(uploadedFile.filepath)
        return c.json({ error: 'Only CSV files are supported' }, 400)
      }

      // Read the CSV file content
      const csvContent = fs.readFileSync(uploadedFile.filepath, 'utf-8')

      // Upload CSV file to Supabase storage
      const csvFilePath = await csvStorageService.uploadCsvFile(
        uploadedFile.filename,
        csvContent,
        userId
      )

      // Clean up the temp file
      fs.unlinkSync(uploadedFile.filepath)

      // Check if a job with the same filename already exists for this user
      const queues = c.get('queues')
      const activeJobs = await queues.importTransactions.getJobs(['active', 'waiting', 'delayed'])
      const existingJob = activeJobs.find(
        (job: Job<ImportTransactionsQueuePayload>) =>
          job.data.fileName === uploadedFile.filename && job.data.userId === userId
      )

      if (existingJob) {
        return c.json({
          success: true,
          jobId: existingJob.id,
          fileName: existingJob.data.fileName,
          status: existingJob.finishedOn
            ? 'done'
            : existingJob.failedReason
              ? 'error'
              : 'processing',
          message: 'File is already being processed',
        })
      }

      // Use BullMQ with file path instead of CSV content
      const job = await queues.importTransactions.add(
        QUEUE_NAMES.IMPORT_TRANSACTIONS,
        {
          csvFilePath,
          fileName: uploadedFile.filename,
          deduplicateThreshold: options.deduplicateThreshold,
          batchSize: options.batchSize,
          batchDelay: options.batchDelay,
          userId,
          status: 'queued',
          createdAt: Date.now(),
          type: 'import-transactions',
        } as ImportTransactionsQueuePayload,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        }
      )

      return c.json({
        success: true,
        jobId: job.id,
        fileName: uploadedFile.filename,
        status: 'queued',
      })
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Import error: ${error.message}`)
        return c.json(
          {
            success: false,
            error: 'Failed to process import',
            details: error.message,
          },
          500
        )
      }
      console.error('Unknown import error:', error)
      return c.json({ error: 'Failed to process import' }, 500)
    }
  }
)

// Get active import jobs
financeImportRoutes.get('/active', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    // Get queues from context
    const queues = c.get('queues')

    // With BullMQ, we can get active jobs directly
    const activeJobs = await queues.importTransactions.getJobs(['active', 'waiting', 'delayed'])

    // Filter to only get this user's jobs and map to our expected format
    const userJobs = activeJobs
      .filter((job: Job<ImportTransactionsQueuePayload>) => job.data.userId === userId)
      .map((job: Job<ImportTransactionsQueuePayload>) => ({
        jobId: job.id as string,
        userId: job.data.userId,
        fileName: job.data.fileName,
        status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
        progress: job.progress,
      }))

    return c.json({ jobs: userJobs })
  } catch (error) {
    console.error(`Error fetching active jobs: ${error}`)
    return c.json(
      {
        error: 'Failed to retrieve active import jobs',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})

// Check import status
financeImportRoutes.get(
  '/:jobId',
  requireAuth,
  zValidator('param', JobIdParamsSchema),
  async (c) => {
    const { jobId } = c.req.valid('param')

    try {
      // Get queues from context
      const queues = c.get('queues')

      // With BullMQ, we can get the job status directly
      const job = await queues.importTransactions.getJob(jobId)

      if (!job) {
        return c.json({ error: 'Import job not found' }, 404)
      }

      // Map BullMQ job to our expected format
      return c.json({
        jobId: job.id,
        status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
        fileName: job.data.fileName,
        progress: job.progress,
        error: job.failedReason,
        stats: job.returnvalue?.stats || {},
      })
    } catch (error) {
      console.error(`Error fetching job status: ${error}`)
      return c.json(
        {
          error: 'Failed to retrieve job status',
          details: error instanceof Error ? error.message : String(error),
        },
        500
      )
    }
  }
)
