// Re-export for backward compatibility and main DB interface
export {
  getDb,
  setTestDb,
  getDatabaseUrl,
  pool as client,
  takeOne,
  takeUniqueOrThrow,
} from './client';

// Re-export validation schemas
export {
  UserSchema,
  FinanceAccountSchema,
  FinanceAccountInsertSchema,
  TransactionSchema,
  TransactionInsertSchema,
} from './schema/validations';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from './schema/tables';

import { getDb } from './client';

/**
 * Main database instance
 *
 * Type is explicitly declared here rather than inferred to prevent
 * the expensive schema type computation from affecting every importer.
 */
export const db: PostgresJsDatabase<typeof schema> = getDb();
