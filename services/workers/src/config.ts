/**
 * Worker configuration
 * Centralizing configuration values makes it easier to manage and update them
 */

export const REDIS = {
  JOB_EXPIRATION_TIME: 60 * 60 * 24, // 24 hours
};

export const JOB_PROCESSING = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  POLLING_INTERVAL: 30 * 1000, // 30 seconds
  CHUNK_SIZE: 1000, // Process 1000 transactions at a time
};
