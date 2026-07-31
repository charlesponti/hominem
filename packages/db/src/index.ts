/**
 * @hominem/db - Database access layer for `hominem` services
 *
 * NOT for use in client applications - use @hominem/rpc instead.
 */

export type { Selectable } from 'kysely';
export { authDb, db, healthCheck, pool, sql } from './db';
export type { DB, Json, JsonArray, JsonObject, JsonValue } from './types/database';
export type { Database } from './db';

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
  NoteMutationCommand,
  NoteFeedPageRecord,
  NoteFeedRecord,
  NoteFileRecord,
  NoteRecord,
  SyncNoteFilesCommand,
  UpdateNoteCommand,
  UpdateNoteInput as NoteUpdateInput,
  SearchNoteResult,
  SearchNotesInput,
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
  AIUsageFeature,
  AIUsageFeatureBreakdownRecord,
  AIUsageModelBreakdownRecord,
  AIUsageOperation,
  AIUsageEventStatus,
  AIUsageSummaryRecord,
  CreateAIUsageEventInput,
} from './services/ai/ai-usage.repository';

export { PortfolioRepository } from './services/career/portfolio.repository';
export type {
  ChapterWithEntries,
  CreateDefaultPortfolioInput,
  FullPortfolioRecord,
  PublicPortfolioProfileRecord,
  PortfolioRecord,
  PortfolioTimeline,
  ResumePortfolioRecord,
  SavePortfolioBasicsInput,
  TimelineEntryKind,
  TimelineEntryRecord,
} from './services/career/portfolio.repository';

export { WorkExperienceRepository } from './services/career/work-experience.repository';
export type {
  CreateWorkExperienceCommand,
  CreateWorkExperienceInput,
  DeleteWorkExperienceCommand,
  UpdateWorkExperienceCommand,
  UpdateWorkExperienceInput,
  PublicWorkExperienceRecord,
  WorkExperienceRecord,
} from './services/career/work-experience.repository';
export { redactWorkExperienceForPublic } from './services/career/work-experience.repository';

export { SkillRepository } from './services/career/skill.repository';
export type {
  ReplaceSkillInput,
  ReplaceSkillsCommand,
  SkillRecord,
} from './services/career/skill.repository';

export { ProjectRepository } from './services/career/project.repository';
export type {
  CreateProjectCommand,
  CreateProjectInput,
  DeleteProjectCommand,
  ProjectRecord,
  UpdateProjectCommand,
  UpdateProjectInput,
} from './services/career/project.repository';

export { TestimonialRepository } from './services/career/testimonial.repository';
export type {
  CreateTestimonialCommand,
  CreateTestimonialInput,
  DeleteTestimonialCommand,
  TestimonialRecord,
  UpdateTestimonialCommand,
  UpdateTestimonialInput,
} from './services/career/testimonial.repository';

export { CompanyRepository } from './services/career/company.repository';
export type {
  CompanyRecord,
  FindOrCreateCompanyInput,
  UpdateCompanyInput,
} from './services/career/company.repository';

export { JobApplicationRepository } from './services/career/job-application.repository';
export type {
  CareerApplicationStage,
  CareerInterviewEntry,
  CreateJobApplicationInput,
  CreateJobApplicationCommand,
  DeleteJobApplicationCommand,
  JobApplicationRecord,
  UpdateJobApplicationStatusCommand,
  UpdateJobApplicationInput,
} from './services/career/job-application.repository';

export { SocialLinksRepository } from './services/career/social-links.repository';
export type {
  SaveUserSocialLinksInput,
  UserSocialLinksRecord,
} from './services/career/social-links.repository';

export { UserRepository } from './services/users/user.repository';
export type { FindUserInput, UserRecord } from './services/users/user.repository';

export { FinanceQueryRepository } from './services/finance/finance-query.repository';
export type { FinanceMonthlyTransactionRecord } from './services/finance/finance-query.repository';
