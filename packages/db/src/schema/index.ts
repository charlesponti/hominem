/**
 * Hominem Database Schema Types
 *
 * ARCHITECTURE PRINCIPLE: "Compute Once"
 *
 * This index exports only pre-computed types from .types.ts files.
 * Raw Drizzle table definitions are NOT exported here to prevent
 * expensive re-instantiation of complex generic types.
 *
 * RULE: Import types from this file. If you need raw Drizzle tables,
 * import directly from the .schema.ts file in your repository layer.
 *
 * Example:
 *   // ✅ GOOD: Import stable pre-computed types
 *   import type { NoteOutput, NoteInput } from '@hominem/db/schema';
 *
 *   // ❌ BAD: Imports expensive-to-infer raw Drizzle types
 *   import { notes } from '@hominem/db/schema';
 *   import type { Note, NoteInsert } from '@hominem/db/schema';
 */

// Export computed types from domain .types.ts files
export type {
  NoteOutput,
  NoteInput,
  NoteSyncItem,
  NoteCreatePayload,
  NoteUpdatePayload,
  NoteMention,
  TaskMetadata,
  TweetMetadata,
  NoteContentType,
  TaskStatus,
  Priority,
} from './notes.types';
export {
  NoteContentTypeSchema,
  TaskMetadataSchema,
  TweetMetadataSchema,
  TaskStatusSchema,
  PrioritySchema,
} from './notes.types';

export type {
  ContentOutput,
  ContentInput,
  ContentStrategiesOutput,
  ContentStrategiesInput,
  ContentStrategiesSelect,
  ContentStrategiesInsert,
  ContentCreatePayload,
  ContentUpdatePayload,
  ContentStrategy,
  ContentType,
  ContentStatus,
  SocialMediaMetadata,
  SEOMetadata,
  PublishingContentType,
  AllContentType,
} from './content.types';
export {
  ContentStrategySchema,
  ContentTypeSchema,
  ContentStatusSchema,
  SocialMediaMetadataSchema,
  SEOMetadataSchema,
  PublishingContentTypeSchema,
  AllContentTypeSchema,
  content,
  contentRelations,
  contentStrategies,
  contentStrategiesRelations,
} from './content.types';

export type {
  FinancialInstitutionOutput,
  FinancialInstitutionInput,
  FinancialInstitutionSelect,
  PlaidItemOutput,
  PlaidItemInput,
  PlaidItemSelect,
  FinanceAccountOutput,
  FinanceAccountInput,
  FinanceAccountSelect,
  FinanceTransactionOutput,
  FinanceTransactionInput,
  FinanceTransactionSelect,
  TransactionCreatePayload,
  TransactionUpdatePayload,
  BudgetCategoryOutput,
  BudgetCategoryInput,
  BudgetCategorySelect,
  BudgetGoalOutput,
  BudgetGoalInput,
  BudgetGoalSelect,
  TransactionType,
  AccountType,
  BudgetCategoryType,
  TransactionLocation,
} from './finance.types';
export {
  TransactionTypeEnum,
  AccountTypeEnum,
  TransactionTypes,
  financialInstitutions,
  plaidItems,
  financeAccounts,
  transactions,
  budgetCategories,
  budgetGoals,
  financialInstitutionRelations,
  plaidItemRelations,
  financeAccountRelations,
  transactionRelations,
  budgetCategoryRelations,
  FinanceAccountSchema,
  FinanceAccountInsertSchema,
  FinanceTransactionSchema,
  TransactionInsertSchema,
  BudgetCategorySchema,
  BudgetGoalSchema,
  TransactionLocationSchema,
} from './finance.types';

export type {
  PlaceOutput,
  PlaceInput,
  PlaceSelect,
} from './places.types';
export {
  place,
  placeRelations,
} from './places.types';

export type {
  EventOutput,
  EventInput,
  EventTypeEnum,
} from './events.types';

export type {
  CalendarEventOutput,
  CalendarEventInput,
  CalendarEventSelect,
  EventSourceEnum,
} from './calendar.types';
export {
  events,
  eventsTags,
  eventsUsers,
  eventsTransactions,
  eventTypeEnum,
  eventSourceEnum,
} from './calendar.types';

export type {
  ListOutput,
  ListSelect,
  ListInput,
  ListInviteOutput,
  ListInviteSelect,
  ListInviteInput,
  UserListsOutput,
  UserListsInput,
} from './lists.types';
export {
  list,
  listRelations,
  userLists,
  userListsRelations,
  listInvite,
  listInviteRelations,
} from './lists.types';

export type {
  ItemOutput,
  ItemInput,
  ItemSelect,
} from './items.types';
export {
  item,
  itemRelations,
} from './items.types';

export type {
  ContactOutput,
  ContactInput,
  ContactSelect,
} from './contacts.types';
export {
  contacts,
} from './contacts.types';

