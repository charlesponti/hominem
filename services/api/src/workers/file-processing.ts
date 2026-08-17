import { FileRepository, db } from '@hominem/db';
import { QUEUE_NAMES } from '@hominem/queues';
import { FileProcessorService } from '@hominem/services/files';
import { redis as cache } from '@hominem/services/redis';
import { fileStorageService } from '@hominem/storage';
import { logger } from '@hominem/telemetry';
import { Worker } from 'bullmq';

import { describeImageForChat, summarizeDocumentForChat } from './file-analysis';

let worker: Worker | null = null;

interface FileProcessingJobData {
  jobId: string;
  userId: string;
  fileId: string;
  storageKey: string;
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
}

async function processFileUploadJob(data: FileProcessingJobData) {
  const storedBuffer = await fileStorageService.getFileByPath(data.storageKey);
  if (!storedBuffer) {
    logger.error('[files] processing skipped, file buffer missing', { fileId: data.fileId });
    return;
  }

  const arrayBuffer = storedBuffer.buffer.slice(
    storedBuffer.byteOffset,
    storedBuffer.byteOffset + storedBuffer.byteLength,
  ) as ArrayBuffer;

  const processed = await FileProcessorService.processFile(
    arrayBuffer,
    data.originalName,
    data.mimetype,
    data.fileId,
  );

  if (processed.type === 'image') {
    processed.textContent = await describeImageForChat(
      arrayBuffer,
      data.mimetype,
      data.fileId,
      data.userId,
    );
  } else if (processed.type === 'document' && processed.textContent) {
    const summary = await summarizeDocumentForChat(
      processed.textContent,
      data.fileId,
      data.mimetype,
      data.userId,
    );
    if (summary) {
      processed.content = summary;
      processed.metadata = { ...processed.metadata, summary };
    }
  }

  await FileRepository.upsert(db, {
    id: data.fileId,
    userId: data.userId,
    storageKey: data.storageKey,
    originalName: data.originalName,
    mimetype: data.mimetype,
    size: data.size,
    url: data.url,
    ...(processed.content != null ? { content: processed.content } : {}),
    ...(processed.textContent != null ? { textContent: processed.textContent } : {}),
    ...(processed.metadata != null ? { metadata: processed.metadata } : {}),
  });
}

export function startFileProcessingWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(QUEUE_NAMES.FILE_PROCESSING, async (job) => processFileUploadJob(job.data), {
    connection: cache,
  });

  worker.on('failed', (job, error) => {
    logger.error('[files] processing job failed', {
      jobId: job?.id,
      error,
    });
  });

  return worker;
}
