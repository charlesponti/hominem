export const QUEUE_NAMES = {
  IMPORT_TRANSACTIONS: 'import-transaction',
  GOOGLE_CALENDAR_SYNC: 'google-calendar-sync',
  PLAID_SYNC: 'plaid-sync',
  PLACE_PHOTO_ENRICH: 'place-photo-enrich',
  FILE_PROCESSING: 'file-processing',
  EMBEDDING_GENERATION: 'embedding-generation',
  RESUME_ANALYSIS: 'resume-analysis',
} as const;

export const REDIS_CHANNELS = {
  IMPORT_PROGRESS: 'import:progress',
  SUBSCRIBE: 'import:subscribe',
  SUBSCRIBED: 'import:subscribed',
} as const;
