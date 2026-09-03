export const LOG_MESSAGES = {
  SERVER_STARTED: 'server_started',
  SERVER_SHUTDOWN: 'server_shutdown',
  EMAIL_PROVIDER: 'email_provider',
  ROUTE_NOT_FOUND: 'route_not_found',
  FILE_PROCESS_ERROR: 'file_process_error',
  IMAGE_ANALYZE_ERROR: 'image_analyze_error',
  DOCUMENT_SUMMARIZE_ERROR: 'document_summarize_error',
  DOCUMENT_PROCESS_ERROR: 'document_process_error',
  LOCAL_STORE_VALIDATION_FAILED: 'local_store_validation_failed',
  INTENT_DONATION_FAILED: 'intent_donation_failed',
} as const;

export type LogMessage = (typeof LOG_MESSAGES)[keyof typeof LOG_MESSAGES];