export type {
  UserOutput,
  UserInput,
  AccountOutput,
  AccountInput,
  UserSelect,
} from './users.types';
export {
  users,
  account,
} from './users.types';

export type {
  VerificationTokenOutput,
  VerificationTokenInput,
  TokenOutput,
  TokenInput,
  SessionOutput,
  SessionInput,
} from './auth.types';
export {
  verificationToken,
  token,
  session,
  tokenType,
} from './auth.types';

export type {
  TagOutput,
  TagInput,
  TagSelect,
} from './tags.types';
export {
  tags,
} from './tags.types';

export type {
  GoalOutput,
  GoalInput,
  GoalSelect,
  Goal,
  GoalInsert,
  GoalMilestone,
  GoalStatus,
} from './goals.types';
export {
  goals,
} from './goals.types';

export type {
  BookmarkOutput,
  BookmarkInput,
  BookmarkSelect,
} from './bookmarks.types';
export {
  bookmark,
  bookmarkRelations,
} from './bookmarks.types';

export type {
  PossessionOutput,
  PossessionInput,
  PossessionSelect,
} from './possessions.types';
export {
  possessions,
} from './possessions.types';

export type {
  ArtistOutput,
  ArtistInput,
} from './music.types';
export {
  artists,
  userArtists,
} from './music.types';

export type {
  HealthOutput,
  HealthInput,
  HealthSelect,
} from './health.types';
export {
  health,
} from './health.types';

export type {
  ActivityOutput,
  ActivityInput,
  ActivitySelect,
} from './activity.types';
export {
  activities,
} from './activity.types';

export type {
  CategoryOutput,
  CategoryInput,
} from './categories.types';
export {
  categories,
  categoryRelations,
} from './categories.types';

export type {
  DocumentOutput,
  DocumentInput,
} from './documents.types';
export {
  documents,
  DocumentType,
} from './documents.types';

export type {
  InterviewOutput,
  InterviewInput,
  InterviewInterviewerOutput,
  InterviewInterviewerInput,
} from './interviews.types';
export {
  interviews,
  interview_interviewers,
} from './interviews.types';

export type {
  MovieOutput,
  MovieInput,
  MovieViewingOutput,
  MovieViewingInput,
} from './movies.types';
export {
  movie,
  movieViewings,
  movieRelations,
  movieViewingsRelations,
} from './movies.types';

export type {
  NetworkingEventOutput,
  NetworkingEventInput,
  NetworkingEventAttendeeOutput,
  NetworkingEventAttendeeInput,
} from './networking_events.types';
export {
  networking_events,
  networking_event_attendees,
} from './networking_events.types';

export type {
  SkillOutput,
  SkillInput,
  UserSkillOutput,
  UserSkillInput,
  JobSkillOutput,
  JobSkillInput,
} from './skills.types';
export {
  skills,
  user_skills,
  job_skills,
} from './skills.types';

export type {
  SurveyOutput,
  SurveyInput,
  SurveyOptionOutput,
  SurveyOptionInput,
  SurveyVoteOutput,
  SurveyVoteInput,
} from './surveys.types';
export {
  surveys,
  surveyOptions,
  surveyVotes,
  surveysRelations,
  surveyOptionsRelations,
  surveyVotesRelations,
} from './surveys.types';

export type {
  VectorDocumentOutput,
  VectorDocumentInput,
  VectorDocumentSelect,
} from './vector-documents.types';
export {
  vectorDocuments,
} from './vector-documents.types';

export type {
  JobOutput,
  JobInput,
  JobApplicationOutput,
  JobApplicationInput,
  ApplicationStageOutput,
  ApplicationStageInput,
  WorkExperienceOutput,
  WorkExperienceInput,
} from './career.types';
export {
  jobs,
  jobsRelations,
  job_applications,
  job_applicationsRelations,
  application_stages,
  application_stagesRelations,
  work_experiences,
  work_experiencesRelations,
} from './career.types';

export type {
  CompanyOutput,
  CompanyInput,
} from './company.types';
export {
  companies,
} from './company.types';

export type {
  ChatOutput,
  ChatInput,
  ChatSelect,
  ChatMessageOutput,
  ChatMessageInput,
  ChatMessageSelect,
  ChatMessageReasoning,
  ChatMessageToolCall,
  ChatMessageFile,
  ChatMessageRole,
  ChatMessageReasoningType,
  ChatMessageToolCallType,
  ChatMessageFileType,
  ChatMessageRoleType,
} from './chats.types';
export {
  chat,
  chatMessage,
  chatRelations,
  chatMessageRelations,
} from './chats.types';

export type {
  TripOutput,
  TripInput,
  TripSelect,
  TripItemOutput,
  TripItemInput,
  TripItemSelect,
} from './travel.types';
export {
  trips,
  tripsRelations,
  tripItems,
  tripItemsRelations,
} from './travel.types';

// Shared utilities
export type { Json } from './shared.schema';
