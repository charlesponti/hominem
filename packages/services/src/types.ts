// Re-export commonly used types - available from pre-computed types
export type {
  ContactSelect,
  ContactInput,
  GoalOutput,
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

export type { UserOutput, UserInput, UserSelect, AccountOutput, AccountInput } from '@hominem/db/schema';

// TODO: The following types need .types.ts files to be created:
// - Activity, Artist, Category, Chat, ChatMessageFile, ChatMessageSelect
// - Company, JobApplication, JobApplicationInsert
// - ContentStrategiesInsert, ContentStrategiesSelect
// - GoalMilestone, GoalStatus
// - Item, ItemInsert
// - ListInsert, ListInviteSelect, ListSelect
// - AllContentType, BaseContentType, ContentTag, PublishingContentType

import type { Queue } from 'bullmq';

/**
 * Common queue shape used across API, workers, and apps
 */
export type Queues = {
  plaidSync: Queue;
  importTransactions: Queue;
  placePhotoEnrich: Queue;
};
