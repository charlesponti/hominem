import { QUEUE_NAMES } from '@hominem/utils/consts';
import { redis } from '@hominem/services/redis';
import type { Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';

/**
 * Initialize BullMQ queues using consistent queue names.
 * These are singleton instances used throughout the application.
 */
export const plaidSyncQueue: Queue = new BullQueue(QUEUE_NAMES.PLAID_SYNC, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: redis as any,
});

export const importTransactionsQueue: Queue = new BullQueue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: redis as any,
});

export const placePhotoEnrichQueue: Queue = new BullQueue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connection: redis as any,
});
