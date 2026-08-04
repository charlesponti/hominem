import {
  getJobStatus,
  getUserJobs,
  importTransactionsQueue,
  publishImportProgress,
  requestImportCancellation,
  updateImportJob,
  type ImportTransactionsJob,
} from '@hominem/queues';
import { Hono } from 'hono';

import { UnauthorizedError, ValidationError } from '../errors';
import type { AppContext } from '../middleware/auth';

export const importJobRoutes = new Hono<AppContext>()
  .get('/jobs', async (c) => {
    const userId = c.get('auth')?.userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    return c.json(await getUserJobs<ImportTransactionsJob>(userId));
  })
  .post('/jobs/:jobId/cancel', async (c) => {
    const userId = c.get('auth')?.userId;
    if (!userId) throw new UnauthorizedError('Authentication required');
    const jobId = c.req.param('jobId');
    const job = await getJobStatus<ImportTransactionsJob>(jobId);
    if (!job || job.userId !== userId) throw new ValidationError('Import job was not found');
    if (['done', 'error', 'cancelled'].includes(job.status)) return c.json(job);

    const queueJob = await importTransactionsQueue.getJob(jobId);
    const state = queueJob ? await queueJob.getState() : null;
    if (queueJob && state && ['waiting', 'delayed', 'prioritized'].includes(state)) {
      await queueJob.remove();
      const cancelled = { ...job, status: 'cancelled' as const, endTime: Date.now() };
      await updateImportJob(jobId, cancelled);
      await publishImportProgress([cancelled]);
      return c.json(cancelled);
    }

    const requested = await requestImportCancellation(jobId, userId);
    if (!requested) throw new ValidationError('Import job cannot be cancelled');
    return c.json({ ...job, status: 'processing' as const });
  });
