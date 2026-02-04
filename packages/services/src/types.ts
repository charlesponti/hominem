// BullMQ types
import type { Queue } from 'bullmq';

/**
 * Common queue shape used across API, workers, and apps
 */
export type Queues = {
  plaidSync: Queue;
  importTransactions: Queue;
  placePhotoEnrich: Queue;
};
