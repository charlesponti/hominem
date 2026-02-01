import type { ImportTransactionsQueuePayload } from '@hominem/jobs-services';
import type { Queues } from '@hominem/services/types';
import type { Job } from 'bullmq';
import type { WebSocket } from 'ws';

import { REDIS_CHANNELS } from '@hominem/utils/consts';
import { logger } from '@hominem/utils/logger';

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface WebSocketWithQueues extends WebSocket {
  queues?: Partial<Queues>;
}

export type MessageMiddleware = (
  ws: WebSocket,
  message: WebSocketMessage,
  next: () => Promise<void>,
) => Promise<void>;

export type MessageHandler = (ws: WebSocket, message: WebSocketMessage) => Promise<void>;

class WebSocketHandlerRegistry {
  private handlers: Map<string, MessageHandler> = new Map();
  private middleware: MessageMiddleware[] = [];

  // Register a handler for a specific message type
  register(type: string, handler: MessageHandler): this {
    this.handlers.set(type, handler);
    return this;
  }

  // Add middleware to the processing pipeline
  use(middleware: MessageMiddleware): this {
    this.middleware.push(middleware);
    return this;
  }

  // Process a message through middleware and to its handler
  async process(ws: WebSocket, rawMessage: string): Promise<void> {
    try {
      const message = JSON.parse(rawMessage) as WebSocketMessage;

      // Set up middleware chain
      const executeMiddleware = async (index = 0): Promise<void> => {
        if (index < this.middleware.length) {
          await this.middleware[index]?.(ws, message, () => executeMiddleware(index + 1));
        } else {
          // After middleware, execute the handler
          const handler = this.handlers.get(message.type);
          if (handler) {
            await handler(ws, message);
          } else {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: `Unknown message type: ${message.type}`,
              }),
            );
          }
        }
      };

      // Start middleware chain
      await executeMiddleware();
    } catch (error) {
      logger.error('Error processing WebSocket message:', { error });
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
        }),
      );
    }
  }
}

export const wsHandlers = new WebSocketHandlerRegistry();

wsHandlers.register('ping', async (ws) => {
  ws.send(JSON.stringify({ type: 'pong' }));
});

wsHandlers.register(REDIS_CHANNELS.SUBSCRIBE, async (ws) => {
  try {
    // Get queues from the WebSocket context
    const wsWithQueues = ws as WebSocketWithQueues;
    const queues = wsWithQueues.queues;

    if (!queues?.importTransactions) {
      logger.error('Import transactions queue not available in WebSocket context');
      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Queue service not available',
        }),
      );
      return;
    }

    // Get active and waiting jobs from BullMQ
    const [activeJobs, waitingJobs, delayedJobs] = await Promise.all([
      queues.importTransactions.getJobs(['active']),
      queues.importTransactions.getJobs(['waiting']),
      queues.importTransactions.getJobs(['delayed']),
    ]);

    // Combine all jobs and map to expected format
    const allJobs = [...activeJobs, ...waitingJobs, ...delayedJobs].map(
      (job: Job<ImportTransactionsQueuePayload>) => ({
        jobId: job.id as string,
        userId: job.data.userId,
        fileName: job.data.fileName,
        status: job.finishedOn ? 'done' : job.failedReason ? 'error' : 'processing',
        progress: job.progress,
        stats: job.returnvalue?.stats || {},
        error: job.failedReason,
      }),
    );

    ws.send(
      JSON.stringify({
        type: REDIS_CHANNELS.SUBSCRIBED,
        channel: REDIS_CHANNELS.IMPORT_PROGRESS,
        data: allJobs,
      }),
    );
  } catch (error) {
    logger.error('Error getting jobs from BullMQ:', { error });
    ws.send(
      JSON.stringify({
        type: 'error',
        message: 'Failed to get active jobs',
      }),
    );
  }
});

wsHandlers.register('chat', async (ws, message) => {
  ws.send(
    JSON.stringify({
      type: 'chat',
      message: `Received: ${message.message || ''}`,
    }),
  );
});

wsHandlers.use(async (_ws, message, next) => {
  logger.info(`Processing message of type: ${message.type}`);
  const start = Date.now();
  await next();
  logger.info(`Processed message in ${Date.now() - start}ms`);
});
