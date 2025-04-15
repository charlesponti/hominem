export type {
  Activity,
  Category,
  Chat,
  Company,
  FinanceAccount,
  Place,
  Possession,
  PossessionInsert,
  Tag,
  Transaction,
  User,
  UserInsert,
} from '../db/schema'
export type UploadStatus = 'queued' | 'uploading' | 'processing' | 'done' | 'error'

export interface UploadStats {
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

export type BaseJob = {
  jobId: string
  userId: string
  endTime?: number
  status: UploadStatus
  stats?: UploadStats
}

export interface FileStatus {
  file: File
  status: UploadStatus
  error?: string
  stats?: UploadStats
}

export type ProcessTransactionOptions = {
  csvContent: string
  fileName: string
  deduplicateThreshold?: number
  batchSize?: number
  batchDelay?: number
  maxRetries?: number
  retryDelay?: number
  userId: string
}

export interface ImportTransactionsJob extends BaseJob {
  fileName: string
  error?: string
  options: Omit<ProcessTransactionOptions, 'fileName' | 'csvContent' | 'userId'>
  stats: UploadStats
  startTime: number
  endTime?: number
}

export type ImportRequestParams = {
  csvContent: string
  fileName: string
  deduplicateThreshold: number
}

export type ImportRequestResponse = {
  success: boolean
  jobId: string
  fileName: string
  status: UploadStatus
}
