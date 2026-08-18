// Must run before any module that reads process.env at import time (e.g.
// @hominem/queues' Redis client), so it can't be reordered by import sorting.
import 'dotenv/config';
import { createServer } from 'node:http';

import { QUEUE_NAMES } from '@hominem/queues';
import { logger } from '@hominem/telemetry';

import { env } from './env';
import { initRuntime } from './runtime';
import { startCareerJobImportWorker } from './workers/career-job-import';
import { startEmbeddingGenerationWorker } from './workers/embedding-generation';
import { startFileProcessingWorker } from './workers/file-processing';
import { startImportTransactionsWorker } from './workers/import-transactions';
import { startResumeAnalysisWorker } from './workers/resume-analysis';

const fileProcessingWorker = startFileProcessingWorker();
const embeddingGenerationWorker = startEmbeddingGenerationWorker();
const importTransactionsWorker = startImportTransactionsWorker();
const resumeAnalysisWorker = startResumeAnalysisWorker();
// Start career imports from the worker entrypoint so dev watchers reload queue handlers.
const careerJobImportWorker = startCareerJobImportWorker();
const workerVersion = 'career-import-v2';

const healthServer = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.setHeader('x-worker-version', workerVersion);
    res.writeHead(200);
    res.end('ok');
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(env.PORT ?? env.WORKER_PORT ?? 4041);

initRuntime('worker').installSignalHandlers(
  async () => {
    await Promise.all([
      fileProcessingWorker.close(),
      embeddingGenerationWorker.close(),
      importTransactionsWorker.close(),
      resumeAnalysisWorker.close(),
      careerJobImportWorker.close(),
    ]);
  },
  () => new Promise<void>((resolve) => healthServer.close(() => resolve())),
);

logger.info('worker_started', { queue: 'file-processing' });
logger.info('worker_started', { queue: 'embedding-generation' });
logger.info('worker_started', { queue: QUEUE_NAMES.IMPORT_TRANSACTIONS });
logger.info('worker_started', { queue: QUEUE_NAMES.RESUME_ANALYSIS });
logger.info('worker_started', { queue: QUEUE_NAMES.CAREER_JOB_IMPORT });
