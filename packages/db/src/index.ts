// Re-export for backward compatibility and main DB interface
export {
  getDb,
  setTestDb,
  getDatabaseUrl,
  pool as client,
  takeOne,
  takeUniqueOrThrow,
} from './client';

/**
 * Validation Schemas (Zod validators)
 * 
 * ⚠️  IMPORTANT: These are VALUE exports, not TYPE exports
 * 
 * Prefer importing from '@hominem/db/schema/validations' instead:
 *   import { TransactionSchema } from '@hominem/db/schema/validations';
 * 
 * This export is provided here for backward compatibility and for services
 * that need direct access without importing from schema submodules.
 * However, the canonical location is schema/validations.ts.
 */
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
