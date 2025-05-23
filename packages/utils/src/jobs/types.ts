/**
 * Job processing types used across the monorepo
 *
 * These types define the structure of background jobs that are
 * processed by workers and can be tracked by the UI.
 */

/**
 * Status of a job
 */
export type JobStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error'

/**
 * Statistics for tracking job progress
 * All properties are made optional to allow for partial updates
 */
export interface JobStats {
  progress?: number
  processingTime?: number
  total?: number
  created?: number
  updated?: number
  skipped?: number
  merged?: number
  invalid?: number
  errors?: string[]
}

/**
 * Base job information shared by all job types
 */
export interface BaseJob {
  jobId: string
  userId: string
  endTime?: number
  status: JobStatus
  stats?: JobStats
  type: string
}

/**
 * Generic file status information for UI
 */
export interface FileStatus {
  file: File
  status: JobStatus
  error?: string
  stats?: JobStats
}

/**
 * Transaction import job options
 */
export interface ProcessTransactionOptions {
  csvContent: string
  fileName: string
  deduplicateThreshold?: number
  batchSize?: number
  batchDelay?: number
  maxRetries?: number
  retryDelay?: number
  userId: string
}

/**
 * Transaction import job definition
 */
export interface ImportTransactionsJob extends BaseJob {
  type: 'import-transactions'
  fileName: string
  csvContent: string // Added to ensure processor can access it
  accountId?: string
  error?: string
  options: Omit<ProcessTransactionOptions, 'fileName' | 'csvContent' | 'userId'>
  stats: JobStats
  startTime: number
  endTime?: number
}

/**
 * Data payload specifically for creating an 'import-transactions' job in BullMQ.
 * This defines the structure of the `data` field when a job is added to the queue.
 */
export interface ImportTransactionsQueuePayload {
  csvContent: string
  fileName: string
  deduplicateThreshold: number
  batchSize: number
  batchDelay: number
  userId: string
  status: JobStatus // Should be 'queued' when initially added
  createdAt: number // Timestamp of when the job data was prepared
  type: 'import-transactions'
}

/**
 * Request parameters for starting an import job
 */
export interface ImportRequestParams {
  csvContent: string
  fileName: string
  deduplicateThreshold: number
}

/**
 * Response from starting an import job
 */
export interface ImportRequestResponse {
  success: boolean
  jobId: string
  fileName: string
  status: JobStatus
}
