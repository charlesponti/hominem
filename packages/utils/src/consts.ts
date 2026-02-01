/**
 * Shared constants for the Hominem application
 * Use this file to define values that need to be consistent across the monorepo
 */

/**
 * BullMQ Queue Names
 * These constants ensure that queue names are consistent between API and workers
 */
export const QUEUE_NAMES = {
  /**
   * Queue for transaction import jobs
   * Used by:
   * - apps/api/src/routes/finance.router.ts (adding jobs)
   * - apps/workers/src/transaction-import-worker.ts (processing jobs)
   */
  IMPORT_TRANSACTIONS: 'import-transaction',

  /**
   * Queue for Plaid synchronization jobs
   * Used by:
   * - apps/api/src/routes/plaid.router.ts (adding jobs)
   * - apps/workers/src/plaid-worker.ts (processing jobs)
   */
  PLAID_SYNC: 'plaid-sync',
  /**
   * Queue for processing smart input emails and attachments
   * Used by:
   * - apps/workers/src/smart-input/smart-input.worker.ts (processing jobs)
   */
  SMART_INPUT: 'smart-input',
  /**
   * Queue for Google Calendar synchronization jobs
   * Used by:
   * - apps/api/src/trpc/routers/events.ts (adding jobs)
   * - apps/workers/src/google-calendar-sync-worker.ts (processing jobs)
   */
  GOOGLE_CALENDAR_SYNC: 'google-calendar-sync',
  /**
   * Queue for place photo enrichment jobs
   * Used by:
   * - apps/api (enqueuing jobs)
   * - apps/workers (processing jobs)
   */
  PLACE_PHOTO_ENRICH: 'place-photo-enrich',
} as const;

/**
 * Redis Channel Names
 * These constants ensure that pub/sub channel names are consistent
 */
export const REDIS_CHANNELS = {
  /**
   * Channel for import progress updates
   * Used by:
   * - apps/workers/src/job-status.service.ts (publishing)
   * - apps/api/src/websocket/index.ts (subscribing)
   */
  IMPORT_PROGRESS: 'import:progress',
  SUBSCRIBE: 'import:subscribe',
  SUBSCRIBED: 'import:subscribed',
} as const;
