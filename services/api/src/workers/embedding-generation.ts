import { createHash } from 'node:crypto';

import { generateEmbedding } from '@hominem/ai';
import { ChatRepository } from '@hominem/db/chats';
import { db } from '@hominem/db/core';
import { NoteRepository } from '@hominem/db/notes';
import { VectorDocumentRepository } from '@hominem/db/vector';
import { QUEUE_NAMES, type EmbeddingGenerationJob } from '@hominem/queues';
import { redis as cache } from '@hominem/services/redis';
import { logger } from '@hominem/telemetry';
import { Worker } from 'bullmq';

import { recordAIUsageEvent, startAIUsageTimer } from '../application/ai-usage.service';

const EMBEDDING_DIMENSIONS = 1536;

let worker: Worker | null = null;

function toDeterministicUuid(value: string) {
  const hash = createHash('sha256').update(value).digest('hex');
  const timeHigh = `4${hash.slice(13, 16)}`;
  const clockSeq = `${((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0')}${hash.slice(18, 20)}`;
  return [hash.slice(0, 8), hash.slice(8, 12), timeHigh, clockSeq, hash.slice(20, 32)].join('-');
}

async function buildEntityContent(
  entityType: EmbeddingGenerationJob['entityType'],
  entityId: string,
  userId: string,
): Promise<string | null> {
  if (entityType === 'note') {
    const note = await NoteRepository.load(db, entityId, userId);
    return [note.title, note.content].filter((part) => part && part.trim().length > 0).join('\n\n');
  }

  const messages = await ChatRepository.getMessages(db, entityId, 200, 0);
  if (messages.length === 0) {
    return null;
  }

  return messages.map((message) => `${message.role}: ${message.content}`).join('\n\n');
}

async function processEmbeddingJob(data: EmbeddingGenerationJob) {
  const content = await buildEntityContent(data.entityType, data.entityId, data.userId);
  if (!content || content.trim().length === 0) {
    return;
  }

  const eventId = toDeterministicUuid(
    `${data.jobId}:${data.entityType}:${data.entityId}:embedding`,
  );
  const getDurationMs = startAIUsageTimer();
  let embeddingResult: Awaited<ReturnType<typeof generateEmbedding>>;
  try {
    embeddingResult = await generateEmbedding(content, { dimensions: EMBEDDING_DIMENSIONS });
  } catch (error) {
    await recordAIUsageEvent({
      eventId,
      userId: data.userId,
      feature: 'embedding',
      operation: 'embedding',
      status: 'failed',
      error,
      durationMs: getDurationMs(),
      metadata: {
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
    throw error;
  }
  const embedding = embeddingResult.embedding;
  if (embedding.length === 0) {
    logger.error('[embeddings] generation returned empty vector', {
      entityType: data.entityType,
      entityId: data.entityId,
    });
    return;
  }

  await recordAIUsageEvent({
    eventId,
    userId: data.userId,
    feature: 'embedding',
    operation: 'embedding',
    usage: embeddingResult.usage,
    status: 'succeeded',
    durationMs: getDurationMs(),
    metadata: {
      entityType: data.entityType,
      entityId: data.entityId,
    },
  });

  await VectorDocumentRepository.upsert(db, {
    ownerUserId: data.userId,
    entityType: data.entityType,
    entityId: data.entityId,
    content,
    embedding,
  });
}

export function startEmbeddingGenerationWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker<EmbeddingGenerationJob>(
    QUEUE_NAMES.EMBEDDING_GENERATION,
    async (job) => processEmbeddingJob(job.data),
    { connection: cache },
  );

  worker.on('failed', (job, error) => {
    logger.error('[embeddings] generation job failed', {
      jobId: job?.id,
      error,
    });
  });

  return worker;
}
