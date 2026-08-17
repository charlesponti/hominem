import { Buffer } from 'node:buffer';

import { CareerRepository, SocialLinksRepository, db } from '@hominem/db';
import {
  getJobStatus,
  publishImportProgress,
  updateImportJob,
  QUEUE_NAMES,
  type ResumeAnalysisJob,
  type ResumeAnalysisQueuePayload,
  type ResumeAnalysisStage,
} from '@hominem/queues';
import { redis as cache } from '@hominem/services/redis';
import {
  buildResumeImportDiff,
  extractPdfText,
  parseResumeWithAI,
  ResumeParseError,
} from '@hominem/services/resume';
import { documentStorageService } from '@hominem/storage';
import { logger } from '@hominem/telemetry';
import { Worker } from 'bullmq';

const MAX_EXTRACTED_RESUME_TEXT_LENGTH = 80_000;

let worker: Worker | null = null;

async function publish(jobId: string, patch: Partial<ResumeAnalysisJob>): Promise<void> {
  const existing = await getJobStatus<ResumeAnalysisJob>(jobId);
  if (!existing) return;
  const job: ResumeAnalysisJob = { ...existing, ...patch };
  await updateImportJob(jobId, job);
  // publishImportProgress always wraps job(s) in an array — see finance.import.websocket.ts
  await publishImportProgress([job]);
}

function mapErrorToStage(error: unknown): ResumeAnalysisStage {
  if (error instanceof ResumeParseError) return error.kind;
  return 'error';
}

async function processResumeAnalysisJob(data: ResumeAnalysisQueuePayload): Promise<void> {
  await publish(data.jobId, { stage: 'pdf-extraction', status: 'processing' });

  try {
    const bytes = await documentStorageService.getFile(data.fileId, data.userId);
    if (!bytes) {
      throw new Error('Resume file was deleted before analysis could run.');
    }

    const file = new File([Buffer.from(bytes)], `${data.fileId}.pdf`, {
      type: 'application/pdf',
    });
    const pdfText = await extractPdfText(file);

    if (!pdfText.trim()) {
      throw new Error('This PDF did not contain readable text.');
    }
    if (pdfText.length > MAX_EXTRACTED_RESUME_TEXT_LENGTH) {
      throw new Error('This resume contains too much text to process safely.');
    }

    await publish(data.jobId, { stage: 'ai-parse' });
    const parsed = await parseResumeWithAI(pdfText);

    await publish(data.jobId, { stage: 'diffing' });
    const [currentProfile, currentSocial] = await Promise.all([
      CareerRepository.getProfile(db, data.userId),
      SocialLinksRepository.get(db, data.userId),
    ]);
    const diff = buildResumeImportDiff(parsed, currentProfile, currentSocial);

    await publish(data.jobId, {
      stage: 'done',
      status: 'done',
      diff,
      endTime: Date.now(),
    });
  } catch (error) {
    logger.error('[resume-analysis] job failed', {
      jobId: data.jobId,
      userId: data.userId,
      error,
    });
    await publish(data.jobId, {
      stage: mapErrorToStage(error),
      status: 'error',
      error: error instanceof Error ? error.message : 'Resume analysis failed',
      endTime: Date.now(),
    });
  }
}

export function startResumeAnalysisWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    QUEUE_NAMES.RESUME_ANALYSIS,
    async (job) => processResumeAnalysisJob(job.data as ResumeAnalysisQueuePayload),
    { connection: cache },
  );

  worker.on('failed', (job, error) => {
    logger.error('[resume-analysis] worker job failed', {
      jobId: job?.id,
      error,
    });
  });

  return worker;
}
