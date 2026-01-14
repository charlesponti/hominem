import type { BaseJob, ImportTransactionsJob } from '@hominem/data/jobs'

/**
 * Job status update result
 */
export interface JobUpdateResult<T extends BaseJob = ImportTransactionsJob> {
  success: boolean
  jobId: string
  error?: Error
  job?: T
}
