import type { Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';

import { QUEUE_NAMES } from './consts';
import { redis } from './redis';

export * from './types';
export * from './service';
export * from './consts';

export const importTransactionsQueue: Queue = new BullQueue(QUEUE_NAMES.IMPORT_TRANSACTIONS, {
  connection: redis,
});

export const plaidSyncQueue: Queue = new BullQueue(QUEUE_NAMES.PLAID_SYNC, {
  connection: redis,
});

export const placePhotoEnrichQueue: Queue = new BullQueue(QUEUE_NAMES.PLACE_PHOTO_ENRICH, {
  connection: redis,
});

export const fileProcessingQueue: Queue = new BullQueue(QUEUE_NAMES.FILE_PROCESSING, {
  connection: redis,
});

export const embeddingQueue: Queue = new BullQueue(QUEUE_NAMES.EMBEDDING_GENERATION, {
  connection: redis,
});
