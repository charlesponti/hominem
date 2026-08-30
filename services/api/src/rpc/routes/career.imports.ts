import { randomUUID } from 'node:crypto';

import { JobImportError, normalizeJobUrl } from '@hominem/career-services';
import { CareerImportRepository, db } from '@hominem/db';
import {
  careerJobImportQueue,
  createImportJob,
  publishImportProgress,
  type CareerImportJob,
  type CareerImportQueuePayload,
} from '@hominem/queues';
import { logger } from '@hominem/telemetry';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { NotFoundError } from '../errors';
import { authMiddleware, type AppContext } from '../middleware/auth';

const retryableImportErrors = new Set([
  'SOURCE_UNAVAILABLE',
  'EXTRACTION_FAILED',
  'PROVIDER_UNAVAILABLE',
  'IMPORT_TIMEOUT',
]);

function toCareerImportDto(record: Awaited<ReturnType<typeof CareerImportRepository.getById>>) {
  if (!record) return null;
  return {
    id: record.id,
    queueJobId: record.queueJobId,
    status: record.status,
    stage: record.stage,
    progress: record.progress,
    sourceUrl: record.sourceUrl,
    draft: record.draft,
    errorCode: record.errorCode,
    errorMessage: record.errorMessage,
    attempts: record.attempts,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    resolvedAt: record.resolvedAt,
  };
}

export const careerImportsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const imports = await CareerImportRepository.listOpen(db, c.get('auth')!.userId);
    return c.json({ imports: imports.map(toCareerImportDto) });
  })
  .get('/:id', async (c) => {
    const record = await CareerImportRepository.getById(
      db,
      c.get('auth')!.userId,
      c.req.param('id'),
    );
    return c.json({ import: toCareerImportDto(record) });
  })
  .post('/', zValidator('json', z.object({ url: z.string().trim().min(1) })), async (c) => {
    const userId = c.get('auth')!.userId;
    const { url } = c.req.valid('json');
    let normalized: URL;
    try {
      normalized = normalizeJobUrl(url);
    } catch (error) {
      if (error instanceof JobImportError) {
        return c.json(
          { error: error.code.toLowerCase(), code: error.code, message: error.message },
          400,
        );
      }
      throw error;
    }
    const jobId = randomUUID();
    const created = await CareerImportRepository.create(db, {
      ownerUserId: userId,
      sourceUrl: normalized.toString(),
      sourceHost: normalized.hostname,
      queueJobId: jobId,
    });
    const job: CareerImportJob = {
      jobId,
      userId,
      type: 'career-job-import',
      status: 'queued',
      stage: 'queued',
      progress: 0,
      sourceUrl: created.sourceUrl,
      attempt: 0,
      startTime: Date.now(),
    };
    const payload: CareerImportQueuePayload = {
      jobId,
      userId,
      sourceUrl: created.sourceUrl,
      createdAt: Date.now(),
    };

    try {
      await createImportJob(job);
      await careerJobImportQueue.add('career-job-import', payload, {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2_000 },
      });
      await publishImportProgress([job]);
    } catch (error) {
      await CareerImportRepository.update(db, created.id, {
        status: 'failed',
        errorCode: 'QUEUE_UNAVAILABLE',
        errorMessage: 'We couldn’t start the import. Nothing was added—please try again.',
        completedAt: new Date().toISOString(),
      });
      logger.error('[career-import] enqueue failed', {
        error,
        owner_userid: userId,
        importId: created.id,
        jobId,
        sourceHost: normalized.hostname,
      });
      return c.json(
        {
          error: 'queue_unavailable',
          code: 'QUEUE_UNAVAILABLE',
          message: 'We couldn’t start the import. Nothing was added—please try again.',
        },
        503,
      );
    }

    return c.json({ import: toCareerImportDto(created) }, 202);
  })
  .post('/:id/retry', async (c) => {
    const userId = c.get('auth')!.userId;
    const record = await CareerImportRepository.getById(db, userId, c.req.param('id'));
    if (!record) throw new NotFoundError('Career import');
    if (record.status !== 'failed' || !retryableImportErrors.has(record.errorCode ?? '')) {
      return c.json({ import: toCareerImportDto(record) });
    }

    await CareerImportRepository.update(db, record.id, {
      status: 'queued',
      stage: 'queued',
      progress: 0,
      errorCode: null,
      errorMessage: null,
      completedAt: null,
    });
    const previousQueueJob = await careerJobImportQueue.getJob(record.queueJobId);
    if (previousQueueJob) await previousQueueJob.remove();
    const job: CareerImportJob = {
      jobId: record.queueJobId,
      userId,
      type: 'career-job-import',
      status: 'queued',
      stage: 'queued',
      progress: 0,
      sourceUrl: record.sourceUrl,
      attempt: record.attempts,
      startTime: Date.now(),
    };
    await createImportJob(job);
    await careerJobImportQueue.add(
      'career-job-import',
      {
        jobId: record.queueJobId,
        userId,
        sourceUrl: record.sourceUrl,
        createdAt: Date.now(),
      } satisfies CareerImportQueuePayload,
      { jobId: record.queueJobId, attempts: 3, backoff: { type: 'exponential', delay: 2_000 } },
    );
    await publishImportProgress([job]);
    return c.json({
      import: toCareerImportDto(await CareerImportRepository.getById(db, userId, record.id)),
    });
  })
  .post('/:id/dismiss', async (c) => {
    const userId = c.get('auth')!.userId;
    const record = await CareerImportRepository.getById(db, userId, c.req.param('id'));
    if (!record) throw new NotFoundError('Career import');
    const updated = await CareerImportRepository.update(db, record.id, {
      status: 'dismissed',
      resolvedAt: new Date().toISOString(),
    });
    return c.json({ import: toCareerImportDto(updated) });
  })
  .post('/:id/resolve', async (c) => {
    const userId = c.get('auth')!.userId;
    const record = await CareerImportRepository.getById(db, userId, c.req.param('id'));
    if (!record) throw new NotFoundError('Career import');
    const updated = await CareerImportRepository.update(db, record.id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    return c.json({ import: toCareerImportDto(updated) });
  });
