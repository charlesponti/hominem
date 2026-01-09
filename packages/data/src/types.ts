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
} from './db/schema'
export type {
  Content,
  ContentInsert,
  ContentStatus,
  ContentStrategiesInsert,
  ContentStrategiesSelect,
  ContentType,
  SEOMetadata,
  SocialMediaMetadata,
} from './db/schema/content.schema'
export type {
  BudgetCategory,
  FinanceAccount,
  FinanceTransaction as Transaction,
  FinancialInstitution,
} from './db/schema/finance.schema'
export type {
  GoalMilestone,
  GoalStatus,
} from './db/schema/goals.schema'
export type {
  Item,
  ItemInsert,
} from './db/schema/items.schema'
export type {
  ListInsert,
  ListInviteSelect,
  ListSelect,
} from './db/schema/lists.schema'
export type {
  Note,
  NoteContentType,
  NoteInsert,
  Priority,
  TaskMetadata,
  TaskStatus,
} from './db/schema/notes.schema'

export type {
  AllContentType,
  BaseContentType,
  ContentTag,
  PublishingContentType,
} from './db/schema/shared.schema'

export type { User, UserInsert } from './db/schema/users.schema'

import type { Queue } from 'bullmq'

/**
 * Common queue shape used across API, workers, and apps
 */
export type Queues = {
  plaidSync: Queue
  importTransactions: Queue
  placePhotoEnrich: Queue
}
