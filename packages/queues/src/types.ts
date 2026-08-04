/**
 * Job processing types used across the monorepo
 *
 * These types define the structure of background jobs that are
 * processed by workers and can be tracked by the UI.
 */

/**
 * Status of a job
 */
export type JobStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'cancelled';

/**
 * Statistics for tracking job progress
 * All properties are made optional to allow for partial updates
 */
export interface JobStats {
  progress?: number;
  processingTime?: number;
  total?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  merged?: number;
  invalid?: number;
  errors?: string[];
}

/**
 * Base job information shared by all job types
 */
export interface BaseJob {
  jobId: string;
  userId: string;
  endTime?: number;
  status: JobStatus;
  stats?: JobStats;
  type: string;
}

/**
 * Generic file status information for UI
 */
export interface FileStatus {
  jobId?: string;
  file: File;
  status: JobStatus;
  error?: string;
  stats?: JobStats;
}

/**
 * Transaction import job options
 */
export interface ImportTransactionsJob extends BaseJob {
  type: 'import-transactions';
  fileName: string;
  planId: string;
  error?: string;
  stats: JobStats;
  startTime: number;
  endTime?: number;
}

/**
 * Data payload specifically for creating an 'import-transactions' job in BullMQ.
 * This defines the structure of the `data` field when a job is added to the queue.
 */
export interface ImportTransactionsQueuePayload {
  planId: string;
  fileName: string;
  userId: string;
  status: JobStatus; // Should be 'queued' when initially added
  createdAt: number; // Timestamp of when the job data was prepared
  type: 'import-transactions';
}

export interface ImportRequestResponse {
  success: boolean;
  jobId: string;
  fileName: string;
  status: JobStatus;
}

export type PreflightStatus = 'ready' | 'confirmed' | 'dismissed' | 'expired';

export interface ImportPreflight {
  preflightId: string;
  userId: string;
  fileName: string;
  status: PreflightStatus;
  planId: string;
  createdAt: number;
  expiresAt: number;
}

export interface FileProcessingJob {
  jobId: string;
  userId: string;
  fileId: string;
  storageKey: string;
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
}

export interface EmbeddingGenerationJob {
  jobId: string;
  userId: string;
  entityType: 'note' | 'chat';
  entityId: string;
}
