import { createServer } from 'node:http';

import { QUEUE_NAMES } from '@hominem/queues';
import { logger } from '@hominem/telemetry';

import { env } from './env';
import { initRuntime } from './runtime';
import { startEmbeddingGenerationWorker } from './workers/embedding-generation';
import { startFileProcessingWorker } from './workers/file-processing';
import { startImportTransactionsWorker } from './workers/import-transactions';

const fileProcessingWorker = startFileProcessingWorker();
const embeddingGenerationWorker = startEmbeddingGenerationWorker();
const importTransactionsWorker = startImportTransactionsWorker();

const healthServer = createServer((req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end('ok');
  } else {
    res.writeHead(404);
    res.end();
  }
});
healthServer.listen(env.PORT ?? 3001);

initRuntime('worker').installSignalHandlers(
  async () => {
    await Promise.all([
      fileProcessingWorker.close(),
      embeddingGenerationWorker.close(),
      importTransactionsWorker.close(),
    ]);
  },
  () => new Promise<void>((resolve) => healthServer.close(() => resolve())),
);

logger.info('worker_started', { queue: 'file-processing' });
logger.info('worker_started', { queue: 'embedding-generation' });
logger.info('worker_started', { queue: QUEUE_NAMES.IMPORT_TRANSACTIONS });
