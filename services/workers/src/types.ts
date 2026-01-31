import type { BaseJob, ImportTransactionsJob } from '@hominem/jobs-services';

/**
 * Job status update result
 */
export interface JobUpdateResult<T extends BaseJob = ImportTransactionsJob> {
  success: boolean;
  jobId: string;
  error?: Error | undefined;
  job?: T | undefined;
}
