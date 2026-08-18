/**
 * @hominem/db - Database access layer for `hominem` services
 *
 * NOT for use in client applications - use @hominem/rpc instead.
 */

export type { Selectable } from 'kysely';
export { authDb, db, healthCheck, pool, sql } from './db';
export type { Database } from './db';
export type { DB, Json, JsonArray, JsonObject, JsonValue } from './types/database';

// Transaction support
export { runInTransaction } from './transaction';
export type { DbHandle, TransactionHandle } from './transaction';

// Export database table types
export type * from './types/database';

export {
  ConflictError,
  ForbiddenError,
  InternalError,
  isServiceError,
  NotFoundError,
  ServiceError,
  UnauthorizedError,
  UnavailableError,
  ValidationError,
} from './errors';
export type { ErrorCode } from './errors';

// Repositories
export { NoteRepository } from './services/notes/note.repository';
export type {
  ListNoteFeedInput,
  ListNotesInput,
  CreateNoteInput as NoteCreateInput,
  NoteFeedPageRecord,
  NoteFeedRecord,
  NoteFileRecord,
  NoteMutationCommand,
  NoteRecord,
  UpdateNoteInput as NoteUpdateInput,
  SearchNoteResult,
  SearchNotesInput,
  SyncNoteFilesCommand,
  UpdateNoteCommand,
} from './services/notes/note.repository';

export { ChatRepository } from './services/chats/chat.repository';
export type {
  ChatMessageFileRecord,
  ChatMessageRecord,
  ChatMessageRole,
  ChatMessageToolCallRecord,
  ChatRecord,
  InsertChatMessageInput,
  NoteContext,
  ReferencedNoteRecord,
} from './services/chats/chat.repository';

export { FileRepository } from './services/files/file.repository';
export type {
  DeleteFileCommand,
  FileRecord,
  UpsertFileInput,
} from './services/files/file.repository';

export { TaskRepository } from './services/tasks/task.repository';
export type {
  CreateTaskBatchInput,
  CreateTaskInput,
  TaskBatchRecord,
  TaskListRecord,
  TaskRecord,
} from './services/tasks/task.repository';

export { VectorDocumentRepository } from './services/vector/vector-document.repository';
export type {
  SearchVectorDocumentsInput,
  UpsertVectorDocumentInput,
  VectorDocumentEntityType,
  VectorDocumentRecord,
  VectorDocumentSearchResult,
} from './services/vector/vector-document.repository';

export { AIUsageEventRepository } from './services/ai/ai-usage.repository';
export type {
  AIUsageEventRecord,
  AIUsageEventStatus,
  AIUsageFeature,
  AIUsageFeatureBreakdownRecord,
  AIUsageModelBreakdownRecord,
  AIUsageOperation,
  AIUsageSummaryRecord,
  CreateAIUsageEventInput,
} from './services/ai/ai-usage.repository';

export { CareerRepository } from './services/career/career.repository';
export type {
  CareerApplicationRecord,
  CareerApplicationStageRecord,
  CareerApplicationWithRelations,
  CareerEducationRecord,
  CareerEngagementRecord,
  CareerOfferRecord,
  CareerProfileRecord,
  CareerTimelineRecord,
} from './services/career/career.repository';

export { CareerImportRepository } from './services/career/career-import.repository';
export type {
  CareerImportRecord,
  CareerImportStage,
  CareerImportStatus,
} from './services/career/career-import.repository';

export { ApplicationFilesRepository } from './services/career/application-files.repository';
export type {
  CareerApplicationFileInput,
  CareerApplicationFileRecord,
} from './services/career/application-files.repository';

export { ApplicationNotesRepository } from './services/career/application-notes.repository';
export type { CareerApplicationNoteRecord } from './services/career/application-notes.repository';

export { CertificationRepository } from './services/career/certification.repository';
export type {
  CareerCertificationInput,
  CareerCertificationRecord,
} from './services/career/certification.repository';

export { ProjectRepository } from './services/career/project.repository';
export type { CareerProjectInput, CareerProjectRecord } from './services/career/project.repository';

export { SkillRepository } from './services/career/skill.repository';
export type { CareerSkillInput, CareerSkillRecord } from './services/career/skill.repository';

export { SocialLinksRepository } from './services/career/social-links.repository';
export type {
  CareerSocialLinksInput,
  CareerSocialLinksRecord,
} from './services/career/social-links.repository';

export { TestimonialRepository } from './services/career/testimonial.repository';
export type {
  CareerTestimonialInput,
  CareerTestimonialRecord,
} from './services/career/testimonial.repository';

export { UserRepository } from './services/users/user.repository';
export type { FindUserInput, UserRecord } from './services/users/user.repository';

export { FinanceQueryRepository } from './services/finance/finance-query.repository';
export type { FinanceMonthlyTransactionRecord } from './services/finance/finance-query.repository';
