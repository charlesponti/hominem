// Re-export commonly used types - available from pre-computed types
export type { ContactOutput, ContactInput, ContactSelect } from '@hominem/db/types/contacts';

export type {
  Goal,
  GoalOutput,
  GoalInput,
  GoalSelect,
  GoalMilestone,
  GoalStatus,
} from '@hominem/db/types/goals';

export type { PlaceOutput, PlaceInput } from '@hominem/db/types/places';

export type { PossessionOutput, PossessionInput } from '@hominem/db/types/possessions';

export type { TagOutput } from '@hominem/db/types/tags';

export type { BookmarkOutput, BookmarkInput } from '@hominem/db/types/bookmarks';

export type {
  BudgetCategoryOutput,
  FinanceAccountOutput,
  FinanceTransactionOutput as Transaction,
  FinancialInstitutionOutput,
} from '@hominem/db/types/finance';

export type { NoteOutput, NoteContentType, NoteInput } from '@hominem/db/types/notes';

export type { TaskOutput, TaskInput, TaskStatus, TaskPriority } from '@hominem/db/types/tasks';

export type {
  ChatMessageOutput,
  ChatMessageInput,
  ChatMessageSelect,
  ChatMessageToolCall,
  ChatOutput,
  ChatInput,
  ChatSelect,
} from '@hominem/db/types/chats';

export type {
  UserOutput,
  UserInput,
  UserSelect,
  AccountOutput,
  AccountInput,
} from '@hominem/db/types/users';

export type {
  CategoryOutput as Category,
  CategoryInput as CategoryInsert,
} from '@hominem/db/types/categories';

export type {
  DocumentOutput as Document,
  DocumentInput as DocumentInsert,
} from '@hominem/db/types/documents';

export type {
  SkillOutput as Skill,
  SkillInput as SkillInsert,
  UserSkillOutput,
  UserSkillInput,
  JobSkillOutput,
  JobSkillInput,
} from '@hominem/db/types/skills';

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
