/**
 * Database layer - Kysely + PostgreSQL
 *
 * Main database instance and utilities.
 *
 * Infrastructure exports only. Queries are defined in services/api routes:
 *   import { db } from '@hominem/db'
 *   db.selectFrom('tasks').selectAll().execute()
 *
 * NOT for use in client applications - use @hominem/hono-client instead.
 */

export { db, healthCheck, pool, sql } from './db'
export type { DB as Database } from './types/database'
export type { Selectable } from 'kysely'
export type { Json, JsonValue, JsonObject, JsonArray } from './types/database'

// Export all database table types for use in services
export type {
  Chat,
  ChatMessage,
  HealthRecords,
  Tasks,
  Tags,
  TaskLists,
  Persons,
  Places,
  Bookmarks,
  Possessions,
  FinanceAccounts,
  FinanceTransactions,
  CalendarEvents,
  Notes,
  Logs,
  Users,
  UserAccounts,
} from './types/database'

// Shared service utilities (used by RPC handlers)
export { brandId, unbrandId } from './services/_shared/ids'
export type { TaskId, TagId, CalendarEventId, PersonId, BookmarkId, PossessionId, FinanceCategoryId, FinanceAccountId, FinanceTransactionId, UserId } from './services/_shared/ids'

export { NotFoundError, ConflictError, ValidationError, ForbiddenError, InternalError, isDbError, isServiceError, getErrorResponse } from './services/_shared/errors'
export type { DbError } from './services/_shared/errors'
