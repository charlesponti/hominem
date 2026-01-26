import type { ImportTransactionsQueuePayload } from '@hominem/jobs-services';
import type { Job } from 'bullmq';

import { success, error } from '@hominem/services';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { csvStorageService } from '@hominem/utils/supabase';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { handleFileUploadBuffer } from '../../middleware/file-upload';
import type { AppEnv } from '../../server';

export const financeImportRoutes = new Hono<AppEnv>();

const ImportTransactionsParamsSchema = z.object({
  deduplicateThreshold: z.coerce.number().min(0).max(100).default(60),
  batchSize: z.coerce.number().min(1).max(100).optional().default(20),
  batchDelay: z.coerce.number().min(100).max(1000).optional().default(200),
});

const JobIdParamsSchema = z.object({
  jobId: z.string().min(1, 'jobId is required'),
});

// Import transactions from CSV file
financeImportRoutes.post('/', zValidator('query', ImportTransactionsParamsSchema), async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Not authorized'), 401);
  }

  try {
    // Parse query parameters for options
    const options = c.req.valid('query');

    // Get buffer from multipart file upload
    const uploadedFile = await handleFileUploadBuffer(c.req.raw);
    if (!uploadedFile) {
      return c.json(error('VALIDATION_ERROR', 'No file uploaded'), 400);
    }

    if (!uploadedFile.mimetype.includes('csv')) {
      return c.json(error('VALIDATION_ERROR', 'Only CSV files are supported'), 400);
    }

    // Upload file buffer directly to Supabase storage
    const csvFilePath = await csvStorageService.uploadCsvFile(
      uploadedFile.filename,
      uploadedFile.buffer,
      userId,
    );

    // Check if a job with the same filename already exists for this user
    const queues = c.get('queues');
    const activeJobs = await queues.importTransactions.getJobs(['active', 'waiting', 'delayed']);
    const existingJob = activeJobs.find(
      (job: Job<ImportTransactionsQueuePayload>) =>
        job.data.fileName === uploadedFile.filename && job.data.userId === userId,
    );

    if (existingJob) {
      return c.json(
        success({
          jobId: existingJob.id,
          fileName: existingJob.data.fileName,
          status: existingJob.finishedOn ? 'done' : existingJob.failedReason ? 'error' : 'processing',
          message: 'File is already being processed',
        }),
        200,
      );
    }

    // Add import job to BullMQ
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
      },
    );

    return c.json(
      success({
        jobId: job.id,
        fileName: uploadedFile.filename,
        status: 'queued',
      }),
      201,
    );
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Import error: ${err.message}`);
      return c.json(
        error('INTERNAL_ERROR', 'Failed to process import', { details: err.message }),
        500,
      );
    }
    console.error('Unknown import error:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to process import'), 500);
  }
});

// Get active import jobs
financeImportRoutes.get('/active', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Not authorized'), 401);
  }

  try {
    const queues = c.get('queues');

    const activeJobs = await queues.importTransactions.getJobs(['active', 'waiting', 'delayed']);

    const userJobs = activeJobs
      .filter((job: Job<ImportTransactionsQueuePayload>) => job.data.userId === userId)
      .map((job: Job<ImportTransactionsQueuePayload>) => ({
        jobId: job.id as string,
        userId: job.data.userId,
        fileName: job.data.fileName,
        status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
        progress: job.progress,
      }));

    return c.json(success({ jobs: userJobs }), 200);
  } catch (err) {
    console.error(`Error fetching active jobs: ${err}`);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to retrieve active import jobs', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});

// Check import status
financeImportRoutes.get('/:jobId', zValidator('param', JobIdParamsSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  const { jobId } = c.req.valid('param');

  try {
    const queues = c.get('queues');

    const job = await queues.importTransactions.getJob(jobId);
    if (!job) {
      return c.json(error('NOT_FOUND', 'Import job not found'), 404);
    }

    return c.json(
      success({
        jobId: job.id,
        status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
        fileName: job.data.fileName,
        progress: job.progress,
        errorMessage: job.failedReason,
        stats: job.returnvalue?.stats || {},
      }),
      200,
    );
  } catch (err) {
    console.error(`Error fetching job status: ${err}`);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to retrieve job status', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});
