import { redis } from '@hominem/services/redis';
import { QUEUE_NAMES } from '@hominem/utils/consts';
import type { Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';

/**
 * Initialize BullMQ queues using consistent queue names.
 * These are singleton instances used throughout the application.
 */
export const plaidSyncQueue: Queue = new BullQueue(QUEUE_NAMES.PLAID_SYNC, {
  connection: redis,
});

export const importTransactionsQueue: Queue = new BullQueue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
  connection: redis,
});

export const placePhotoEnrichQueue: Queue = new BullQueue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
  connection: redis,
});

export const fileProcessingQueue: Queue = new BullQueue(QUEUE_NAMES.FILE_PROCESSING, {
  connection: redis,
});
