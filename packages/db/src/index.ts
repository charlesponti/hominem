import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type * as schema from './all-schema'

import { getDb } from './client'

let _db: PostgresJsDatabase<typeof schema> | null = null

function getDbInstance() {
  if (!_db) {
    _db = getDb() as PostgresJsDatabase<typeof schema>
  }
  return _db
}

/**
 * Main database instance
 *
 * Lazy initialization - only connects when actually used.
 *
 * Infrastructure exports only. Services are imported via subpaths:
 *   import { listTasks } from '@hominem/db/services/tasks.service'
 *   NOT: import { TaskService } from '@hominem/db'
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return getDbInstance()[prop as keyof PostgresJsDatabase<typeof schema>]
  },
})

// Infrastructure exports only
export { getDb, takeUniqueOrThrow } from './client'

// Re-export commonly used drizzle-orm functions and types
// This ensures all packages use the same drizzle-orm instance
export {
  and,
  or,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  ilike,
  inArray,
  isNull,
  isNotNull,
  asc,
  desc,
  sql,
  count,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm'

// Shared utilities (no service exports from root)
export * from './services/_shared/errors'
export * from './services/_shared/ids'
export * from './services/_shared/query'

/**
 * Note: Service modules are NOT re-exported from the root index.
 * Import services via subpaths instead:
 *   import { listTasks } from '@hominem/db/services/tasks.service'
 *   import { listTags } from '@hominem/db/services/tags.service'
 *   import { FinanceCategoryService } from '@hominem/db/services/finance/categories'
 */
