import { importJobPosting, JobImportError } from '@hominem/career-services';
import { CareerImportRepository, db, type CareerImportRecord } from '@hominem/db';
import {
  publishImportProgress,
  QUEUE_NAMES,
  updateImportJob,
  type CareerImportJob,
  type CareerImportQueuePayload,
} from '@hominem/queues';
import { redis } from '@hominem/services/redis';
import { logger } from '@hominem/telemetry';
import { Worker, type Job } from 'bullmq';

let worker: Worker | null = null;
const IMPORT_TIMEOUT_MS = 60_000;

async function importWithTimeout(sourceUrl: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      importJobPosting(sourceUrl),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new JobImportError(
                'IMPORT_TIMEOUT',
                'This import took too long to finish. Please retry or enter the application manually.',
                true,
              ),
            ),
          IMPORT_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function toJob(record: CareerImportRecord): CareerImportJob {
  return {
    jobId: record.queueJobId,
    userId: record.ownerUserId,
    type: 'career-job-import',
    status: record.status,
    stage: record.stage,
    progress: record.progress,
    sourceUrl: record.sourceUrl,
    draft: record.draft as CareerImportJob['draft'],
    errorCode: record.errorCode ?? undefined,
    error: record.errorMessage ?? undefined,
    attempt: record.attempts,
    startTime: new Date(record.createdAt).getTime(),
    endTime: record.completedAt ? new Date(record.completedAt).getTime() : undefined,
  };
}

async function publish(record: CareerImportRecord): Promise<void> {
  const job = toJob(record);
  await updateImportJob(job.jobId, job);
  await publishImportProgress([job]);
}

async function updateState(
  id: string,
  patch: Parameters<typeof CareerImportRepository.update>[2],
): Promise<CareerImportRecord> {
  const record = await CareerImportRepository.update(db, id, patch);
  if (!record) throw new Error(`Career import ${id} was not found`);
  await publish(record);
  return record;
}

async function processCareerImport(job: Job<CareerImportQueuePayload>): Promise<void> {
  const { jobId, userId } = job.data;
  const record = await CareerImportRepository.getByQueueJobId(db, userId, jobId);
  if (!record) throw new Error(`Career import ${jobId} was not found`);
  // The database row is the durable source of truth; older queue payloads may omit sourceUrl.
  const sourceUrl = record.sourceUrl;

  await updateState(record.id, {
    status: 'processing',
    stage: 'validating-url',
    progress: 10,
    attempts: job.attemptsMade + 1,
    errorCode: null,
    errorMessage: null,
  });
  logger.info('[career-import] stage_started', {
    jobId,
    importId: record.id,
    userId,
    stage: 'validating-url',
    attempt: job.attemptsMade + 1,
    sourceHost: record.sourceHost,
  });

  try {
    await updateState(record.id, { stage: 'fetching-posting', progress: 30 });
    logger.info('[career-import] stage_started', {
      jobId,
      importId: record.id,
      userId,
      stage: 'fetching-posting',
      sourceHost: record.sourceHost,
    });

    await updateState(record.id, { stage: 'extracting-fields', progress: 55 });
    const result = await importWithTimeout(sourceUrl);
    await updateState(record.id, { stage: 'validating-result', progress: 80 });
    await updateState(record.id, {
      status: 'ready',
      stage: 'draft-ready',
      progress: 100,
      draft: result.draft,
      completedAt: new Date().toISOString(),
    });
    logger.info('[career-import] completed', {
      jobId,
      importId: record.id,
      userId,
      stage: 'draft-ready',
      sourceHost: record.sourceHost,
    });
  } catch (error) {
    const importError =
      error instanceof JobImportError
        ? error
        : new JobImportError(
            'PROVIDER_UNAVAILABLE',
            'Job import is temporarily unavailable. Please retry in a moment.',
            true,
            { cause: error },
          );
    const isRetrying = importError.retryable && job.attemptsMade + 1 < (job.opts.attempts ?? 1);
    await updateState(record.id, {
      status: isRetrying ? 'queued' : 'failed',
      progress: isRetrying ? 10 : 100,
      errorCode: importError.code,
      errorMessage: importError.message,
      completedAt: isRetrying ? null : new Date().toISOString(),
    });
    logger.error('[career-import] failed', {
      error: importError,
      jobId,
      importId: record.id,
      userId,
      sourceHost: record.sourceHost,
      errorCode: importError.code,
      retrying: isRetrying,
      attempt: job.attemptsMade + 1,
    });
    if (isRetrying) throw importError;
  }
}

export function startCareerJobImportWorker() {
  if (worker) return worker;

  worker = new Worker(
    QUEUE_NAMES.CAREER_JOB_IMPORT,
    (job) => processCareerImport(job as Job<CareerImportQueuePayload>),
    { connection: redis },
  );

  worker.on('failed', (job, error) => {
    logger.error('[career-import] bullmq_job_failed', {
      error,
      jobId: job?.id,
      queue: QUEUE_NAMES.CAREER_JOB_IMPORT,
    });
  });
  worker.on('stalled', (jobId) => {
    logger.warn('[career-import] bullmq_job_stalled', { jobId });
  });

  logger.info('[career-import] worker_started', { version: 'db-url-fallback-v1' });

  return worker;
}
