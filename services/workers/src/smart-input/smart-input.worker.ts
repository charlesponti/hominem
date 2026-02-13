import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { redis } from '@hominem/services/redis';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';
import { generateObject } from 'ai';
import { type Job, Worker } from 'bullmq';
import { ZodError } from 'zod';

import { HealthService } from '../health.service';
import { type Candidates, CandidatesSchema, type SubmissionAttachment } from '../lib/writer.schema';
import { parseEmail, validateEmailBody } from '../services/email.service';
import { processAttachments } from './smart-input.worker.utils';

export interface SmartInputJobData {
  emailContent: string;
}

export function mergeWriterData(writerData: Candidates, attachmentResults: SubmissionAttachment[]) {
  logger.info('Starting mergeWriterData', {
    writerCount: writerData.candidates.length,
    attachmentCount: attachmentResults.length,
  });
  const results = [];

  for (const writer of writerData.candidates) {
    logger.debug('Processing writer', { writerName: writer.name });
    for (const attachment of attachmentResults) {
      if (writer.name === attachment.candidateName) {
        logger.debug('Found matching attachment', { writerName: writer.name });
        results.push({ ...writer, ...attachment });
      }
    }
  }

  logger.info('Completed mergeWriterData', { resultCount: results.length });
  return results;
}

export async function processSmartInputEmail(emailContent: string) {
  logger.info('Starting smart input processing job');

  try {
    logger.info('Starting email parsing...');
    const email = await parseEmail(emailContent);
    logger.info('Email parsed successfully', { attachmentCount: email.attachments?.length });

    logger.info('Starting email body validation...');
    const emailBody = await validateEmailBody(email);
    logger.info('Email body validated successfully');

    logger.info('Starting email body processing...');
    const writerData = await processEmailBody(emailBody);
    logger.info('Email body processed successfully', {
      candidateCount: writerData.candidates.length,
    });

    logger.info('Starting attachment processing...');
    const candidateNames = writerData.candidates.map((c) => c.name);
    logger.debug('Processing attachments for candidates', { candidateNames });
    const attachmentResults = await processAttachments(email.attachments ?? [], candidateNames);
    logger.info('Attachments processed successfully', { resultCount: attachmentResults.length });

    const writerDataWithAttachments = mergeWriterData(writerData, attachmentResults);
    logger.info('Writer data merged with attachments', {
      finalResultCount: writerDataWithAttachments.length,
    });

    return writerDataWithAttachments;
  } catch (error) {
    logger.error('Smart input processing error', { error });

    if (error instanceof ZodError) {
      throw new Error(`Invalid writer data format: ${JSON.stringify(error)}`);
    }

    throw error;
  }
}

export async function processEmailBody(emailBody: string): Promise<Candidates> {
  logger.info('Processing email body', {
    bodyLength: emailBody.length,
  });
  try {
    const response = await generateObject<Candidates>({
      model: openai('gpt-4o', { structuredOutputs: true }),
      messages: [
        {
          role: 'user',
          content: `Analyze the following email and retrieve all the writers mentioned:\n\n${emailBody}`,
        },
      ],
      schema: CandidatesSchema,
    });

    logger.info('Email body processed successfully', {
      candidateCount: response.object.candidates?.length,
    });
    return response.object;
  } catch (error) {
    logger.error('Email body processing error', { error });
    throw error;
  }
}

const CONCURRENCY = Number.parseInt(process.env.SMART_INPUT_CONCURRENCY ?? '1', 10);

const processSmartInputJob = async (job: Job<SmartInputJobData>) => {
  logger.info(`Processing smart input job ${job.id}`);
  if (!job.data?.emailContent) {
    throw new Error('emailContent is required to process smart input job');
  }

  const writerDataWithAttachments = await processSmartInputEmail(job.data.emailContent);
  return { writerDataWithAttachments };
};

const smartInputWorker = new Worker<SmartInputJobData>(
  QUEUE_NAMES.SMART_INPUT,
  processSmartInputJob,
  {
    connection: redis,
    concurrency: CONCURRENCY,
  },
);

const smartInputHealth = new HealthService(smartInputWorker, 'Smart Input Worker');

smartInputWorker.on('completed', (job) => {
  logger.info(`Smart input job ${job.id} completed successfully`);
});

smartInputWorker.on('failed', (job, error) => {
  logger.error(`Smart input job ${job?.id} failed`, { error, jobId: job?.id });
});

smartInputWorker.on('error', (error) => {
  if (isSmartInputShuttingDown) {
    return;
  }

  if (error instanceof Error && error.message.includes('Connection is closed.')) {
    return;
  }

  logger.error('Smart input worker error', { error });
});

let isSmartInputShuttingDown = false;
const handleSmartInputShutdown = async (signal: NodeJS.Signals) => {
  if (isSmartInputShuttingDown) return;
  isSmartInputShuttingDown = true;
  logger.info(`Smart input worker received ${signal}, cleaning up...`);
  try {
    await smartInputWorker.close();
    logger.info('Smart input worker closed successfully');
    logger.info(smartInputHealth.getHealthSummary());
  } catch (error) {
    logger.error('Error during smart input worker shutdown', { error });
  }
};

process.on('SIGTERM', () => void handleSmartInputShutdown('SIGTERM'));
process.on('SIGINT', () => void handleSmartInputShutdown('SIGINT'));
