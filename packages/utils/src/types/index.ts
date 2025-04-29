// Re-export database schema types
export type {
  Activity,
  Artist,
  Category,
  Chat,
  ChatMessageFile,
  ChatMessageSelect,
  Company,
  FinanceAccount,
  JobApplication,
  JobApplicationInsert,
  Place,
  Possession,
  PossessionInsert,
  Tag,
  FinanceTransaction as Transaction,
  User,
  UserInsert,
} from '../db/schema'

export type {
  CategorySummary,
  TimeSeriesDataPoint,
  TimeSeriesStats,
  TopMerchant,
} from '../finance/types'

// Re-export job-related types
export type {
  BaseJob,
  FileStatus,
  ImportRequestParams,
  ImportRequestResponse,
  ImportTransactionsJob,
  JobStats,
  JobStatus,
  ProcessTransactionOptions,
} from '../jobs'

// Legacy aliases - keeping for backward compatibility
// TODO: Remove these in the future and update references to use imports from '../jobs'
export type { JobStats as UploadStats, JobStatus as UploadStatus } from '../jobs'
