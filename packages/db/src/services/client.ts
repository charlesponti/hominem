/**
 * Database client and transaction interface
 * 
 * All services accept a database context (db or transaction)
 * 
 * Note: Client does not import schema - schema is only imported at package root
 * to keep per-service type graphs minimal. Services use db as `any` for query operations.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

/**
 * Unified database type handle - services work with both db and transactions
 * Uses PostgresJsDatabase with `any` schema to keep per-service type graphs minimal
 * while still providing full query/transaction capabilities
 * 
 * In production: `db = getDb()`
 * In tests: `db = await tx.transaction(...)`
 */
export type Database = PostgresJsDatabase<any>

let singleton: Database | null = null

/**
 * Get the shared database client instance
 * 
 * Schema is imported at the package root (index.ts) and used there,
 * not in service modules, to minimize per-service type graph size.
 */
export function getDb(): Database {
  if (!singleton) {
    const client = postgres(process.env.DATABASE_URL!)
    // NOTE: Schema is not specified here - it's provided/known at root level
    singleton = drizzle(client) as unknown as Database
  }
  return singleton
}

/**
 * For testing: create a new database connection
 */
export function createTestDb(): Database {
  const client = postgres(process.env.DATABASE_URL!)
  return drizzle(client) as unknown as Database
}
