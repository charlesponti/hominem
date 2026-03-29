/**
 * Database layer - Kysely + PostgreSQL
 *
 * Main database instance and utilities.
 *
 * Infrastructure exports only. Queries are defined in services/api routes:
 *   import { db } from '@hominem/db'
 *   db.selectFrom('tasks').selectAll().execute()
 *
 * NOT for use in client applications - use @hominem/rpc instead.
 */

export type { Selectable } from 'kysely';
export { db, healthCheck, pool, sql } from './db';
export type { DB as Database, Json, JsonArray, JsonObject, JsonValue } from './types/database';

// Shared service utilities (used by RPC handlers)
export { brandId, unbrandId } from './services/_shared/ids';
export type {
  BookmarkId,
  CalendarEventId,
  FinanceAccountId,
  FinanceCategoryId,
  FinanceTransactionId,
  PersonId,
  PossessionId,
  TagId,
  TaskId,
  UserId,
} from './services/_shared/ids';

export {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  ValidationError,
  getErrorResponse,
  isDbError,
  isServiceError,
} from './services/_shared/errors';
export type { DbError } from './services/_shared/errors';
