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
} from '../db/schema'

export type { BudgetCategory } from '../db/schema/finance.schema'

export type {
  ListInsert,
  ListInviteSelect,
  ListSelect,
} from '../db/schema/lists.schema'

export type {
  Content,
  ContentInsert,
  ContentTag,
  ContentType,
  TaskMetadata,
  TaskStatus,
} from '../db/schema/notes.schema'

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

export type { User, UserInsert } from '../db/schema/users.schema'

// Legacy aliases - keeping for backward compatibility
// TODO: Remove these in the future and update references to use imports from '../jobs'
export type { JobStats as UploadStats, JobStatus as UploadStatus } from '../jobs'
