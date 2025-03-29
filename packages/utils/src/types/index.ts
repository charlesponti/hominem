export * from '../db/schema/activity.schema'
export * from '../db/schema/career.schema'
export * from '../db/schema/music.schema'

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

export interface ImportJob {
  jobId: string
  fileName: string
  status: FileStatus['status']
  error?: string
  stats: FileStatus['stats']
  startTime: number
  endTime?: number
}
