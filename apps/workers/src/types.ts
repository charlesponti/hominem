import type { BaseJob, ImportTransactionsJob } from '@hominem/utils/types'

/**
 * Job status update result
 */
export interface JobUpdateResult<T extends BaseJob = ImportTransactionsJob> {
  success: boolean
  jobId: string
  error?: Error
  job?: T
}
