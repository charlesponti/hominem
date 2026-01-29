// Re-export commonly used types - available from pre-computed types
export type {
  ContactOutput,
  ContactInput,
  ContactSelect,
  Goal,
  GoalOutput,
  GoalInput,
  GoalSelect,
  GoalMilestone,
  GoalStatus,
  PlaceOutput,
  PlaceInput,
  PossessionOutput,
  PossessionInput,
  TagOutput,
  BookmarkOutput,
  BookmarkInput,
} from '@hominem/db/schema';

export type {
  ContentOutput,
  ContentStatus,
  ContentStrategy,
  ContentType,
  SEOMetadata,
  SocialMediaMetadata,
  ContentStrategiesOutput,
  ContentStrategiesInput,
  ContentStrategiesSelect,
  ContentStrategiesInsert,
} from '@hominem/db/schema';

export type {
  BudgetCategoryOutput,
  FinanceAccountOutput,
  FinanceTransactionOutput as Transaction,
  FinancialInstitutionOutput,
} from '@hominem/db/schema';

export type {
  NoteOutput,
  NoteContentType,
  NoteInput,
  Priority,
  TaskMetadata,
  TaskStatus,
} from '@hominem/db/schema';

export type {
  ChatMessageOutput,
  ChatMessageInput,
  ChatMessageSelect,
  ChatMessageToolCall,
  ChatOutput,
  ChatInput,
  ChatSelect,
} from '@hominem/db/schema';

export type {
  UserOutput,
  UserInput,
  UserSelect,
  AccountOutput,
  AccountInput,
} from '@hominem/db/schema';

export type {
  ActivityOutput as Activity,
  ActivityInput as ActivityInsert,
  CategoryOutput as Category,
  CategoryInput as CategoryInsert,
  DocumentOutput as Document,
  DocumentInput as DocumentInsert,
  SkillOutput as Skill,
  SkillInput as SkillInsert,
  UserSkillOutput,
  UserSkillInput,
  JobSkillOutput,
  JobSkillInput,
} from '@hominem/db/schema';

// BullMQ types
import type { Queue } from 'bullmq';

/**
 * Common queue shape used across API, workers, and apps
 */
export type Queues = {
  plaidSync: Queue;
  importTransactions: Queue;
  placePhotoEnrich: Queue;
};
