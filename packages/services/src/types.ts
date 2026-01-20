export type {
  Activity,
  Artist,
  Category,
  Chat,
  ChatMessageFile,
  ChatMessageSelect,
  Company,
  Goal,
  JobApplication,
  JobApplicationInsert,
  Place,
  PlaceInsert,
  Possession,
  PossessionInsert,
  Tag,
} from '@hominem/db/schema';
export type {
  Content,
  ContentInsert,
  ContentStatus,
  ContentStrategiesInsert,
  ContentStrategiesSelect,
  ContentType,
  SEOMetadata,
  SocialMediaMetadata,
} from '@hominem/db/schema';
export type {
  BudgetCategory,
  FinanceAccount,
  FinanceTransaction as Transaction,
  FinancialInstitution,
} from '@hominem/db/schema';
export type { GoalMilestone, GoalStatus } from '@hominem/db/schema';
export type { Item, ItemInsert } from '@hominem/db/schema';
export type { ListInsert, ListInviteSelect, ListSelect } from '@hominem/db/schema';
export type {
  Note,
  NoteContentType,
  NoteInsert,
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
