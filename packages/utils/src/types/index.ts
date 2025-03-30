import type { ProcessTransactionOptions } from '../finance/transactions-processor'

export interface FileStatus {
  file: File
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error'
  error?: string
  stats?: {
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
}

export interface ImportTransactionsJob {
  jobId: string
  fileName: string
  status: FileStatus['status']
  error?: string
  options: Omit<ProcessTransactionOptions, 'fileName' | 'csvContent'>
  stats: FileStatus['stats']
  startTime: number
  endTime?: number
}

export type ImportRequestResponse = {
  success: boolean
  jobId: string
  fileName: string
  status: FileStatus['status']
}
