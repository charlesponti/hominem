export type {
  Activity,
  Artist,
  Category,
  Chat,
  ChatMessageFile,
  ChatMessageSelect,
  Company,
  ContactSelect,
  ContactInput,
  GoalOutput,
  JobApplication,
  JobApplicationInsert,
  PlaceOutput,
  PlaceInput,
  Possession,
  PossessionInsert,
  TagOutput,
} from '@hominem/db/schema';
export type {
  Content,
  ContentInsert,
  ContentStatus,
  ContentStrategy,
  ContentStrategiesInsert,
  ContentStrategiesSelect,
  ContentType,
  SEOMetadata,
  SocialMediaMetadata,
} from '@hominem/db/schema';
export type {
  BudgetCategoryOutput,
  FinanceAccount,
  FinanceTransaction as Transaction,
  FinancialInstitutionOutput,
} from '@hominem/db/schema';
export type { GoalMilestone, GoalStatus } from '@hominem/db/schema';
export type { Item, ItemInsert } from '@hominem/db/schema';
export type { ListInsert, ListInviteSelect, ListSelect } from '@hominem/db/schema';
export type {
  NoteOutput,
  NoteContentType,
  NoteInput,
  Priority,
  TaskMetadata,
  TaskStatus,
} from '@hominem/db/schema';

export type {
  AllContentType,
  BaseContentType,
  ContentTag,
  PublishingContentType,
} from '@hominem/db/schema';

export type { User, UserInsert } from '@hominem/db/schema';

import type { Queue } from 'bullmq';

/**
 * Common queue shape used across API, workers, and apps
 */
export type Queues = {
  plaidSync: Queue;
  importTransactions: Queue;
  placePhotoEnrich: Queue;
};
