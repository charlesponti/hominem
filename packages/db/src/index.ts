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

export { db, healthCheck, pool } from './db'
export type { Database } from './types/database'
